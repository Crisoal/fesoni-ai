// src/components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ShoppingBag, AlertCircle, Camera, Upload } from 'lucide-react';
import { OpenAIService, AnalysisResponse } from '../services/openaiService';
import { AmazonService, AmazonProduct } from '../services/amazonService';
import { FoxitService, StylePortfolioData } from '../services/foxitService';
import { VisionService } from '../services/visionService';
import { ReverseSearchService, OptimizedProduct } from '../services/reverseSearchService';
import ProductCard from './ProductCard';
import StyleDocumentToolbar from './StyleDocumentToolbar';
import ImageUpload from './ImageUpload';
import BudgetOptimizer from './BudgetOptimizer';

interface StyleDocuments {
  mainDocument?: string; // base64 string
  documentId?: string;
  processedVersions?: Array<{
    type: string;
    taskId: string;
    status?: 'processing' | 'completed' | 'failed';
    downloadUrl?: string;
    size?: number;
  }>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  products?: AmazonProduct[] | OptimizedProduct[];
  styleDocuments?: StyleDocuments;
  portfolioData?: StylePortfolioData; // Add portfolio data for toolbar access
  imageAnalysis?: {
    uploadedImage: string;
    analysis: any;
    budget?: number;
  };
  showBudgetOptimizer?: boolean;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDocuments, setIsGeneratingDocuments] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const openaiService = new OpenAIService();
  const amazonService = new AmazonService();
  const foxitService = new FoxitService();
  const visionService = new VisionService();
  const reverseSearchService = new ReverseSearchService();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageStyleAnalysis = async (analysis: any, budget?: number) => {
    setIsAnalyzingImage(true);
    setShowImageUpload(false);

    try {
      // Create a message showing the analysis
      const analysisMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Perfect! I've analyzed your style inspiration and identified it as **${analysis.overallStyle}**. 

${analysis.description}

Now I'm searching for products that match these style elements${budget ? ` within your $${budget} budget` : ''}...`,
        timestamp: new Date(),
        imageAnalysis: {
          uploadedImage: '', // Would contain the uploaded image
          analysis,
          budget
        }
      };

      setMessages(prev => [...prev, analysisMessage]);

      // Perform reverse search based on analysis
      const searchParams = {
        aesthetics: analysis.aesthetics.map((a: any) => a.name),
        colors: analysis.colors.map((c: any) => c.name),
        textures: analysis.textures.map((t: any) => t.name),
        silhouettes: analysis.silhouettes.map((s: any) => s.name),
        mood: analysis.mood.map((m: any) => m.name),
        searchKeywords: analysis.searchKeywords || [],
        budget
      };

      const searchResult = await reverseSearchService.searchByStyle(searchParams, 16);

      // Create portfolio data for the found products
      const portfolioData: StylePortfolioData = {
        userPreferences: {
          aesthetics: searchParams.aesthetics,
          productTypes: ['fashion'],
          budget: budget ? `$${budget}` : undefined,
          lifestyle: searchParams.mood[0] || 'general',
        },
        products: searchResult.products.slice(0, 12).map(product => ({
          product_id: product.product_id,
          title: product.title,
          url: product.url,
          image: product.image,
          price: product.price,
          category: product.category || 'Fashion',
          brand: product.brand || product.manufacturer || '',
          rating: product.rating || 0,
          reviews: product.reviews || 0,
          prime: product.prime || false,
          retail_price: product.retail_price || product.price
        })),
        metadata: {
          userName: 'Style Enthusiast',
          createdDate: new Date().toISOString(),
          season: getCurrentSeason(),
          occasion: 'style-match'
        }
      };

      // Create results message
      const resultsMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Amazing! I found ${searchResult.products.length} products that match your style inspiration. ${searchResult.searchStrategy}

${budget && searchResult.budgetAnalysis ? 
  `**Budget Analysis:**
  • ${searchResult.budgetAnalysis.withinBudget} products within your $${budget} budget
  • ${searchResult.budgetAnalysis.overBudget} premium alternatives
  • Average price: $${searchResult.budgetAnalysis.averagePrice}
  ${searchResult.budgetAnalysis.recommendedBudget > budget ? 
    `• Recommended budget for this style: $${searchResult.budgetAnalysis.recommendedBudget}` : ''}` 
  : ''}

Each product shows a similarity score - look for 90%+ matches for exact style replication, or 70%+ for inspired alternatives. Use the budget optimizer below to fine-tune your selections!`,
        timestamp: new Date(),
        products: searchResult.products,
        portfolioData,
        showBudgetOptimizer: budget !== undefined
      };

      setMessages(prev => [...prev, resultsMessage]);

      // Generate style documents if we have good matches
      if (searchResult.products.length > 0) {
        await generateStyleDocuments(
          {
            styleAnalysis: {
              aesthetics: searchParams.aesthetics,
              productTypes: ['fashion'],
              budget: budget ? `$${budget}` : undefined,
              lifestyle: searchParams.mood[0] || 'general'
            },
            followUpQuestions: [],
            recommendedCategories: []
          },
          searchResult.products,
          resultsMessage.id
        );
      }

    } catch (error) {
      console.error('Image analysis error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I encountered an issue analyzing your image. Please try uploading a different image or describe your style preferences in text.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleProductsUpdate = (messageId: string, updatedProducts: OptimizedProduct[]) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, products: updatedProducts }
        : msg
    ));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setDocumentError(null);

    try {
      const styleAnalysis = await openaiService.analyzeStylePreferences(inputValue);

      let products: AmazonProduct[] = [];
      if (styleAnalysis.recommendedCategories && styleAnalysis.recommendedCategories.length > 0) {
        const searchKeywords = [
          ...(styleAnalysis.styleAnalysis.aesthetics || []),
          ...(styleAnalysis.styleAnalysis.specificItems || []),
          ...styleAnalysis.recommendedCategories
        ].filter(Boolean);

        if (searchKeywords.length > 0) {
          products = await amazonService.searchProducts(searchKeywords);
        }
      }

      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const aiResponse = await openaiService.chat([
        {
          role: 'system',
          content: `You are Fesoni, a sophisticated AI shopping assistant. Based on the user's style preferences, provide helpful guidance, ask intelligent follow-up questions when needed, and offer personalized recommendations. Be conversational, insightful, and focus on understanding their unique style vibe.

        Style Analysis: ${JSON.stringify(styleAnalysis)}
        Found Products: ${products.length} products found
        
        If you found relevant products, mention that you'll also create personalized style documentation for them.
        Provide a natural, helpful response that acknowledges their preferences and guides the conversation forward.`
        },
        ...conversationHistory,
        { role: 'user', content: inputValue }
      ]);

      // Create portfolio data whenever we have products (for toolbar access)
      let portfolioData: StylePortfolioData | undefined;
      if (products.length > 0) {
        portfolioData = {
          userPreferences: {
            aesthetics: styleAnalysis.styleAnalysis.aesthetics || ['modern'],
            productTypes: styleAnalysis.styleAnalysis.productTypes || ['fashion'],
            budget: styleAnalysis.styleAnalysis.budget || undefined,
            lifestyle: styleAnalysis.styleAnalysis.lifestyle || 'casual',
          },
          products: products.slice(0, 12).map(product => ({
            product_id: product.product_id,
            title: product.title,
            url: product.url,
            image: product.image,
            price: product.price,
            category: inferProductCategory(product.title),
            brand: product.brand || product.manufacturer || '',
            rating: product.rating || 0,
            reviews: product.reviews || 0,
            prime: product.prime || false,
            retail_price: product.retail_price || product.price
          })),
          metadata: {
            userName: 'Valued Customer',
            createdDate: new Date().toISOString(),
            season: getCurrentSeason(),
            occasion: styleAnalysis.styleAnalysis.lifestyle || 'general'
          }
        };
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        products: products.length > 0 ? products : undefined,
        portfolioData: portfolioData, // Always include portfolio data when products exist
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Only attempt document generation if we have comprehensive style data
      if (products.length > 0 &&
        styleAnalysis.styleAnalysis.aesthetics &&
        styleAnalysis.styleAnalysis.aesthetics.length > 0) {
        await generateStyleDocuments(styleAnalysis, products, assistantMessage.id);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an issue processing your request. Please check your API configuration and try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateStyleDocuments = async (
    styleAnalysis: AnalysisResponse,
    products: AmazonProduct[],
    messageId: string
  ) => {
    setIsGeneratingDocuments(true);
    setDocumentError(null);

    try {
      console.log('Starting document generation process...');

      const portfolioData: StylePortfolioData = {
        userPreferences: {
          aesthetics: styleAnalysis.styleAnalysis.aesthetics || ['modern'],
          productTypes: styleAnalysis.styleAnalysis.productTypes || ['fashion'],
          budget: styleAnalysis.styleAnalysis.budget || undefined,
          lifestyle: styleAnalysis.styleAnalysis.lifestyle || 'casual',
        },
        products: products.slice(0, 12).map(product => ({
          product_id: product.product_id,
          title: product.title,
          url: product.url,
          image: product.image,
          price: product.price,
          category: inferProductCategory(product.title),
          // Include additional product details
          brand: product.brand || product.manufacturer || '',
          rating: product.rating || 0,
          reviews: product.reviews || 0,
          prime: product.prime || false,
          retail_price: product.retail_price || product.price
        })),
        metadata: {
          userName: 'Valued Customer',
          createdDate: new Date().toISOString(),
          season: getCurrentSeason(),
          occasion: styleAnalysis.styleAnalysis.lifestyle || 'general'
        }
      };

      console.log('Portfolio data prepared:', {
        aesthetics: portfolioData.userPreferences.aesthetics,
        productCount: portfolioData.products.length,
        lifestyle: portfolioData.userPreferences.lifestyle
      });

      const stylePortfolio = await foxitService.createStylePortfolio(portfolioData);

      console.log('Style portfolio generated successfully:', {
        hasMainDocument: !!stylePortfolio.mainDocument,
        documentId: stylePortfolio.documentId,
        processedVersionsCount: stylePortfolio.processedVersions.length
      });

      const styleDocuments: StyleDocuments = {
        mainDocument: stylePortfolio.mainDocument,
        documentId: stylePortfolio.documentId,
        processedVersions: stylePortfolio.processedVersions.map(version => ({
          ...version,
          status: 'processing' as const
        }))
      };

      // Update the message with generated documents AND portfolio data
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? {
            ...msg,
            styleDocuments,
            portfolioData // Store portfolio data for toolbar access
          }
          : msg
      ));

      // Add a success message about the generated documents
      const documentMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Perfect! I've created your personalized style documentation based on your ${portfolioData.userPreferences.aesthetics.join(' + ')} aesthetic. Use the toolbar below to access different document formats and sharing options.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, documentMessage]);

      // Poll for processing status updates if we have processed versions
      if (styleDocuments.processedVersions && styleDocuments.processedVersions.length > 0) {
        await pollProcessingStatus(styleDocuments, messageId);
      }

    } catch (error) {
      console.error('Document generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setDocumentError(errorMessage);

      let userFriendlyMessage = '';
      if (errorMessage.includes('Template Loading Failed')) {
        userFriendlyMessage = `I found perfect products for your style, but I'm having trouble accessing the document template. This is likely a temporary technical issue.\n\n**What you can do:**\n• The curated products above are still perfectly matched to your preferences\n• Try refreshing the page and asking again\n• The issue should resolve shortly\n\n**Your products are ready** - I can continue helping you with more recommendations while this gets fixed!`;
      } else if (errorMessage.includes('Wrong signature') || errorMessage.includes('Document generation failed')) {
        userFriendlyMessage = `I've curated amazing products for your style! However, I'm experiencing a temporary issue generating your personalized style guide.\n\n**Don't worry** - your product recommendations above are carefully selected and ready to view. I can also help you with:\n• More product suggestions\n• Styling advice for specific pieces\n• Questions about the items I found\n\nLet me know how else I can help with your style journey!`;
      } else {
        userFriendlyMessage = `Great news - I found fantastic products that match your style perfectly! While I work on resolving a temporary issue with document generation, you can:\n\n• Browse the curated products above\n• Ask me about specific items\n• Request more recommendations\n• Get styling tips for any pieces\n\nWhat would you like to explore next from your personalized selection?`;
      }

      const errorResponse: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: userFriendlyMessage,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsGeneratingDocuments(false);
    }
  };

  const pollProcessingStatus = async (documents: StyleDocuments, messageId: string) => {
    if (!documents.processedVersions) return;

    const pollInterval = setInterval(async () => {
      try {
        let allCompleted = true;
        const updatedVersions = await Promise.all(
          documents.processedVersions!.map(async (version) => {
            if (version.status === 'processing') {
              try {
                const taskStatus = await foxitService.checkTaskStatus(version.taskId);

                if (taskStatus.status === 'completed') {
                  return {
                    ...version,
                    status: 'completed' as const,
                    downloadUrl: taskStatus.downloadUrl || `${foxitService.pdfServicesUrl}/api/documents/${taskStatus.documentId}/download`,
                    size: undefined
                  };
                } else if (taskStatus.status === 'failed') {
                  return {
                    ...version,
                    status: 'failed' as const
                  };
                } else {
                  allCompleted = false;
                  return version;
                }
              } catch (error) {
                console.error(`Task status check failed for ${version.taskId}:`, error);
                allCompleted = false;
                return version;
              }
            }
            return version;
          })
        );

        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? {
              ...msg,
              styleDocuments: {
                ...documents,
                processedVersions: updatedVersions
              }
            }
            : msg
        ));

        if (allCompleted) {
          clearInterval(pollInterval);
        }

      } catch (error) {
        console.error('Status polling error:', error);
        clearInterval(pollInterval);
      }
    }, 5000);

    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  };

  const handleDownloadDocument = async (documentIdOrUrl: string, filename?: string): Promise<Blob> => {
    try {
      console.log(`Attempting to download: ${documentIdOrUrl}`);
      return await foxitService.downloadDocument(documentIdOrUrl, filename);
    } catch (error) {
      console.error('Download error:', error);
      let errorMessage = 'Failed to download document';
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          errorMessage = 'Document has expired (available for 24 hours only)';
        } else if (error.message.includes('not ready')) {
          errorMessage = 'Document is still processing. Please try again in a moment.';
        } else if (error.message.includes('Authentication')) {
          errorMessage = 'Authentication error. Please refresh and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      throw new Error(errorMessage);
    }
  };

  const inferProductCategory = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('dress') || lowerTitle.includes('top') || lowerTitle.includes('shirt')) return 'Clothing';
    if (lowerTitle.includes('bag') || lowerTitle.includes('jewelry') || lowerTitle.includes('watch')) return 'Accessories';
    if (lowerTitle.includes('shoe') || lowerTitle.includes('boot') || lowerTitle.includes('sandal')) return 'Footwear';
    if (lowerTitle.includes('home') || lowerTitle.includes('decor') || lowerTitle.includes('lamp')) return 'Home Decor';
    return 'Fashion';
  };

  const getCurrentSeason = (): string => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-800">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Fesoni
          </h1>
          <span className="text-sm text-gray-400">Your AI Shopping Assistant</span>
          
          {/* Image Upload Toggle */}
          <button
            onClick={() => setShowImageUpload(!showImageUpload)}
            className={`ml-4 p-2 rounded-full transition-all duration-200 ${
              showImageUpload 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title="Upload style inspiration image"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Upload Section */}
      {showImageUpload && (
        <div className="flex-shrink-0 p-6 border-b border-gray-800">
          <ImageUpload 
            onStyleAnalysis={handleImageStyleAnalysis}
            isAnalyzing={isAnalyzingImage}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Display welcome message only when there are no messages */}
          {messages.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-2xl p-4 rounded-2xl bg-gray-900 text-gray-100 mr-12 border border-gray-800">
                <p className="whitespace-pre-wrap leading-relaxed">
                  Hi! I'm Fesoni, your AI shopping assistant. I can help you in two ways:
                  
                  📸 **Upload a style inspiration image** - I'll analyze the photo and find similar products
                  💬 **Describe your style** - Tell me about your aesthetic and I'll curate products for you
                  
                  I'll also create personalized style documentation and help optimize your budget. What would you like to explore today?
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="space-y-4">
              <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl p-4 rounded-2xl ${message.role === 'user'
                  ? 'bg-blue-600 text-white ml-12'
                  : 'bg-gray-900 text-gray-100 mr-12 border border-gray-800'
                  }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <span className="text-xs opacity-60 mt-2 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Products - Horizontal Scroll */}
              {message.products && message.products.length > 0 && (
                <div className="mr-12">
                  <div className="flex items-center space-x-2 mb-4">
                    <ShoppingBag className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-medium text-gray-300">
                      {message.imageAnalysis ? 'Style matches from your image' : 'Curated for your style'}
                    </h3>
                  </div>
                  {/* Horizontal scroll container */}
                  <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex space-x-4 pb-4" style={{ width: 'max-content' }}>
                      {message.products.map((product, index) => {
                        const productWithCategory = {
                          ...product,
                          category: product.category || inferProductCategory(product.title)
                        };
                        return (
                          <ProductCard 
                            key={index} 
                            product={productWithCategory}
                            showSimilarityScore={'similarity_score' in product}
                            similarityScore={'similarity_score' in product ? (product as OptimizedProduct).similarity_score : undefined}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Budget Optimizer */}
                  {message.showBudgetOptimizer && message.products && (
                    <div className="mt-6">
                      <BudgetOptimizer
                        products={message.products as OptimizedProduct[]}
                        budget={message.imageAnalysis?.budget}
                        onProductsUpdate={(updatedProducts) => handleProductsUpdate(message.id, updatedProducts)}
                      />
                    </div>
                  )}

                  {/* Style Document Toolbar - Always show when products exist and portfolioData is available */}
                  {message.portfolioData && (
                    <div className="mt-4">
                      <StyleDocumentToolbar
                        documents={message.styleDocuments || {}} // Pass empty object if no documents yet
                        portfolioData={message.portfolioData}
                        onDownloadDocument={handleDownloadDocument}
                        foxitService={foxitService}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {(isLoading || isGeneratingDocuments) && (
            <div className="flex justify-start">
              <div className="max-w-2xl p-4 rounded-2xl bg-gray-900 text-gray-100 mr-12 border border-gray-800">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  <span>
                    {isGeneratingDocuments
                      ? 'Creating your personalized style documents...'
                      : isAnalyzingImage
                      ? 'Analyzing your image and finding matching products...'
                      : 'Analyzing your style and finding perfect products...'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Document Error Display */}
          {documentError && (
            <div className="flex justify-start">
              <div className="max-w-2xl p-4 rounded-2xl bg-red-900/20 border border-red-700/50 text-red-200 mr-12">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm">
                    Document Generation Issue: {documentError}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={showImageUpload 
                  ? "Upload an image above or describe your style here..." 
                  : "Describe your style, what you're looking for, or the vibe you want to achieve..."
                }
                className="w-full p-4 pr-12 bg-gray-900 border border-gray-700 rounded-2xl 
                          text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 
                          focus:border-transparent resize-none min-h-[60px] max-h-32"
                rows={2}
                disabled={isLoading || isGeneratingDocuments || isAnalyzingImage}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isGeneratingDocuments || isAnalyzingImage}
              className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 
                        disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Document Generation Status */}
          {(isGeneratingDocuments || isAnalyzingImage) && (
            <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-gray-400">
              <Sparkles className="w-4 h-4" />
              <span>
                {isGeneratingDocuments 
                  ? 'Generating personalized style documentation...'
                  : 'Analyzing image and finding style matches...'
                }
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;