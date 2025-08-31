"use client"
import React, { useState, useEffect } from 'react';
import { Save, Plus, Image, Settings, Palette, Layers, Sparkles, Edit, Trash2, Copy } from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// TypeScript interfaces
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

interface Template {
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

type ViewType = 'list' | 'create';

// Firebase service

interface FirebaseService {
  saveTemplate: (template: Omit<Template, 'id'>) => Promise<Template>;
  getTemplates: () => Promise<Template[]>;
  deleteTemplate: (id: string) => Promise<void>;
}

const firebase: FirebaseService = {
  saveTemplate: async (template: Omit<Template, 'id'>): Promise<Template> => {
    try {
      const firestoreTemplate: FirestoreTemplate = {
        ...template,
        createdAt: Timestamp.now()
      };
      const docRef = await addDoc(collection(db, 'templates'), firestoreTemplate);
      return { 
        ...template, 
        id: docRef.id,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error saving template:', error);
      throw new Error('Failed to save template');
    }
  },

  getTemplates: async (): Promise<Template[]> => {
    try {
      const q = query(collection(db, 'templates'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as FirestoreTemplate;
        return {
          id: doc.id,
          name: data.name,
          options: data.options,
          createdAt: data.createdAt.toDate().toISOString()
        };
      });
    } catch (error) {
      console.error('Error getting templates:', error);
      throw new Error('Failed to load templates');
    }
  },

  deleteTemplate: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'templates', id));
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete template');
    }
  }
};

