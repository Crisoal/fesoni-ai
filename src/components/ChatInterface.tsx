// src/components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ShoppingBag, FileText, AlertCircle } from 'lucide-react';
import { OpenAIService, AnalysisResponse } from '../services/openaiService';
import { AmazonService, AmazonProduct } from '../services/amazonService';
import { FoxitService, StylePortfolioData } from '../services/foxitService';
import ProductCard from './ProductCard';
import DocumentPreview from './DocumentPreview';

// Updated interface to match the real Foxit API structure
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
  products?: AmazonProduct[];
  styleDocuments?: StyleDocuments;
}

const ChatInterface: React.FC = () => {
  // Removed the default welcome message from initial state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDocuments, setIsGeneratingDocuments] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const openaiService = new OpenAIService();
  const amazonService = new AmazonService();
  const foxitService = new FoxitService();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      // Analyze style preferences with OpenAI
      const styleAnalysis = await openaiService.analyzeStylePreferences(inputValue);

      // Search for products if style analysis indicates specific needs
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

      // Generate AI response
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

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        products: products.length > 0 ? products : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Generate style documents if we have sufficient data
      if (products.length > 0 && styleAnalysis.styleAnalysis.aesthetics && styleAnalysis.styleAnalysis.aesthetics.length > 0) {
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

      // Prepare portfolio data with better validation
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
          category: inferProductCategory(product.title)
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

      // Generate style portfolio using the updated Foxit service
      const stylePortfolio = await foxitService.createStylePortfolio(portfolioData);

      console.log('Style portfolio generated successfully:', {
        hasMainDocument: !!stylePortfolio.mainDocument,
        documentId: stylePortfolio.documentId,
        processedVersionsCount: stylePortfolio.processedVersions.length
      });

      // Create the document structure
      const styleDocuments: StyleDocuments = {
        mainDocument: stylePortfolio.mainDocument,
        documentId: stylePortfolio.documentId,
        processedVersions: stylePortfolio.processedVersions.map(version => ({
          ...version,
          status: 'processing' as const
        }))
      };

      // Update the message with generated documents
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, styleDocuments }
          : msg
      ));

      // Add a success message about the generated documents
      const documentMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Perfect! I've created your personalized style documentation based on your ${portfolioData.userPreferences.aesthetics.join(' + ')} aesthetic. Here's what I've generated:\n\n✨ **Complete Style Guide** - Your comprehensive style portfolio (ready now)\n📱 **Compressed Version** - Smaller file for easy sharing (processing...)\n📸 **Social Media Images** - Perfect for sharing your style inspiration (processing...)\n⚡ **Quick Reference Pages** - Key pages for fast outfit decisions (processing...)\n\nYour main style guide includes ${portfolioData.products.length} curated products, personalized styling tips, and a custom color palette. Download it now to start building your perfect wardrobe!`,
        timestamp: new Date(),
        styleDocuments
      };

      setMessages(prev => [...prev, documentMessage]);

      // Poll for processing status updates if we have processed versions
      if (styleDocuments.processedVersions && styleDocuments.processedVersions.length > 0) {
        await pollProcessingStatus(styleDocuments, documentMessage.id);
      }

    } catch (error) {
      console.error('Document generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setDocumentError(errorMessage);

      // Provide specific error feedback based on error type
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

  // Update the pollProcessingStatus method:
  const pollProcessingStatus = async (documents: StyleDocuments, messageId: string) => {
    if (!documents.processedVersions) return;

    const pollInterval = setInterval(async () => {
      try {
        let allCompleted = true;
        const updatedVersions = await Promise.all(
          documents.processedVersions!.map(async (version) => {
            if (version.status === 'processing') {
              try {
                // Use the real Foxit task status API
                const taskStatus = await foxitService.checkTaskStatus(version.taskId);

                if (taskStatus.status === 'completed') {
                  return {
                    ...version,
                    status: 'completed' as const,
                    downloadUrl: taskStatus.downloadUrl || `${foxitService.pdfServicesUrl}/api/documents/${taskStatus.documentId}/download`,
                    size: undefined // Size will be determined when downloaded
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
                // Keep as processing, will retry on next poll
                allCompleted = false;
                return version;
              }
            }
            return version;
          })
        );

        // Update the message with new status
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

          // Count successful completions
          const completedTasks = updatedVersions.filter(v => v.status === 'completed').length;
          const failedTasks = updatedVersions.filter(v => v.status === 'failed').length;

          let completionMessage = '';
          if (completedTasks > 0 && failedTasks === 0) {
            completionMessage = "All your style documents are now ready! You can download the compressed version for easy sharing, grab the social media images to post your style inspiration, or use the quick reference pages for fast outfit planning.";
          } else if (completedTasks > 0 && failedTasks > 0) {
            completionMessage = `${completedTasks} of your style documents are ready for download! ${failedTasks} processing task(s) encountered issues, but your main document and other versions are available.`;
          } else {
            completionMessage = "Your main style document is ready! Some additional processing tasks encountered issues, but you can still download and use your personalized style guide.";
          }

          const completionMsg: Message = {
            id: (Date.now() + 3).toString(),
            role: 'assistant',
            content: completionMessage,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, completionMsg]);
        }

      } catch (error) {
        console.error('Status polling error:', error);
        clearInterval(pollInterval);

        // Add error message but don't fail completely
        const errorMsg: Message = {
          id: (Date.now() + 4).toString(),
          role: 'assistant',
          content: "I encountered an issue checking the status of your additional document versions. Your main style guide is still available for download, and I'll continue helping you with your style needs!",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    }, 5000); // Poll every 5 seconds (reasonable interval)

    // Stop polling after 5 minutes to avoid infinite polling
    setTimeout(() => {
      clearInterval(pollInterval);

      // Check if there are still processing tasks and notify user
      setMessages(prev => {
        const currentMsg = prev.find(msg => msg.id === messageId);
        if (currentMsg?.styleDocuments?.processedVersions?.some(v => v.status === 'processing')) {
          const timeoutMsg: Message = {
            id: (Date.now() + 5).toString(),
            role: 'assistant',
            content: "Some document processing tasks are taking longer than expected. Your main style guide is ready, and completed versions are available for download. You can continue with your styling or ask me any questions!",
            timestamp: new Date(),
          };
          return [...prev, timeoutMsg];
        }
        return prev;
      });
    }, 300000); // 5 minutes timeout
  };

  // Update the handleDownloadDocument method in ChatInterface.tsx:
  const handleDownloadDocument = async (documentIdOrUrl: string, filename?: string): Promise<Blob> => {
    try {
      console.log(`Attempting to download: ${documentIdOrUrl}`);

      // Use the Foxit service download method which handles both URLs and document IDs
      return await foxitService.downloadDocument(documentIdOrUrl, filename);

    } catch (error) {
      console.error('Download error:', error);

      // Provide user-friendly error message
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

  // Update the handleCheckTaskStatus method:
  const handleCheckTaskStatus = async (taskId: string) => {
    try {
      const taskStatus = await foxitService.checkTaskStatus(taskId);
      return {
        status: taskStatus.status,
        downloadUrl: taskStatus.downloadUrl ||
          (taskStatus.documentId ? `${foxitService.pdfServicesUrl}/api/documents/${taskStatus.documentId}/download` : undefined)
      };
    } catch (error) {
      console.error('Task status check error:', error);
      return {
        status: 'failed' as const
      };
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
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Display welcome message only when there are no messages */}
          {messages.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-2xl p-4 rounded-2xl bg-gray-900 text-gray-100 mr-12 border border-gray-800">
                <p className="whitespace-pre-wrap leading-relaxed">
                  Hi! I'm Fesoni, your AI shopping assistant. I'm here to understand your unique style and help you discover products that match your vibe. I'll also create personalized style documentation for you! Tell me about your style preferences, what you're looking for, or describe the aesthetic you're going for!
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
                    <h3 className="text-sm font-medium text-gray-300">Curated for your style</h3>
                  </div>
                  {/* Horizontal scroll container */}
                  <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex space-x-4 pb-4" style={{ width: 'max-content' }}>
                      {message.products.map((product, index) => {
                        // Add category to product if not present
                        const productWithCategory = {
                          ...product,
                          category: product.category || inferProductCategory(product.title)
                        };
                        return (
                          <ProductCard key={index} product={productWithCategory} />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Style Documents */}
              {message.styleDocuments && (
                <div className="mr-12">
                  <DocumentPreview
                    documents={message.styleDocuments}
                    onDownloadDocument={handleDownloadDocument}
                    onCheckTaskStatus={handleCheckTaskStatus}
                  />
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
                placeholder="Describe your style, what you're looking for, or the vibe you want to achieve..."
                className="w-full p-4 pr-12 bg-gray-900 border border-gray-700 rounded-2xl 
                          text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 
                          focus:border-transparent resize-none min-h-[60px] max-h-32"
                rows={2}
                disabled={isLoading || isGeneratingDocuments}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isGeneratingDocuments}
              className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 
                        disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Document Generation Status */}
          {isGeneratingDocuments && (
            <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-gray-400">
              <FileText className="w-4 h-4" />
              <span>Generating personalized style documentation...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;