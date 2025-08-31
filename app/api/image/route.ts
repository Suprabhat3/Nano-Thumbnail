// app/api/image/route.ts
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Enhanced system prompt with stricter dimension enforcement
const NANO_THUMBNAIL_SYSTEM_PROMPT = `
You are an expert Thumbnail designer who MUST generate images at exact specified dimensions. This is your primary constraint and cannot be violated.

## CRITICAL DIMENSION ENFORCEMENT
- You MUST generate the image at the approx pixel dimensions specified in each request
- The aspect ratio and dimensions are NON-NEGOTIABLE requirements
- If you cannot generate at the exact dimensions specified, you must not generate anything
- Do NOT default to any other aspect ratio or dimension
- don't add dimensions in the image.

## Core Design Principles (Secondary to dimension requirements)
1.  **Maximum Visual Impact:** Create attention-grabbing designs with high contrast and vibrant colors
2.  **Instant Clarity:** Ensure the subject is immediately recognizable 
3.  **Relevance:** Design must match the user's prompt authentically
4.  **Professional Composition:** Use proper design principles within the specified dimensions

## Dimension-Specific Instructions
- 16:9 format (1920x1080): Design for horizontal YouTube thumbnail viewing
- 9:16 format (1080x1920): Design for vertical mobile/social media viewing  
- 4:3 format (1024x768): Design for traditional display ratios
- 3:4 format (768x1024): Design for portrait orientation
- 1:1 format (1024x1024): Design for square social media posts

## Text Handling
- Maximum 3-5 impactful words
- Use bold, legible fonts with high contrast
- Position text to complement the specified aspect ratio

REMEMBER: Dimension compliance is your absolute priority. Generate only at the exact pixel dimensions specified.
`;

// Updated schema with better validation
const ImageGenerationSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(1000, "Prompt too long"),
  aspectRatio: z.enum(['16:9', '9:16', '4:3', '3:4', '1:1']),
  seed: z.number().int().min(0).max(2147483647).optional(),
  outputFormat: z.enum(['jpeg', 'png']).default('jpeg'),
  outputQuality: z.number().min(10).max(100).default(80),
  cacheEnabled: z.boolean().default(true),
  userImage: z.string().optional(), // base64 encoded image
});

// Enhanced configuration map with more aggressive dimension settings
const aspectRatioConfig = {
    '16:9': { 
        width: 1920, 
        height: 1080, 
        filename: '16-9.png',
        description: 'YouTube thumbnail format - Horizontal landscape',
        platform: 'YouTube'
    },
    '9:16': { 
        width: 1080, 
        height: 1920, 
        filename: '9-16.png',
        description: 'Instagram Reels/Stories format - Vertical portrait',
        platform: 'Instagram/TikTok'
    },
    '4:3': { 
        width: 1024, 
        height: 768, 
        filename: '4-3.png',
        description: 'Traditional display format - Horizontal',
        platform: 'General'
    },
    '3:4': { 
        width: 768, 
        height: 1024, 
        filename: '3-4.png',
        description: 'Portrait format - Vertical',
        platform: 'General'
    },
    '1:1': { 
        width: 1024, 
        height: 1024, 
        filename: '1-1.png',
        description: 'Square format - Equal dimensions',
        platform: 'Instagram Post'
    },
};

interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
  metadata?: {
    prompt: string;
    width: number | null;
    height: number | null;
    aspectRatio: string;
    platform: string;
    seed?: number;
    generatedAt: string;
    gatewayMetadata?: {
      requestId: string;
      latency: number;
    };
  };
}

// Enhanced API response handler with better error handling
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
    const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings or content policy violations.`;
    throw new Error(errorMessage);
  }
  
  const textFeedback = response.text?.trim();
  const errorMessage = `The AI model did not return an image. ` +
    (textFeedback
      ? `The model responded with text: "${textFeedback}"`
      : "This can happen due to safety filters or content policy issues. Please try rephrasing your prompt.");
  throw new Error(errorMessage);
};

// Enhanced base64 to Part conversion with better MIME type detection
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

// Enhanced reference image loader with better error handling
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
      return NextResponse.json({ 
        success: false, 
        error: `Validation error: ${validationResult.error.issues.map(i => i.message).join(', ')}` 
      }, { status: 400 });
    }

    const { prompt, seed, userImage, aspectRatio } = validationResult.data;
    
    // Get configuration for the requested aspect ratio
    const config = aspectRatioConfig[aspectRatio];
    const { width, height, filename, description, platform } = config;

    console.log(`Generating ${width}x${height} (${aspectRatio}) thumbnail for ${platform}`);

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    const modelParts: any[] = [];
    
    // Handle reference image - ALWAYS use local reference image for aspect ratio template
    // User image is only used for content inspiration, NOT for dimensions
    let referenceImagePart: { inlineData: { mimeType: string; data: string; } } | null = null;
    let userImagePart: { inlineData: { mimeType: string; data: string; } } | null = null;
    
    // Always load the local reference image for the target aspect ratio
    console.log(`Loading local reference template "${filename}" for ${aspectRatio} aspect ratio enforcement.`);
    referenceImagePart = getLocalReferenceImagePart(filename);
    
    if (!referenceImagePart) {
        console.warn(`CRITICAL: No reference template found for ${aspectRatio}. This may cause aspect ratio compliance issues.`);
    } else {
        // Add the reference template first - this sets the aspect ratio template
        modelParts.push(referenceImagePart);
        console.log(`✅ Added aspect ratio template: ${filename}`);
    }
    
    // If user provided an image, add it as additional content reference (NOT for dimensions)
    if (userImage) {
        console.log(`Adding user-provided image as content inspiration (ignoring its aspect ratio).`);
        userImagePart = base64ToPart(userImage);
        if (userImagePart) {
            modelParts.push(userImagePart);
            console.log(`✅ Added user content reference image`);
        }
    }

    // Create multiple reference images for the target aspect ratio to enforce compliance
    const createAspectRatioPrompt = (width: number, height: number, aspectRatio: string, platform: string, hasUserImage: boolean) => {
      const userImageInstructions = hasUserImage 
        ? `