const TemplateManager: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Template creation form state
  const [templateName, setTemplateName] = useState<string>('');
  const [templateOptions, setTemplateOptions] = useState<TemplateOptions>({
    style: 'realistic',
    aspectRatio: '16:9',
    quality: 'high',
    colorScheme: 'vibrant',
    lighting: 'natural',
    composition: 'center',
    effects: [],
    customPrompt: ''
  });

  const styleOptions: string[] = ['realistic', 'artistic', 'cartoon', 'abstract', 'vintage', 'futuristic'];
  const aspectRatioOptions: string[] = ['1:1', '16:9', '9:16', '4:3', '3:2'];
  const qualityOptions: string[] = ['standard', 'high', 'ultra'];
  const colorSchemeOptions: string[] = ['vibrant', 'muted', 'monochrome', 'warm', 'cool', 'pastel'];
  const lightingOptions: string[] = ['natural', 'dramatic', 'soft', 'harsh', 'golden', 'blue'];
  const compositionOptions: string[] = ['center', 'rule-of-thirds', 'symmetrical', 'dynamic', 'minimal'];
  const effectOptions: string[] = ['blur', 'sharpen', 'glow', 'vintage', 'hdr', 'noir'];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const loadedTemplates = await firebase.getTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (): Promise<void> => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    try {
      const template: Omit<Template, 'id'> = {
        name: templateName.trim(),
        options: templateOptions,
        createdAt: new Date().toISOString()
      };
      
      await firebase.saveTemplate(template);
      setTemplateOptions({
        style: 'realistic',
        aspectRatio: '16:9',
        quality: 'high',
        colorScheme: 'vibrant',
        lighting: 'natural',
        composition: 'center',
        effects: [],
        customPrompt: ''
      });
      setTemplateName('');
      setCurrentView('list');
      await loadTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    }
  };

  const handleDeleteTemplate = async (id: string): Promise<void> => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await firebase.deleteTemplate(id);
        await loadTemplates();
      } catch (error) {
        console.error('Failed to delete template:', error);
        alert('Failed to delete template. Please try again.');
      }
    }
  };

  const handleUseTemplate = (template: Template): void => {
    // Store template data in localStorage for the chat page to use
    localStorage.setItem('selectedTemplate', JSON.stringify(template));
    
    // Redirect to chat page
    window.location.href = '/chat';
  };

  const toggleEffect = (effect: string): void => {
    setTemplateOptions(prev => ({
      ...prev,
      effects: prev.effects.includes(effect)
        ? prev.effects.filter(e => e !== effect)
        : [...prev.effects, effect]
    }));
  };

  const handleOptionChange = <K extends keyof TemplateOptions>(
    key: K,
    value: TemplateOptions[K]
  ): void => {
    setTemplateOptions(prev => ({ ...prev, [key]: value }));
  };

  const capitalizeFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatLabel = (str: string): string => {
    return capitalizeFirst(str.replace('-', ' '));
  };

  if (currentView === 'create') {
    return (
      <div className="min-h-screen w-full relative bg-black font-sans">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255, 80, 120, 0.25), transparent 70%), #000000",
          }}
        />
        
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8">
          <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Create Template</h1>
              </div>
              <button
                onClick={() => setCurrentView('list')}
                className="text-gray-400 hover:text-white transition-colors"
                type="button"
              >
                ← Back to Templates
              </button>
            </div>

            {/* Template Name */}
            <div className="mb-8">
              <label className="block text-white text-sm font-medium mb-2">
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors"
                placeholder="Enter template name..."
              />
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Style */}
              <div className="space-y-3">
                <label className="flex items-center text-white text-sm font-medium">
                  <Palette className="h-4 w-4 mr-2" />
                  Style
                </label>
                <select
                  value={templateOptions.style}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    handleOptionChange('style', e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                >
                  {styleOptions.map(option => (
                    <option key={option} value={option}>
                      {capitalizeFirst(option)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-3">
                <label className="flex items-center text-white text-sm font-medium">
                  <Image className="h-4 w-4 mr-2" />
                  Aspect Ratio
                </label>
                <select
                  value={templateOptions.aspectRatio}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    handleOptionChange('aspectRatio', e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                >
                  {aspectRatioOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Quality */}
              <div className="space-y-3">
                <label className="flex items-center text-white text-sm font-medium">
                  <Settings className="h-4 w-4 mr-2" />
                  Quality
                </label>
                <select
                  value={templateOptions.quality}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    handleOptionChange('quality', e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                >
                  {qualityOptions.map(option => (
                    <option key={option} value={option}>
                      {capitalizeFirst(option)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Scheme */}
              <div className="space-y-3">
                <label className="flex items-center text-white text-sm font-medium">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Color Scheme
                </label>
                <select
                  value={templateOptions.colorScheme}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    handleOptionChange('colorScheme', e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                >
                  {colorSchemeOptions.map(option => (
                    <option key={option} value={option}>
                      {capitalizeFirst(option)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lighting */}
              <div className="space-y-3">
                <label className="flex items-center text-white text-sm font-medium">
                  <Layers className="h-4 w-4 mr-2" />
                  Lighting
                </label>
                <select
                  value={templateOptions.lighting}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    handleOptionChange('lighting', e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                >
                  {lightingOptions.map(option => (
                    <option key={option} value={option}>
                      {capitalizeFirst(option)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Composition */}
              <div className="space-y-3">
                <label className="flex items-center text-white text-sm font-medium">
                  <Image className="h-4 w-4 mr-2" />
                  Composition
                </label>
                <select
                  value={templateOptions.composition}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    handleOptionChange('composition', e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                >
                  {compositionOptions.map(option => (
                    <option key={option} value={option}>
                      {formatLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Effects */}
            <div className="mb-8">
              <label className="block text-white text-sm font-medium mb-4">
                Effects (Select multiple)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {effectOptions.map(effect => (
                  <button
                    key={effect}
                    onClick={() => toggleEffect(effect)}
                    type="button"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      templateOptions.effects.includes(effect)
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {capitalizeFirst(effect)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="mb-8">
              <label className="block text-white text-sm font-medium mb-2">
                Custom Prompt (Optional)
              </label>
              <textarea
                value={templateOptions.customPrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                  handleOptionChange('customPrompt', e.target.value)
                }
                rows={3}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors resize-none"
                placeholder="Add custom instructions or style preferences..."
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveTemplate}
              type="button"
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Save className="h-5 w-5" />
              <span>Save Template</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative bg-black font-sans">
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255, 80, 120, 0.25), transparent 70%), #000000",
        }}
      />
      
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-8">
        <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center">
                <Image className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Templates</h1>
            </div>
            <button
              onClick={() => setCurrentView('create')}
              type="button"
              className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create New</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-400">Loading templates...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-400 mb-4">{error}</div>
              <button
                onClick={loadTemplates}
                type="button"
                className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Image className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Templates Yet</h3>
              <p className="text-gray-400 mb-6">Create your first template to get started</p>
              <button
                onClick={() => setCurrentView('create')}
                type="button"
                className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Create Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template: Template) => (
                <div
                  key={template.id}
                  className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-600 hover:border-pink-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {template.name}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUseTemplate(template)}
                        type="button"
                        className="text-gray-400 hover:text-pink-400 transition-colors"
                        title="Copy template"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        type="button"
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>Style:</span>
                      <span className="capitalize">{template.options.style}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Ratio:</span>
                      <span>{template.options.aspectRatio}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Quality:</span>
                      <span className="capitalize">{template.options.quality}</span>
                    </div>
                    {template.options.effects.length > 0 && (
                      <div className="text-gray-300">
                        <span>Effects:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.options.effects.map(effect => (
                            <span
                              key={effect}
                              className="px-2 py-1 bg-pink-600 bg-opacity-20 text-pink-300 text-xs rounded"
                            >
                              {effect}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-600 text-xs text-gray-500">
                    Created: {new Date(template.createdAt).toLocaleDateString()}
                  </div>
                  
                  <button
                    onClick={() => handleUseTemplate(template)}
                    type="button"
                    className="w-full mt-4 bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Use Template</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;