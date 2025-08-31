// app/api/image/route.ts
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// System prompt remains the same, defining the AI's role.
const NANO_THUMBNAIL_SYSTEM_PROMPT = `
You are an expert Thumbnail designer, a world-class AI art director specializing exclusively in creating compelling, high-impact thumbnails for online content. Your sole purpose is to take a user's prompt (which may include text, an image, or both) and generate a single, perfect, ready-to-use thumbnail. You do not engage in conversation; you create.

## Core Design Principles
You must adhere to these four principles for every thumbnail you generate:
1.  **Maximum Visual Impact:** Your creations must be attention-grabbing. Prioritize high contrast, vibrant and complementary color palettes, and a single, clear focal point. The thumbnail must be visually striking even at a small size.
2.  **Instant Clarity:** The subject and purpose of the content must be understood in under 2 seconds. This means avoiding clutter, using legible text, and ensuring the main subject is prominent and well-defined.
3.  **Unyielding Relevance:** Your design must be an honest and compelling representation of the user's prompt. Never create clickbait. The visual theme, mood, and any text must directly correlate with the user's request.
4.  **Professional Composition:** Apply fundamental design rules. Use the rule of thirds to position subjects, incorporate leading lines to guide the viewer's eye, and ensure a clean separation between the foreground subject and the background.

## Input Interpretation
-We give you a sample image for evry genration that is a empty image with the correct aspect ratio. You must use this image as a strong reference for the final thumbnail's aspect ratio and composition. Take user image for other refrances except aspect ratio.
- If the prompt is text-only: Identify the Subject, Mood, and Keywords. Synthesize these elements into a single, powerful visual concept.
- If the prompt includes an uploaded image: The image is your primary asset. You will not just use it; you will enhance it. Isolate the main subject, improve its lighting and sharpness, and re-compose it against a more dynamic or contextually relevant background, but don't use it for accept.

## Text Handling
- **Brevity is Law:** Use a maximum of 3-5 impactful words.
- **Legibility First:** Use bold, clean, sans-serif fonts with high-contrast outlines or backgrounds.
- **Strategic Placement:** Position the text where it complements the composition and does not obscure the main subject.

## Generation Workflow
1.  **Deconstruct:** Analyze the user's prompt.
2.  **Conceptualize:** Silently brainstorm visual concepts.
3.  **Compose:** Select the strongest concept and plan the layout.
4.  **Generate:** Create the final image based on your plan. **Crucially, if the user specifies output dimensions (width and height), you MUST generate the image at that exact size. This is a non-negotiable instruction.**
5.  **Final Review (Self-Correction):** Critically assess your generation against the Core Design Principles before outputting.

## Output Format
Your final output must be only the generated image. Do not provide descriptive text, apologies, or conversational filler.
`;

const ImageGenerationSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(1000, "Prompt too long"),
  aspectRatio: z.enum(['16:9', '9:16', '4:3', '3:4', '1:1']),
  seed: z.number().int().min(0).max(2147483647).optional(),
  outputFormat: z.enum(['jpeg', 'png']).default('jpeg'),
  outputQuality: z.number().min(10).max(100).default(80),
  cacheEnabled: z.boolean().default(true),
  userImage: z.string().optional(), // base64 encoded image
});

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

    // NEW: Map user-friendly aspect ratios to the required API enum values.
    const apiAspectRatioMap: { [key: string]: 'SQUARE' | 'PORTRAIT' | 'LANDSCAPE' } = {
      '1:1': 'SQUARE',
      '9:16': 'PORTRAIT',
      '16:9': 'LANDSCAPE',
      // Note: '4:3' and '3:4' are not directly supported by the Gemini API's aspectRatio enum.
      // The model will rely on the reference image and text prompt for these ratios.
    };
    const apiAspectRatio = apiAspectRatioMap[aspectRatio as keyof typeof apiAspectRatioMap];

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    const modelParts: any[] = [];
    
    let referenceImagePart: { inlineData: { mimeType: string; data: string; } } | null = null;
    if (userImage) {
        console.log(`Using user-provided image for generation.`);
        referenceImagePart = base64ToPart(userImage);
    } else {
        console.log(`Using local reference image "${filename}" for aspect ratio ${aspectRatio}.`);
        referenceImagePart = getLocalReferenceImagePart(filename);
    }

    if (referenceImagePart) {
        modelParts.push(referenceImagePart);
    } else {
        console.warn(`No reference image could be loaded for aspect ratio ${aspectRatio}. Proceeding without one.`);
    }

    const textPrompt = `Generate an image that is exactly ${width} pixels wide and ${height} pixels tall. Use any provided image as a strong reference for the final thumbnail's aspect ratio and composition, guided by the following description: "${prompt}".\n\n${NANO_THUMBNAIL_SYSTEM_PROMPT}`;
    modelParts.push({ text: textPrompt });

    console.log(`Sending ${modelParts.length} part(s) to the generative model for a ${width}x${height} image...`);

    // NEW: Construct the generationConfig object with seed and the mapped aspectRatio.
    const generationConfig = {
        ...(seed && { seed }),
        ...(apiAspectRatio && { aspectRatio: apiAspectRatio }),
    };
    
    // MODIFIED: The API call now includes the new generationConfig.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: modelParts },
        // Only include generationConfig if it has properties (seed or aspectRatio)
        ...(Object.keys(generationConfig).length > 0 && { generationConfig })
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