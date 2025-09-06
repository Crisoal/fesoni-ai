import React, { useState, useRef, useCallback } from 'react';
import { Upload, Camera, X, Sparkles, DollarSign, Loader2 } from 'lucide-react';

interface StyleAnalysis {
  aesthetics: Array<{ name: string; confidence: number }>;
  colors: Array<{ name: string; hex: string; confidence: number }>;
  textures: Array<{ name: string; confidence: number }>;
  silhouettes: Array<{ name: string; confidence: number }>;
  mood: Array<{ name: string; confidence: number }>;
  overallStyle: string;
  description: string;
}

interface ImageUploadProps {
  onStyleAnalysis: (analysis: StyleAnalysis, budget?: number) => void;
  isAnalyzing: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onStyleAnalysis, isAnalyzing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [budget, setBudget] = useState<string>('');
  const [currentAnalysis, setCurrentAnalysis] = useState<StyleAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setUploadedImage(imageUrl);
      analyzeImage(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (imageUrl: string) => {
    try {
      // Mock analysis for now - in real implementation, this would call OpenAI Vision API
      const mockAnalysis: StyleAnalysis = {
        aesthetics: [
          { name: 'Minimalist', confidence: 0.92 },
          { name: 'Modern', confidence: 0.78 },
          { name: 'Sleek', confidence: 0.65 }
        ],
        colors: [
          { name: 'Charcoal', hex: '#36454F', confidence: 0.89 },
          { name: 'Cream', hex: '#F5F5DC', confidence: 0.76 },
          { name: 'Soft Gray', hex: '#D3D3D3', confidence: 0.68 }
        ],
        textures: [
          { name: 'Smooth', confidence: 0.85 },
          { name: 'Matte', confidence: 0.72 },
          { name: 'Structured', confidence: 0.69 }
        ],
        silhouettes: [
          { name: 'Tailored', confidence: 0.88 },
          { name: 'Clean Lines', confidence: 0.82 },
          { name: 'Fitted', confidence: 0.75 }
        ],
        mood: [
          { name: 'Professional', confidence: 0.91 },
          { name: 'Sophisticated', confidence: 0.84 },
          { name: 'Confident', confidence: 0.77 }
        ],
        overallStyle: 'Modern Minimalist Professional',
        description: 'A sophisticated, minimalist look featuring clean lines and neutral tones. Perfect for professional settings with a modern edge.'
      };

      setCurrentAnalysis(mockAnalysis);
      setShowBudgetInput(true);
    } catch (error) {
      console.error('Image analysis failed:', error);
    }
  };

  const handleBudgetSubmit = () => {
    if (currentAnalysis) {
      const budgetValue = budget ? parseFloat(budget) : undefined;
      onStyleAnalysis(currentAnalysis, budgetValue);
      setShowBudgetInput(false);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    setCurrentAnalysis(null);
    setShowBudgetInput(false);
    setBudget('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!uploadedImage && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            dragActive
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Upload Your Style Inspiration
              </h3>
              <p className="text-gray-400 mb-4">
                Drag & drop an image or click to browse
              </p>
              <p className="text-sm text-gray-500">
                I'll analyze the style and find similar products for you
              </p>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Choose Image</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Image & Analysis */}
      {uploadedImage && (
        <div className="space-y-6">
          {/* Image Preview */}
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Uploaded style inspiration"
              className="w-full max-w-md mx-auto rounded-xl shadow-lg"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Style Analysis Results */}
          {currentAnalysis && (
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Style Analysis</h3>
              </div>

              <div className="mb-4 p-4 bg-gray-800/50 rounded-lg">
                <h4 className="font-medium text-white mb-2">Overall Style</h4>
                <p className="text-purple-300 font-semibold">{currentAnalysis.overallStyle}</p>
                <p className="text-gray-400 text-sm mt-2">{currentAnalysis.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Aesthetics */}
                <div className="space-y-3">
                  <h4 className="font-medium text-white">Aesthetics</h4>
                  {currentAnalysis.aesthetics.map((aesthetic, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                      <span className="text-gray-300">{aesthetic.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs ${getConfidenceColor(aesthetic.confidence)}`}>
                          {getConfidenceLabel(aesthetic.confidence)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round(aesthetic.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Colors */}
                <div className="space-y-3">
                  <h4 className="font-medium text-white">Color Palette</h4>
                  {currentAnalysis.colors.map((color, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-600"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-gray-300">{color.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(color.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Textures */}
                <div className="space-y-3">
                  <h4 className="font-medium text-white">Textures</h4>
                  {currentAnalysis.textures.map((texture, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                      <span className="text-gray-300">{texture.name}</span>
                      <span className="text-xs text-gray-500">
                        {Math.round(texture.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Mood */}
                <div className="space-y-3">
                  <h4 className="font-medium text-white">Mood</h4>
                  {currentAnalysis.mood.map((mood, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                      <span className="text-gray-300">{mood.name}</span>
                      <span className="text-xs text-gray-500">
                        {Math.round(mood.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Budget Input */}
          {showBudgetInput && (
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Set Your Budget</h3>
              </div>
              
              <p className="text-gray-400 mb-4">
                What's your budget for recreating this look? I'll find the best combination of items within your price range.
              </p>
              
              <div className="flex space-x-4">
                <div className="flex-1">
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Enter budget (optional)"
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={handleBudgetSubmit}
                  disabled={isAnalyzing}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Finding Products...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Find Similar Products</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {[50, 100, 200, 500].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBudget(amount.toString())}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full text-sm transition-colors"
                  >
                    ${amount}
                  </button>
                ))}
                <button
                  onClick={() => setBudget('')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full text-sm transition-colors"
                >
                  No Budget
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;