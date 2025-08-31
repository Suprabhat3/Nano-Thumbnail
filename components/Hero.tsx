// components/HeroSection.tsx
"use client"
import React, { useState, useRef, useEffect } from 'react';

const HeroSection: React.FC = () => {
  const [input, setInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [selectedRatio, setSelectedRatio] = useState('16:9');
  const [showRatioDropdown, setShowRatioDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectRatios = [
    { label: '16:9', value: '16:9', description: 'YouTube' },
    { label: '9:16', value: '9:16', description: 'Stories' },
    { label: '1:1', value: '1:1', description: 'Square' },
    { label: '4:3', value: '4:3', description: 'Classic' },
    { label: '3:2', value: '3:2', description: 'Photo' },
    { label: '21:9', value: '21:9', description: 'Ultra' },
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files).filter(file =>
        file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
      );
      setUploadedImages(prev => [...prev, ...newImages]);
    }
    // Reset input value to allow same file selection
    event.target.value = '';
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showRatioDropdown) {
        setShowRatioDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRatioDropdown]);

  const handleSubmit = () => {
    if (!input.trim() && uploadedImages.length === 0) return;

    try {
      // Store the input, images, and aspect ratio in sessionStorage
      if (input.trim()) {
        sessionStorage.setItem('chatInput', input.trim());
      }

      // Store selected aspect ratio
      sessionStorage.setItem('chatAspectRatio', selectedRatio);

      if (uploadedImages.length > 0) {
        // Convert images to base64 for storage
        const imagePromises = uploadedImages.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        });

        Promise.all(imagePromises).then(base64Images => {
          sessionStorage.setItem('chatImages', JSON.stringify(base64Images));
          // Use window.location for navigation instead of router
          window.location.href = '/chat';
        }).catch(error => {
          console.error('Error processing images:', error);
          // Fallback to text-only navigation
          window.location.href = '/chat';
        });
      } else {
        // Use window.location for navigation instead of router
        window.location.href = '/chat';
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden ">
      {/* Gradient Blob Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute w-full h-full bg-gradient-radial from-transparent via-purple-800/20 to-transparent"></div>
      </div>

      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        {/* Main Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 leading-tight tracking-tight">
          Create Stunning{' '}
          <span className="inline-flex items-center gap-1">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-500">Thumbnails in Seconds</span>
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Upload your image and describe your vision to create the perfect thumbnail
        </p>

        {/* Input Card */}
        <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border border-gray-700 max-w-3xl mx-auto relative">
          {/* Image previews */}
          {uploadedImages.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 justify-center">
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Upload preview ${index + 1}`}
                    className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg border border-gray-600"
                  />
                  <button
                    onClick={() => removeUploadedImage(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 md:h-4 md:w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Field */}
          <input
            type="text"
            placeholder="Ask Nano Thumbnail to create a landing page for my..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none text-base md:text-lg placeholder-opacity-30"
          />

          {/* Bottom Controls */}
          <div className="flex items-center justify-between mt-3">
            {/* Left Side: Upload Button and Aspect Ratio */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 hover:bg-gray-600 transition-colors"
                title="Upload images"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Aspect Ratio Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowRatioDropdown(!showRatioDropdown)}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors flex items-center gap-1"
                  title="Select aspect ratio"
                >
                  <span>{selectedRatio}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${showRatioDropdown ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showRatioDropdown && (
                  <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[120px]">
                    {aspectRatios.map((ratio) => (
                      <button
                        key={ratio.value}
                        onClick={() => {
                          setSelectedRatio(ratio.value);
                          setShowRatioDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                          selectedRatio === ratio.value ? 'bg-pink-600 text-white' : 'text-gray-300'
                        }`}
                      >
                        <div className="font-medium">{ratio.label}</div>
                        <div className="text-xs opacity-75">{ratio.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {uploadedImages.length > 0 && (
                <span className="text-xs text-gray-400">
                  {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && uploadedImages.length === 0}
              className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
              title="Start chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* CTA Button and Description */}
        <div className="mt-4 items-center justify-center gap-2">
          <p className="text-md text-gray-300">
            Templates are good for creating consistent Thumbnails.
          </p>
          <button
            onClick={() => window.location.href = '/template'}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-md font-medium rounded-lg transition-colors border border-gray-600 mt-4"
          >
            Create template
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;