// app/api/image/route.ts
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// The system prompt is great, no changes needed here.
const NANO_THUMBNAIL_SYSTEM_PROMPT = `
You are a expert Thumbnail designer, a world-class AI art director specializing exclusively in creating compelling, high-impact thumbnails for online content. Your sole purpose is to take a user's prompt (which may include text, an image, or both) and generate a single, perfect, ready-to-use thumbnail in a 16:9 aspect ratio. You do not engage in conversation; you create.

## Core Design Principles
You must adhere to these four principles for every thumbnail you generate:
1.  **Maximum Visual Impact:** Your creations must be attention-grabbing. Prioritize high contrast, vibrant and complementary color palettes, and a single, clear focal point. The thumbnail must be visually striking even at a small size.
2.  **Instant Clarity:** The subject and purpose of the content must be understood in under 2 seconds. This means avoiding clutter, using legible text, and ensuring the main subject is prominent and well-defined.
3.  **Unyielding Relevance:** Your design must be an honest and compelling representation of the user's prompt. Never create clickbait. The visual theme, mood, and any text must directly correlate with the user's request.
4.  **Professional Composition:** Apply fundamental design rules. Use the rule of thirds to position subjects, incorporate leading lines to guide the viewer's eye, and ensure a clean separation between the foreground subject and the background.

## Input Interpretation
- **If the prompt is text-only:** Identify the Subject, Mood, and Keywords. Synthesize these elements into a single, powerful visual concept.
- **If the prompt includes an uploaded image:** The image is your primary asset. You will not just use it; you will enhance it. Isolate the main subject, improve its lighting and sharpness, and re-compose it against a more dynamic or contextually relevant background.

## Text Handling
- **Brevity is Law:** Use a maximum of 3-5 impactful words.
- **Legibility First:** Use bold, clean, sans-serif fonts with high-contrast outlines or backgrounds.
- **Strategic Placement:** Position the text where it complements the composition and does not obscure the main subject.

## Generation Workflow
1.  **Deconstruct:** Analyze the user's prompt.
2.  **Conceptualize:** Silently brainstorm visual concepts.
3.  **Compose:** Select the strongest concept and plan the layout.
4.  **Generate:** Create the 16:9 thumbnail image based on your plan.
5.  **Final Review (Self-Correction):** Critically assess your generation against the Core Design Principles before outputting.

## Output Format
Your final output must be only the generated image. Do not provide descriptive text, apologies, or conversational filler.
`;

// MODIFIED: Re-enabled the aspectRatio field to accept user input.
const ImageGenerationSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(1000, "Prompt too long"),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).default('16:9').optional(),
  seed: z.number().int().min(0).max(2147483647).optional(),
  // outputFormat, outputQuality, cacheEnabled are not used in the current logic, but are fine to keep.
  outputFormat: z.enum(['jpeg', 'png']).default('jpeg'),
  outputQuality: z.number().min(10).max(100).default(80),
  cacheEnabled: z.boolean().default(true),
  userImage: z.string().optional(), // base64 encoded image
});

interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
  metadata?: {
    prompt: string;
    aspectRatio: string;
    seed?: number;
    generatedAt: string;
    gatewayMetadata?: {
      requestId: string;
      latency: number;
    };
  };
}

// REMOVED: This helper is no longer needed as dimensions are controlled by the prompt.
// function getThumbnailDimensions(): { width: number; height: number } { ... }

// Helper function to handle API response (unchanged)
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

// Helper function to convert base64 string to Gemini API Part (unchanged)
const base64ToPart = (base64Data: string): { inlineData: { mimeType: string; data: string; } } => {
  const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  let mimeType = 'image/jpeg';
  if (base64Data.startsWith('data:')) {
    const mimeMatch = base64Data.match(/data:([^;]+);/);
    if (mimeMatch && mimeMatch[1]) {
      mimeType = mimeMatch[1];
    }
  }
  return { inlineData: { mimeType, data: base64String } };
};

export async function POST(request: NextRequest): Promise<NextResponse<ImageGenerationResponse>> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error("Google Generative AI API key not configured");
    }

    const body = await request.json();
    const validationResult = ImageGenerationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: `Validation error: ${validationResult.error.issues.map(i => i.message).join(', ')}` }, { status: 400 });
    }

    // MODIFIED: Get aspectRatio from the validated request data.
    const { prompt, seed, userImage, aspectRatio } = validationResult.data;

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    let response: GenerateContentResponse;
    let finalPrompt: string;

    if (userImage) {
      console.log(`Performing image-to-image generation with aspect ratio: ${aspectRatio}...`);
      const originalImagePart = base64ToPart(userImage);
      // ADDED: Instruction for the desired aspect ratio to the prompt.
      finalPrompt = `${NANO_THUMBNAIL_SYSTEM_PROMPT}\n\n---\n## User Request\n- **Aspect Ratio:** Generate the final image with a strict ${aspectRatio} aspect ratio.\n- **Task:** Use the provided image and use it as the primary asset for the thumbnail.\n- **Description:** "${prompt}"\n---`;
      const textPart = { text: finalPrompt };

      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        ...(seed && { generationConfig: { seed } })
      });
    } else {
      console.log(`Performing text-to-image generation with aspect ratio: ${aspectRatio}...`);
      // ADDED: Instruction for the desired aspect ratio to the prompt.
      finalPrompt = `${NANO_THUMBNAIL_SYSTEM_PROMPT}\n\n---\n## User Request\n- **Aspect Ratio:** Generate the final image with a strict ${aspectRatio} aspect ratio.\n- **Task:** Generate a thumbnail from scratch based on the following description.\n- **Description:** "${prompt}"\n---`;
      const textPart = { text: finalPrompt };

      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [textPart] },
        ...(seed && { generationConfig: { seed } })
      });
    }
    
    const imageUrl = handleApiResponse(response, 'image generation');
    const latency = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      imageUrl,
      metadata: {
        prompt: prompt,
        // MODIFIED: Return the actual aspect ratio used.
        aspectRatio: aspectRatio || '16:9',
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
        prompt: '',
        aspectRatio: 'N/A', // MODIFIED
        generatedAt: new Date().toISOString(),
        gatewayMetadata: { requestId, latency }
      }
    }, { status });
  }
}

// GET method for health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    service: 'nano-image-generator', // MODIFIED
    model: 'gemini-2.5-flash-image-preview',
    timestamp: new Date().toISOString(),
    supportedFormats: ['jpeg', 'png'],
    // MODIFIED: Updated to reflect all supported aspect ratios.
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    capabilities: [
      'text-to-image', // MODIFIED
      'image-to-image', // MODIFIED
      'seed-control',
      'aspect-ratio-control' // ADDED
    ]
  });
}