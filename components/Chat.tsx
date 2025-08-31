"use client";
import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Copy,
  Download,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Bot,
  User,
  Check,
  X,
  Plus,
  Image as ImageIcon,
  Settings,
  Palette,
  Loader,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Menu,
  Maximize2,
  Minimize2
} from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Template interfaces from template manager
interface TemplateOptions {
  style: string;
  aspectRatio: string;
  quality: string;
  colorScheme: string;
  lighting: string;
  composition: string;
  effects: string[];
  customPrompt: string;
}

interface SavedTemplate {
  id: string;
  name: string;
  options: TemplateOptions;
  createdAt: string;
}

interface FirestoreTemplate {
  name: string;
  options: TemplateOptions;
  createdAt: Timestamp;
}

// Message type
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  userImages?: File[];
  timestamp: Date;
  isImageGeneration?: boolean;
  templateUsed?: string;
  imageMetadata?: {
    prompt: string;
    aspectRatio: string;
    style?: string;
    seed?: number;
    gatewayMetadata?: {
      requestId: string;
      latency: number;
      tokensUsed?: number;
    };
  };
  error?: string;
}

// Image generation parameters
interface ImageGenerationParams {
  prompt: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  seed?: number;
  outputFormat: 'jpeg' | 'png';
  outputQuality: number;
  cacheEnabled: boolean;
  style?: string;
  colorScheme?: string;
  lighting?: string;
  composition?: string;
  effects?: string[];
}

// Enhanced Markdown renderer (unchanged)
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-2 py-1 rounded text-sm font-mono text-pink-300">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-900 p-4 rounded-lg overflow-x-auto my-3 border border-gray-700"><code class="text-sm font-mono text-gray-300">$1</code></pre>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="prose prose-invert max-w-none">
      <p className="mb-3" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
    </div>
  );
};

// Enhanced Copy button (unchanged)
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-gray-400 hover:text-pink-400 transition-colors rounded-md hover:bg-gray-700/50"
      title="Copy message"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
};


