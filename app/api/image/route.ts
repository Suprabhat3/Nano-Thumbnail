// app/api/image/route.ts
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// --- MODIFIED SYSTEM PROMPT ---
// This prompt is now a direct, rule-based instruction set.
const NANO_THUMBNAIL_SYSTEM_PROMPT = `
You are a thumbnail generation engine. You will adhere to the following rules without exception.

## Rule 1: Output Dimensions are Absolute
- You will be given a primary blank image. This image's aspect ratio and dimensions are the ONLY valid output format.
- You will be given exact pixel dimensions (width and height) in the text prompt.
- Your final generated image MUST match these dimensions and aspect ratio precisely. There is no room for interpretation.

## Rule 2: Image Input Roles
- **Primary Image (Blank Canvas):** This is your template for size and shape. You must fill this canvas.
- **Secondary Image (User-Provided Content - if present):** This image is for CONTENT and STYLE reference ONLY. You will extract the subject, objects, and artistic style from this image, but you will completely IGNORE its original aspect ratio and dimensions.

## Rule 3: Generation Process
1.  Acknowledge the required output dimensions (e.g., "Okay, the target is 1024x576 pixels").
2.  Analyze the Primary Image to confirm the aspect ratio.
3.  If a Secondary Image is present, identify its key subjects and style.
4.  Synthesize the user's text prompt with the content and style from the Secondary Image.
5.  Render the final thumbnail onto the canvas defined by the Primary Image, ensuring the output dimensions are exact.

## Rule 4: Final Output
- Your only output is the generated image. Do not provide any text, confirmation, or explanation.
`;

// Schema remains the same.
const ImageGenerationSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(1000, "Prompt too long"),
  aspectRatio: z.enum(['16:9', '9:16', '4:3', '3:4', '1:1']),
  seed: z.number().int().min(0).max(2147483647).optional(),
  outputFormat: z.enum(['jpeg', 'png']).default('jpeg'),
  outputQuality: z.number().min(10).max(100).default(80),
  cacheEnabled: z.boolean().default(true),
  userImage: z.string().optional(), // base64 encoded image
});

// Configuration map remains the same.
const aspectRatioConfig = {
    '16:9': { width: 1024, height: 576, filename: '16-9.png' },
    '9:16': { width: 576, height: 1024, filename: '9-16.png' },
    '4:3': { width: 1024, height: 768, filename: '4-3.png' },
    '3:4': { width: 768, height: 1024, filename: '3-4.png' },
    '1:1': { width: 1024, height: 1024, filename: '1-1.png' },
};

interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
  metadata?: {
    prompt: string;
    width: number | null;
    height: number | null;
    seed?: number;
    generatedAt: string;
    gatewayMetadata?: {
      requestId: string;
      latency: number;
    };
  };
}

const handleApiResponse = (
  response: GenerateContentResponse,
  context: string = "generation"
): string => {
  if (response.promptFeedback?.blockReason) {
    const { blockReason, blockReasonMessage } = response.promptFeedback;
    const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
    console.error(errorMessage, { response });
    throw new Error(errorMessage);
  }

  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    return `data:${mimeType};base64,${data}`;
  }
  
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
    throw new Error(errorMessage);
  }
  
  const textFeedback = response.text?.trim();
  const errorMessage = `The AI model did not return an image. ` +
    (textFeedback
      ? `The model responded with text: "${textFeedback}"`
      : "This can happen due to safety filters. Please try rephrasing your prompt.");
  throw new Error(errorMessage);
};

const base64ToPart = (base64Data: string, mimeType: string = 'image/jpeg'): { inlineData: { mimeType: string; data: string; } } => {
    const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    let finalMimeType = mimeType;
    if (base64Data.startsWith('data:')) {
        const mimeMatch = base64Data.match(/data:([^;]+);/);
        if (mimeMatch && mimeMatch[1]) {
            finalMimeType = mimeMatch[1];
        }
    }
    return { inlineData: { mimeType: finalMimeType, data: base64String } };
};

const getLocalReferenceImagePart = (filename: string): { inlineData: { mimeType: string; data: string; } } | null => {
    try {
        const imagePath = path.join(process.cwd(), 'public', filename);
        if (!fs.existsSync(imagePath)) {
            console.warn(`Reference image not found at path: ${imagePath}`);
            return null;
        }
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Data = imageBuffer.toString('base64');
        return base64ToPart(base64Data, 'image/png');
    } catch (error) {
        console.error(`Failed to read reference image "${filename}":`, error);
        return null;
    }
}

export async function POST(request: NextRequest): Promise<NextResponse<ImageGenerationResponse>> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  let requestBody: any = {};

  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error("Google Generative AI API key not configured");
    }

    requestBody = await request.json();
    const validationResult = ImageGenerationSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: `Validation error: ${validationResult.error.issues.map(i => i.message).join(', ')}` }, { status: 400 });
    }

    const { prompt, seed, userImage, aspectRatio } = validationResult.data;
    
    const config = aspectRatioConfig[aspectRatio];
    const { width, height, filename } = config;

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    const modelParts: any[] = [];
    
    // Always add the aspect ratio reference image first.
    const aspectRatioReferenceImagePart = getLocalReferenceImagePart(filename);
    if (aspectRatioReferenceImagePart) {
        modelParts.push(aspectRatioReferenceImagePart);
    } else {
        return NextResponse.json({ success: false, error: `Server error: Aspect ratio reference image "${filename}" not found.` }, { status: 500 });
    }

    // Add user image if it exists.
    if (userImage) {
        modelParts.push(base64ToPart(userImage));
    }

    // A more direct and forceful prompt.
    const textPrompt = `Your task is to generate an image that is EXACTLY ${width} pixels wide and ${height} pixels tall. The first image provided is a blank canvas with the required aspect ratio. The second image (if provided) is for content and style reference only; IGNORE its dimensions. Based on the user prompt: "${prompt}".\n\n${NANO_THUMBNAIL_SYSTEM_PROMPT}`;
    modelParts.push({ text: textPrompt });

    console.log(`Sending ${modelParts.length} part(s) to the generative model for a ${width}x${height} image...`);
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: modelParts },
        ...(seed && { generationConfig: { seed } })
    });
    
    const imageUrl = handleApiResponse(response, 'image generation');
    const latency = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      imageUrl,
      metadata: {
        prompt: prompt,
        width: width,
        height: height,
        seed,
        generatedAt: new Date().toISOString(),
        gatewayMetadata: { requestId, latency }
      }
    });

  } catch (error) {
    console.error('Image generation error:', error);
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let status = 500;

    if (errorMessage.includes('quota') || errorMessage.includes('429')) status = 429;
    if (errorMessage.includes('safety') || errorMessage.includes('policy') || errorMessage.includes('blocked')) status = 400;
    if (errorMessage.includes('model') || errorMessage.includes('not found')) status = 503;

    return NextResponse.json({
      success: false,
      error: `Failed to generate image: ${errorMessage}`,
      metadata: {
        prompt: requestBody.prompt || '',
        width: requestBody.width || null,
        height: requestBody.height || null,
        generatedAt: new Date().toISOString(),
        gatewayMetadata: { requestId, latency }
      }
    }, { status });
  }
}

// GET method for health check (unchanged)
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    service: 'nano-image-generator',
    model: 'gemini-2.5-flash-image-preview',
    timestamp: new Date().toISOString(),
    supportedFormats: ['jpeg', 'png'],
    capabilities: [
      'text-to-image',
      'image-to-image',
      'seed-control',
      'dimension-control'
    ]
  });
}