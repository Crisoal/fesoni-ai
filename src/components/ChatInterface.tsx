// src/components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ShoppingBag, FileText } from 'lucide-react';
import { OpenAIService, AnalysisResponse } from '../services/openaiService';
import { AmazonService, AmazonProduct } from '../services/amazonService';
import { FoxitService, StylePortfolioData } from '../services/foxitService';
import ProductCard from './ProductCard';
import DocumentPreview from './DocumentPreview';

// Define proper types for the style documents
interface StyleDocuments {
  mainDocument?: {
    documentId: string;
    downloadUrl: string;
    status: string;
  };
  processedDocuments?: Array<{
    type: string;
    downloadUrl: string;
    size?: number;
  }>;
  quickReference?: {
    documentId: string;
    downloadUrl: string;
    status: string;
  };
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm Fesoni, your AI shopping assistant. I'm here to understand your unique style and help you discover products that match your vibe. I'll also create personalized style documentation for you! Tell me about your style preferences, what you're looking for, or describe the aesthetic you're going for!",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDocuments, setIsGeneratingDocuments] = useState(false);
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
    
    try {
      // Prepare portfolio data
      const portfolioData: StylePortfolioData = {
        userPreferences: {
          aesthetics: styleAnalysis.styleAnalysis.aesthetics || [],
          productTypes: styleAnalysis.styleAnalysis.productTypes || [],
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
          userName: 'Valued Customer', // Could be enhanced with user data
          createdDate: new Date().toISOString(),
          season: getCurrentSeason(),
          occasion: styleAnalysis.styleAnalysis.lifestyle
        }
      };

      // Generate complete style package
      const stylePackage = await foxitService.createCompleteStylePackage(portfolioData);

      // Update the message with generated documents
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, styleDocuments: stylePackage }
          : msg
      ));

      // Add a follow-up message about the generated documents
      const documentMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "🎉 I've created your personalized style documentation! You now have:\n\n• **Complete Style Guide** - Your comprehensive style portfolio\n• **Quick Reference** - Essential picks for easy shopping\n• **Mobile-Optimized Version** - Perfect for on-the-go styling\n• **Social Media Images** - Share your style inspiration\n\nAll documents are tailored to your unique aesthetic preferences. Download them below to keep your style guide handy!",
        timestamp: new Date(),
        styleDocuments: stylePackage
      };

      setMessages(prev => [...prev, documentMessage]);

    } catch (error) {
      console.error('Document generation error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "I found great products for you, but I'm having trouble generating your style documents right now. The products above are still perfectly curated for your style! I'll try to create your personalized documentation in the next interaction.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGeneratingDocuments(false);
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
    <div className="flex flex-col h-screen bg-black dark:bg-black text-white">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-800 dark:border-gray-800">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Fesoni
          </h1>
          <span className="text-sm text-gray-400 dark:text-gray-400">Your AI Shopping Assistant</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div key={message.id} className="space-y-4">
              <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white ml-12'
                    : 'bg-gray-900 dark:bg-gray-900 text-gray-100 mr-12 border border-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <span className="text-xs opacity-60 mt-2 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Products */}
              {message.products && message.products.length > 0 && (
                <div className="mr-12">
                  <div className="flex items-center space-x-2 mb-4">
                    <ShoppingBag className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-medium text-gray-300">Curated for your style</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {message.products.slice(0, 6).map((product, index) => (
                      <ProductCard key={index} product={product} />
                    ))}
                  </div>
                </div>
              )}

              {/* Style Documents - Using DocumentPreview Component */}
              {message.styleDocuments && (
                <div className="mr-12">
                  <DocumentPreview documents={message.styleDocuments} />
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
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-6 border-t border-gray-800 dark:border-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your style, what you're looking for, or the vibe you want to achieve..."
                className="w-full p-4 pr-12 bg-gray-900 dark:bg-gray-900 border border-gray-700 rounded-2xl 
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