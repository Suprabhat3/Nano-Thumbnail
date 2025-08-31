// hooks/useImageGeneration.ts
import { useState, useCallback } from 'react';

export interface ImageGenerationParams {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  style?: 'photographic' | 'digital-art' | 'comic-book' | 'fantasy-art' | 'analog-film' | 'neon-punk' | 'isometric' | 'low-poly' | 'origami' | 'line-art' | 'craft-clay' | 'cinematic' | 'enhance';
  seed?: number;
  outputFormat?: 'jpeg' | 'png';
  outputQuality?: number;
  // Gateway-specific options
  cacheEnabled?: boolean;
  userId?: string;
}

export interface GeneratedImage {
  imageUrl: string;
  metadata: {
    prompt: string;
    aspectRatio: string;
    style?: string;
    seed?: number;
    generatedAt: string;
    cached?: boolean;
    gatewayMetadata?: {
      requestId: string;
      latency: number;
      tokensUsed?: number;
    };
  };
}

export interface UseImageGenerationReturn {
  generateImage: (params: ImageGenerationParams) => Promise<void>;
  loading: boolean;
  error: string | null;
  generatedImage: GeneratedImage | null;
  clearError: () => void;
  clearImage: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);

  const generateImage = useCallback(async (params: ImageGenerationParams) => {
    setLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImage({
        imageUrl: data.imageUrl,
        metadata: data.metadata,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearImage = useCallback(() => {
    setGeneratedImage(null);
  }, []);

  return {
    generateImage,
    loading,
    error,
    generatedImage,
    clearError,
    clearImage,
  };
}