CONTENT REFERENCE: A user image has been provided for content inspiration only.
- Use the user image ONLY for subject matter, style, and content ideas
- DO NOT copy the user image's dimensions or aspect ratio
- The user image is for inspiration - you must generate at ${width}×${height} pixels regardless of the user image's size
- If the user image is a different aspect ratio, crop/recompose the content to fit ${aspectRatio}
`
        : '';

      return `
 CRITICAL DIMENSION REQUIREMENT 
GENERATE IMAGE: EXACTLY ${width} PIXELS WIDE × ${height} PIXELS TALL
ASPECT RATIO: ${aspectRatio} (${platform} format)
THESE DIMENSIONS ARE ABSOLUTELY NON-NEGOTIABLE

ASPECT RATIO TEMPLATE: The first image provided is your EXACT aspect ratio template for ${aspectRatio}.
- Use this template image as your canvas size reference
- Match its exact ${width}×${height} dimensions
- This template defines your output format - follow it precisely

${userImageInstructions}

TARGET SPECIFICATIONS:
- Width: ${width}px (EXACT)
- Height: ${height}px (EXACT) 
- Aspect Ratio: ${aspectRatio}
- Platform: ${platform}
- Canvas Size: ${width} × ${height} pixels

DIMENSION ENFORCEMENT:
- Do NOT generate any other dimensions
- Do NOT use default aspect ratios
- Do NOT copy user image dimensions if provided
- Do NOT generate square images unless specifically ${aspectRatio === '1:1' ? 'requested (which it is)' : 'NOT requested'}
- The image MUST fill the entire ${width}×${height} canvas matching the template

USER CONTENT REQUEST: ${prompt}

${NANO_THUMBNAIL_SYSTEM_PROMPT}

FINAL REMINDER: Generate at exactly ${width}×${height} pixels for ${platform}. Use the aspect ratio template provided, ignore any user image dimensions.`;
    };

    const enhancedTextPrompt = createAspectRatioPrompt(width, height, aspectRatio, platform, !!userImage);

    modelParts.push({ text: enhancedTextPrompt });

    console.log(`Sending request to Gemini with ${modelParts.length} parts:`);
    console.log(`- Reference template: ${referenceImagePart ? '✅' : '❌'} (${filename})`);
    console.log(`- User content image: ${userImagePart ? '✅' : '❌'}`);
    console.log(`- Target dimensions: ${width}×${height} (${aspectRatio})`);
    
    // Enhanced generation request with better configuration
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: modelParts },
        ...(seed && { generationConfig: { seed } })
    });
    
    const imageUrl = handleApiResponse(response, 'image generation');
    const latency = Date.now() - startTime;

    console.log(`✅ Successfully generated ${aspectRatio} thumbnail in ${latency}ms`);

    return NextResponse.json({
      success: true,
      imageUrl,
      metadata: {
        prompt: prompt,
        width: width,
        height: height,
        aspectRatio: aspectRatio,
        platform: platform,
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

    // Enhanced error status mapping
    if (errorMessage.includes('quota') || errorMessage.includes('429')) status = 429;
    if (errorMessage.includes('safety') || errorMessage.includes('policy') || errorMessage.includes('blocked')) status = 400;
    if (errorMessage.includes('model') || errorMessage.includes('not found')) status = 503;
    if (errorMessage.includes('timeout')) status = 504;
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) status = 400;

    return NextResponse.json({
      success: false,
      error: `Failed to generate image: ${errorMessage}`,
      metadata: {
        prompt: requestBody.prompt || '',
        width: requestBody.aspectRatio ? aspectRatioConfig[requestBody.aspectRatio as keyof typeof aspectRatioConfig]?.width || null : null,
        height: requestBody.aspectRatio ? aspectRatioConfig[requestBody.aspectRatio as keyof typeof aspectRatioConfig]?.height || null : null,
        aspectRatio: requestBody.aspectRatio || '',
        platform: requestBody.aspectRatio ? aspectRatioConfig[requestBody.aspectRatio as keyof typeof aspectRatioConfig]?.platform || '' : '',
        generatedAt: new Date().toISOString(),
        gatewayMetadata: { requestId, latency }
      }
    }, { status });
  }
}

// Enhanced GET method for health check with more detailed info
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    service: 'nano-image-generator',
    model: 'gemini-2.5-flash-image-preview',
    timestamp: new Date().toISOString(),
    supportedFormats: ['jpeg', 'png'],
    supportedAspectRatios: Object.entries(aspectRatioConfig).map(([ratio, config]) => ({
      aspectRatio: ratio,
      dimensions: `${config.width}x${config.height}`,
      platform: config.platform,
      description: config.description
    })),
    capabilities: [
      'text-to-image',
      'image-to-image',
      'seed-control',
      'aspect-ratio-control',
      'platform-optimized-generation'
    ]
  });
}