// MODIFIED: ImageWithDownload component for adaptive display
const ImageWithDownload: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `ai-generated-image-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="relative group w-full max-w-md mx-auto bg-gray-900/50 rounded-lg overflow-hidden flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80 aspect-square max-h-[512px]">
          <Loader className="animate-spin text-pink-400" size={24} />
        </div>
      )}
      {error && !isLoading && (
        <div className="p-6 text-center text-gray-400 aspect-square max-h-[512px] flex flex-col items-center justify-center">
          <AlertCircle size={32} className="mx-auto mb-2 text-red-400" />
          <p className="text-sm">Failed to load image</p>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-contain max-h-[70vh] md:max-h-[512px] transition-opacity duration-300 ${isLoading || error ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
      />
      {!isLoading && !error && (
        <button
          onClick={handleDownload}
          className="absolute top-2 right-2 p-2 bg-black/70 backdrop-blur-sm text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/90"
          title="Download image"
        >
          <Download size={14} />
        </button>
      )}
    </div>
  );
};


// Enhanced Feedback buttons (unchanged)
const FeedbackButtons: React.FC<{
  messageId: string;
  onFeedback: (messageId: string, type: 'positive' | 'negative') => void;
}> = ({ messageId, onFeedback }) => {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    onFeedback(messageId, type);
  };

  return (
    <div className="flex gap-1">
      <button
        onClick={() => handleFeedback('positive')}
        className={`p-1.5 rounded-md transition-all duration-200 ${
          feedback === 'positive'
            ? 'text-green-400 bg-green-400/20'
            : 'text-gray-400 hover:text-green-400 hover:bg-green-400/10'
        }`}
        title="Good response"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={() => handleFeedback('negative')}
        className={`p-1.5 rounded-md transition-all duration-200 ${
          feedback === 'negative'
            ? 'text-red-400 bg-red-400/20'
            : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
        }`}
        title="Poor response"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
};

// Template selection modal (unchanged)
const TemplateSelectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: SavedTemplate) => void;
  templates: SavedTemplate[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}> = ({ isOpen, onClose, onSelectTemplate, templates, loading, error, onRetry }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Menu size={20} className="text-pink-400" />
              Select Template
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <Loader className="animate-spin text-pink-400 mx-auto mb-4" size={48} />
              <p className="text-gray-400">Loading templates...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={onRetry}
                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Menu size={48} className="mx-auto mb-4 opacity-50" />
              <p>No templates available</p>
              <p className="text-sm mt-2">Create templates first to use them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-700 rounded-lg p-4 hover:border-pink-500 transition-colors cursor-pointer"
                  onClick={() => {
                    onSelectTemplate(template);
                    onClose();
                  }}
                >
                  <h3 className="font-semibold text-white mb-2">{template.name}</h3>
                  <div className="text-sm space-y-1 text-gray-300">
                    <div className="flex justify-between">
                      <span>Style:</span>
                      <span className="capitalize">{template.options.style}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ratio:</span>
                      <span>{template.options.aspectRatio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quality:</span>
                      <span className="capitalize">{template.options.quality}</span>
                    </div>
                  </div>
                  {template.options.effects.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.options.effects.slice(0, 3).map(effect => (
                        <span
                          key={effect}
                          className="px-2 py-1 bg-pink-600/20 text-pink-300 text-xs rounded"
                        >
                          {effect}
                        </span>
                      ))}
                      {template.options.effects.length > 3 && (
                        <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded">
                          +{template.options.effects.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
                    Created: {new Date(template.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Nano Thumbnail with advanced image generation capabilities. I can help you with:\n\n**💬 Text Conversations** - Ask me anything!\n**🎨 Image Generation** - Use `/generate [description]` or click the template button\n**📸 Image Analysis** - Upload images for detailed analysis\n**🎯 Templates** - Use pre-made templates for consistent results\n\nTry: `/generate a youtube video thumbnail (give the same accept ratio image for best result)`',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<SavedTemplate | null>(null);
  const [imageGenOptions, setImageGenOptions] = useState<ImageGenerationParams>({
    prompt: '',
    aspectRatio: '1:1',
    outputFormat: 'jpeg',
    outputQuality: 80,
    cacheEnabled: true,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const selectedTemplate = localStorage.getItem('selectedTemplate');
    if (selectedTemplate) {
      try {
        const template: SavedTemplate = JSON.parse(selectedTemplate);
        setCurrentTemplate(template);

        setImageGenOptions(prev => ({
          ...prev,
          aspectRatio: template.options.aspectRatio as any,
          style: template.options.style,
          colorScheme: template.options.colorScheme,
          lighting: template.options.lighting,
          composition: template.options.composition,
          effects: template.options.effects,
          outputQuality: template.options.quality === 'high' ? 90 : template.options.quality === 'ultra' ? 95 : 80
        }));

        const welcomeMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎯 **Template "${template.name}" Applied Successfully!**\n\nYour image generation settings have been configured with:\n- **Style**: ${template.options.style}\n- **Aspect Ratio**: ${template.options.aspectRatio}\n- **Quality**: ${template.options.quality}\n- **Color Scheme**: ${template.options.colorScheme}\n- **Lighting**: ${template.options.lighting}\n- **Composition**: ${template.options.composition}${template.options.effects.length > 0 ? `\n- **Effects**: ${template.options.effects.join(', ')}` : ''}\n\nNow you can generate images using this template! Try:\n\`/generate [your description]\``,
          templateUsed: template.name,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, welcomeMessage]);
        localStorage.removeItem('selectedTemplate');
      } catch (error) {
        console.error('Failed to load template:', error);
      }
    }

    loadSavedTemplates();
  }, []);

  const loadSavedTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const q = query(collection(db, 'templates'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const templates: SavedTemplate[] = querySnapshot.docs.map(doc => {
        const data = doc.data() as FirestoreTemplate;
        return {
          id: doc.id,
          name: data.name,
          options: data.options,
          createdAt: data.createdAt.toDate().toISOString()
        };
      });
      setSavedTemplates(templates);
    } catch (error) {
      console.error('Failed to load templates from Firebase:', error);
      setTemplatesError('Failed to load templates');
      try {
        const localTemplates = JSON.parse(localStorage.getItem('templates') || '[]') as SavedTemplate[];
        setSavedTemplates(localTemplates);
      } catch (localError) {
        console.error('Failed to load from localStorage too:', localError);
      }
    } finally {
      setTemplatesLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const generateImage = async (params: ImageGenerationParams, userImages?: File[], templateName?: string): Promise<Message> => {
    try {
      let userImageBase64: string | undefined;
      if (userImages && userImages.length > 0) {
        userImageBase64 = await fileToBase64(userImages[0]);
      }

      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          ...(params.seed && { seed: params.seed }),
          ...(userImageBase64 && { userImage: userImageBase64 })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to generate image');

      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✨ **Image Generated Successfully**${templateName ? ` using "${templateName}" template` : ''}\n\nPrompt: "${params.prompt}"\n${userImages && userImages.length > 0 ? `\nUsed reference image: ${userImages[0].name}` : ''}\n\nYour custom image has been created with the specified settings. You can download it using the download button in the top-right corner of the image.`,
        images: [data.imageUrl],
        isImageGeneration: true,
        templateUsed: templateName,
        imageMetadata: {
          prompt: data.metadata?.prompt || params.prompt,
          aspectRatio: data.metadata?.aspectRatio || params.aspectRatio,
          seed: data.metadata?.seed || params.seed,
          gatewayMetadata: data.metadata?.gatewayMetadata,
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Image generation error:', error);
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ **Image Generation Failed**\n\nI couldn't generate the image due to an error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n**Troubleshooting Tips:**\n- Check your internet connection\n- Try a simpler prompt\n- Ensure the API endpoint is working\n- Contact support if the issue persists`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  };

  const mockChatApiCall = async (userMessage: string): Promise<Message> => {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
    const responses = [
      `I understand you're asking about: **"${userMessage}"**\n\nI'm here to help! While I can provide information and assistance, my real strength is in **image generation**. Try using:\n\n\`/generate [your description]\`\n\nFor example: \`/generate a youtube video thumbnail\``,
      `Thanks for your message: **"${userMessage}"**\n\nHere are some things I can help you with:\n\n🎨 **Create Images** - Use \`/generate\` followed by your description\n📊 **Answer Questions** - Ask me about any topic\n🔍 **Analyze Images** - Upload photos for detailed analysis\n🎯 **Use Templates** - Click the template button for pre-made settings\n\n*What would you like to explore today?*`,
    ];
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: responses[Math.floor(Math.random() * responses.length)],
      timestamp: new Date()
    };
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if ((!input.trim() && uploadedImages.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim() || `Analyzed ${uploadedImages.length} image(s)`,
      userImages: uploadedImages.length > 0 ? [...uploadedImages] : undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setUploadedImages([]);
    setIsLoading(true);
    setIsMobileMenuOpen(false);

    try {
      let assistantMessage: Message;
      const isImageGenCommand = currentInput.toLowerCase().startsWith('/generate') || currentInput.toLowerCase().includes('generate image');

      if (isImageGenCommand) {
        const prompt = currentInput.replace(/^\/generate\s*/i, '').trim() || 'A beautiful landscape';
        assistantMessage = await generateImage({ ...imageGenOptions, prompt }, uploadedImages.length > 0 ? uploadedImages : undefined, currentTemplate?.name);
      } else {
        const messageContent = currentInput || "Analyzing uploaded images...";
        assistantMessage = await mockChatApiCall(messageContent);
      }
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ **Error**: Sorry, I encountered an unexpected error. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files).filter(file => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
      setUploadedImages(prev => [...prev, ...newImages]);
    }
    event.target.value = '';
  };
  
  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleRetry = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;
    
    setIsLoading(true);
    try {
      let newAssistantMessage: Message;
      if (userMessage.content.toLowerCase().startsWith('/generate')) {
        const prompt = userMessage.content.replace(/^\/generate\s*/i, '').trim() || 'A beautiful landscape';
        newAssistantMessage = await generateImage({ ...imageGenOptions, prompt }, userMessage.userImages, currentTemplate?.name);
      } else {
        newAssistantMessage = await mockChatApiCall(userMessage.content);
      }
      setMessages(prev => prev.map(m => m.id === messageId ? { ...newAssistantMessage, id: messageId } : m));
    } catch (error) {
      console.error('Retry error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (messageId: string, type: 'positive' | 'negative') => {
    console.log(`Feedback for message ${messageId}: ${type}`);
  };

  const handleTemplateSelect = (template: SavedTemplate) => {
    setCurrentTemplate(template);
    setImageGenOptions(prev => ({
      ...prev,
      aspectRatio: template.options.aspectRatio as any,
      style: template.options.style,
      colorScheme: template.options.colorScheme,
      lighting: template.options.lighting,
      composition: template.options.composition,
      effects: template.options.effects,
      outputQuality: template.options.quality === 'high' ? 90 : template.options.quality === 'ultra' ? 95 : 80
    }));
  };
  
  return (
    <div className="min-h-screen w-full relative bg-black font-sans">
      <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255, 80, 120, 0.15), transparent 70%), linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,1) 100%), #000000" }} />
      <div className="relative z-10 flex flex-col h-screen">
        <div className="flex-shrink-0 p-4 md:p-6 border-b border-gray-800/50 backdrop-blur-sm bg-gray-900/20">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl">
                <Bot className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  Nano Thumbnail
                  <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-pink-500/20 rounded-full">
                    <Sparkles size={12} className="text-pink-400" />
                    <span className="text-xs font-normal text-pink-300">Image Generation</span>
                  </div>
                </h1>
                {currentTemplate && (
                  <div className="flex items-center gap-2 mt-1">
                    <Menu size={14} className="text-pink-400" />
                    <span className="text-xs text-pink-300">Using: {currentTemplate.name}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:block text-sm text-gray-400">{messages.length - 1} messages</div>
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-gray-400 hover:text-white transition-colors">
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/50 p-4">
            <div className="space-y-3">
              <button onClick={() => { setShowTemplateModal(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg text-left text-white hover:bg-gray-700/50 transition-colors">
                <Menu size={16} className="text-pink-400" /> Select Template {templatesLoading && <Loader size={14} className="animate-spin ml-auto" />}
              </button>
              <button onClick={() => { setShowImageOptions(!showImageOptions); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg text-left text-white hover:bg-gray-700/50 transition-colors">
                <Settings size={16} className="text-pink-400" /> Image Settings
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Bot size={16} className="text-white md:hidden" /><Bot size={18} className="text-white hidden md:block" />
                  </div>
                )}
                <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-3 md:p-4 shadow-lg ${message.role === 'user' ? 'bg-gradient-to-br from-pink-600 to-pink-700 text-white' : message.error ? 'bg-gradient-to-br from-red-900/50 to-red-800/50 text-gray-100 border border-red-500/30' : 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 text-gray-100 border border-gray-700/50 backdrop-blur-sm'}`}>
                  {message.templateUsed && (
                    <div className="mb-3 flex items-center gap-2 p-2 bg-pink-500/20 rounded-lg border border-pink-500/30">
                      <Menu size={14} className="text-pink-400" /> <span className="text-xs text-pink-300">Template: {message.templateUsed}</span>
                    </div>
                  )}
                  {message.role === 'assistant' ? <MarkdownRenderer content={message.content} /> : (
                    <div>
                      <p className="leading-relaxed text-sm md:text-base">{message.content}</p>
                      
                      {/* MODIFIED: User uploaded images display */}
                      {message.userImages && (
                        <div className="mt-3 space-y-2">
                          {message.userImages.map((image, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
                              <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                                <img src={URL.createObjectURL(image)} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover" />
                              </div>
                              <span className="text-xs text-pink-200 truncate">{image.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {message.images && (
                    <div className="mt-3 space-y-3">
                      {message.images.map((image, index) => (
                        <ImageWithDownload key={index} src={image} alt={`Generated image ${index + 1}`} />
                      ))}
                    </div>
                  )}
                  
                  {message.imageMetadata && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                        <div><p><span className="text-gray-300 font-medium">Ratio:</span> {message.imageMetadata.aspectRatio}</p></div>
                        <div>{message.imageMetadata.seed && (<p><span className="text-gray-300 font-medium">Seed:</span> {message.imageMetadata.seed}</p>)}</div>
                        {message.imageMetadata.gatewayMetadata && (<div className="col-span-2"><p><span className="text-gray-300 font-medium">Time:</span> {message.imageMetadata.gatewayMetadata.latency}ms</p></div>)}
                      </div>
                    </div>
                  )}
                  
                  {message.role === 'assistant' && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/30">
                      <div className="flex items-center gap-1">
                        <CopyButton text={message.content} />
                        <button onClick={() => handleRetry(message.id)} className="p-1.5 text-gray-400 hover:text-pink-400 transition-colors rounded-md hover:bg-gray-700/50" title="Regenerate response" disabled={isLoading}>
                          <RotateCcw size={14} />
                        </button>
                      </div>
                      <FeedbackButtons messageId={message.id} onFeedback={handleFeedback} />
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <User size={16} className="text-white md:hidden" /><User size={18} className="text-white hidden md:block" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Loader size={16} className="text-white animate-spin md:hidden" /><Loader size={18} className="text-white animate-spin hidden md:block" />
                </div>
                <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-3 md:p-4 border border-gray-700/50 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-gray-300 text-sm">Generating...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="flex-shrink-0 p-4 md:p-6 border-t border-gray-800/50 backdrop-blur-sm bg-gray-900/20">
          <div className="max-w-5xl mx-auto">
            {showImageOptions && (
              <div className="mb-4 p-4 md:p-6 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Sparkles size={18} className="text-pink-400" /><span className="text-sm md:text-base">Image Generation Settings</span>
                  </h3>
                  <button onClick={() => setShowImageOptions(false)} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded">
                    <X size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                    <select value={imageGenOptions.aspectRatio} onChange={(e) => setImageGenOptions(prev => ({ ...prev, aspectRatio: e.target.value as any }))} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-600 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50 transition-all">
                      <option value="1:1">Square (1:1)</option><option value="16:9">Landscape (16:9)</option><option value="9:16">Portrait (9:16)</option><option value="4:3">Standard (4:3)</option><option value="3:4">Portrait (3:4)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
                    <select value={imageGenOptions.outputFormat} onChange={(e) => setImageGenOptions(prev => ({ ...prev, outputFormat: e.target.value as 'jpeg' | 'png' }))} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-600 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50 transition-all">
                      <option value="jpeg">JPEG</option><option value="png">PNG</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Quality: {imageGenOptions.outputQuality}%</label>
                    <input type="range" min="10" max="100" step="10" value={imageGenOptions.outputQuality} onChange={(e) => setImageGenOptions(prev => ({ ...prev, outputQuality: parseInt(e.target.value) }))} className="w-full accent-pink-500 bg-gray-700 rounded-lg" />
                  </div>
                </div>
              </div>
            )}
            {uploadedImages.length > 0 && (
              <div className="mb-4 p-3 md:p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon size={16} className="text-pink-400" />
                  <span className="text-sm font-medium text-gray-300">{uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} ready</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border border-gray-600">
                        <img src={URL.createObjectURL(image)} alt={`Upload preview ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <button onClick={() => removeUploadedImage(index)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-lg" title="Remove image">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 md:gap-3 items-end">
              <button onClick={() => fileInputRef.current?.click()} className="bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-3 py-2.5 md:px-4 md:py-3 transition-all duration-200 flex items-center justify-center border border-gray-600 hover:border-gray-500 shadow-lg" title="Upload images" disabled={isLoading}>
                <Plus size={18} className="md:hidden" /><Plus size={20} className="hidden md:block" />
              </button>
              <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
              <button onClick={() => setShowTemplateModal(true)} className={`px-3 py-2.5 md:px-4 md:py-3 rounded-xl transition-all duration-200 flex items-center justify-center border shadow-lg relative ${currentTemplate ? 'bg-pink-600 text-white border-pink-500 shadow-pink-500/25' : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600 hover:border-pink-500'}`} title="Select template" disabled={isLoading}>
                <Menu size={18} className="md:hidden" /><Menu size={20} className="hidden md:block" />
                {templatesLoading && (<div className="absolute -top-1 -right-1"><Loader size={12} className="animate-spin text-pink-400" /></div>)}
              </button>
              <button onClick={() => setShowImageOptions(!showImageOptions)} className={`hidden md:flex px-4 py-3 rounded-xl transition-all duration-200 items-center justify-center border shadow-lg ${showImageOptions ? 'bg-pink-600 text-white border-pink-500 shadow-pink-500/25' : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600 hover:border-pink-500'}`} title="Image settings" disabled={isLoading}>
                <Settings size={20} />
              </button>
              <select value={imageGenOptions.aspectRatio} onChange={(e) => setImageGenOptions(prev => ({ ...prev, aspectRatio: e.target.value as any }))} className="hidden md:block bg-gray-800 text-white rounded-xl px-3 py-3 border border-gray-600 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50 transition-all min-w-[100px] shadow-lg text-sm" disabled={isLoading}>
                <option value="1:1">1:1</option><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="4:3">4:3</option><option value="3:4">3:4</option>
              </select>
              <div className="flex-1 relative">
                <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }} placeholder="Message or '/generate [description]'..." className="w-full bg-gray-800/80 text-white rounded-xl px-3 py-2.5 md:px-4 md:py-3 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent placeholder-gray-400 border border-gray-600 hover:border-gray-500 transition-all backdrop-blur-sm shadow-lg text-sm md:text-base" disabled={isLoading} />
                {input.toLowerCase().startsWith('/generate') && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Sparkles size={14} className="text-pink-400 md:hidden" /><Sparkles size={16} className="text-pink-400 hidden md:block" />
                  </div>
                )}
              </div>
              <button onClick={handleSubmit} disabled={(!input.trim() && uploadedImages.length === 0) || isLoading} className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 md:px-5 md:py-3 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-pink-500/25 disabled:shadow-none">
                {isLoading ? (<Loader size={18} className="animate-spin md:hidden" />) : (<Send size={18} className="md:hidden" />)}
                {isLoading ? (<Loader size={20} className="animate-spin hidden md:block" />) : (<Send size={20} className="hidden md:block" />)}
              </button>
            </div>
            <div className="mt-2 md:mt-3 flex flex-col md:flex-row md:items-center md:justify-between text-xs text-gray-500 space-y-2 md:space-y-0">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="flex items-center gap-1">
                  <Sparkles size={10} className="text-pink-400" /><span>Use <code className="bg-gray-800 px-1 py-0.5 rounded text-pink-300">/generate [description]</code> for images</span>
                </div>
                <div className="flex items-center gap-1">
                  <Menu size={10} className="text-blue-400" /><span>Select templates for consistent results</span>
                </div>
              </div>
              <div className="text-gray-600 hidden md:block">Press Enter to send</div>
            </div>
          </div>
        </div>
        <TemplateSelectionModal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} onSelectTemplate={handleTemplateSelect} templates={savedTemplates} loading={templatesLoading} error={templatesError} onRetry={loadSavedTemplates} />
      </div>
    </div>
  );
};

export default ChatBot;