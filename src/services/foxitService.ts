// src/services/foxitService.ts

export interface StylePortfolioData {
  userPreferences: {
    aesthetics: string[];
    productTypes: string[];
    budget?: string;
    lifestyle: string;
    colors?: string[];
    personalStyle?: string;
  };
  products: Array<{
    product_id: string;
    title: string;
    url: string;
    image: string;
    price: number;
    category?: string;
  }>;
  metadata: {
    userName?: string;
    createdDate: string;
    season?: string;
    occasion?: string;
  };
}

interface DocumentTemplate {
  templateType: 'style-guide' | 'lookbook' | 'seasonal-guide' | 'quick-reference';
  title: string;
  sections: string[];
}

interface FoxitDocumentResponse {
  documentId: string;
  downloadUrl: string;
  status: 'success' | 'processing' | 'failed';
  processingTime?: number;
}

interface FoxitProcessingOptions {
  compress?: boolean;
  split?: boolean;
  extractPages?: number[];
  mergeWith?: string[];
  convertToImages?: boolean;
  optimizeForMobile?: boolean;
}

// Define the type for tip database
type TipDatabase = {
  [key: string]: string[];
};

// Define the type for color palettes
type ColorPalettes = {
  [key: string]: string[];
};

// Define the type for color map
type ColorMap = {
  [key: string]: string;
};

export class FoxitService {
  private apiKey: string;
  private baseUrl: string;
  private documentApiUrl: string;
  private pdfServicesUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_FOXIT_API_KEY;
    this.baseUrl = import.meta.env.VITE_FOXIT_BASE_URL || 'https://api.foxitsoftware.com';
    this.documentApiUrl = `${this.baseUrl}/document-generation/v1`;
    this.pdfServicesUrl = `${this.baseUrl}/pdf-services/v1`;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Generate a comprehensive style portfolio document
   */
  async generateStylePortfolio(
    portfolioData: StylePortfolioData,
    templateType: DocumentTemplate['templateType'] = 'style-guide'
  ): Promise<FoxitDocumentResponse> {
    try {
      const template = this.getDocumentTemplate(templateType);
      const documentContent = this.buildDocumentContent(portfolioData, template);

      const requestBody = {
        template: {
          type: templateType,
          title: template.title,
          branding: {
            primaryColor: this.getStyleColor(portfolioData.userPreferences.aesthetics),
            logoUrl: null, // Could add Fesoni branding
            theme: this.getDocumentTheme(portfolioData.userPreferences.aesthetics)
          }
        },
        content: documentContent,
        options: {
          format: 'pdf',
          quality: 'high',
          includeImages: true,
          generateThumbnails: true
        }
      };

      const response = await fetch(`${this.documentApiUrl}/generate`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Foxit Document Generation error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        documentId: result.documentId,
        downloadUrl: result.downloadUrl,
        status: result.status || 'success',
        processingTime: result.processingTime
      };

    } catch (error) {
      console.error('Foxit document generation error:', error);
      throw new Error('Failed to generate style portfolio');
    }
  }

  /**
   * Process and optimize generated documents
   */
  async processDocument(
    documentId: string,
    options: FoxitProcessingOptions = {}
  ): Promise<{
    processedDocuments: Array<{
      type: string;
      downloadUrl: string;
      size?: number;
    }>;
  }> {
    try {
      const processingTasks = [];

      // Compression for mobile sharing
      if (options.compress || options.optimizeForMobile) {
        processingTasks.push(this.compressDocument(documentId, options.optimizeForMobile));
      }

      // Split document into sections
      if (options.split) {
        processingTasks.push(this.splitDocument(documentId));
      }

      // Extract specific pages
      if (options.extractPages && options.extractPages.length > 0) {
        processingTasks.push(this.extractPages(documentId, options.extractPages));
      }

      // Convert to images for social sharing
      if (options.convertToImages) {
        processingTasks.push(this.convertToImages(documentId));
      }

      // Merge with additional content
      if (options.mergeWith && options.mergeWith.length > 0) {
        processingTasks.push(this.mergeDocuments(documentId, options.mergeWith));
      }

      const results = await Promise.allSettled(processingTasks);
      const processedDocuments: Array<{
        type: string;
        downloadUrl: string;
        size?: number;
      }> = [];
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const value = result.value;
          if (Array.isArray(value)) {
            processedDocuments.push(...value);
          } else {
            processedDocuments.push(value);
          }
        }
      });

      return { processedDocuments };

    } catch (error) {
      console.error('Foxit document processing error:', error);
      throw new Error('Failed to process document');
    }
  }

  /**
   * Create a complete style package workflow
   */
  async createCompleteStylePackage(portfolioData: StylePortfolioData): Promise<{
    mainDocument: FoxitDocumentResponse;
    processedDocuments: Array<{
      type: string;
      downloadUrl: string;
      size?: number;
    }>;
    quickReference: FoxitDocumentResponse;
  }> {
    try {
      // Generate main style guide
      const mainDocument = await this.generateStylePortfolio(portfolioData, 'style-guide');
      
      // Generate quick reference guide
      const quickReferenceData = {
        ...portfolioData,
        products: portfolioData.products.slice(0, 6) // Limit to top picks
      };
      const quickReference = await this.generateStylePortfolio(
        quickReferenceData, 
        'quick-reference'
      );

      // Process main document with multiple optimizations
      const processedResults = await this.processDocument(mainDocument.documentId, {
        compress: true,
        optimizeForMobile: true,
        extractPages: [1, 2], // Extract cover and summary pages
        convertToImages: true,
        split: true
      });

      return {
        mainDocument,
        processedDocuments: processedResults.processedDocuments,
        quickReference
      };

    } catch (error) {
      console.error('Complete style package creation error:', error);
      throw new Error('Failed to create complete style package');
    }
  }

  /**
   * Compress document for mobile and web sharing
   */
  private async compressDocument(documentId: string, optimizeForMobile: boolean = false): Promise<{
    type: string;
    downloadUrl: string;
    size: number;
  }> {
    const compressionLevel = optimizeForMobile ? 'high' : 'medium';
    
    const response = await fetch(`${this.pdfServicesUrl}/compress`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        documentId,
        options: {
          compressionLevel,
          optimizeForWeb: true,
          maintainQuality: !optimizeForMobile
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Compression failed: ${response.status}`);
    }

    const result = await response.json();
    return {
      type: optimizeForMobile ? 'mobile-optimized' : 'compressed',
      downloadUrl: result.downloadUrl,
      size: result.fileSize
    };
  }

  /**
   * Split document into focused sections
   */
  private async splitDocument(documentId: string): Promise<Array<{
    type: string;
    downloadUrl: string;
  }>> {
    const response = await fetch(`${this.pdfServicesUrl}/split`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        documentId,
        splitOptions: {
          splitBy: 'section',
          preserveBookmarks: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Document split failed: ${response.status}`);
    }

    const result = await response.json();
    return result.documents.map((doc: { downloadUrl: string }, index: number) => ({
      type: `section-${index + 1}`,
      downloadUrl: doc.downloadUrl
    }));
  }

  /**
   * Extract specific pages for quick reference
   */
  private async extractPages(documentId: string, pages: number[]): Promise<{
    type: string;
    downloadUrl: string;
  }> {
    const response = await fetch(`${this.pdfServicesUrl}/extract-pages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        documentId,
        pages: pages
      }),
    });

    if (!response.ok) {
      throw new Error(`Page extraction failed: ${response.status}`);
    }

    const result = await response.json();
    return {
      type: 'quick-reference-pages',
      downloadUrl: result.downloadUrl
    };
  }

  /**
   * Convert document pages to images for social sharing
   */
  private async convertToImages(documentId: string): Promise<Array<{
    type: string;
    downloadUrl: string;
  }>> {
    const response = await fetch(`${this.pdfServicesUrl}/convert-to-images`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        documentId,
        options: {
          format: 'png',
          resolution: 300,
          maxPages: 3 // Limit for social sharing
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Image conversion failed: ${response.status}`);
    }

    const result = await response.json();
    return result.images.map((img: { downloadUrl: string }, index: number) => ({
      type: `social-image-${index + 1}`,
      downloadUrl: img.downloadUrl
    }));
  }

  /**
   * Merge documents for comprehensive packages
   */
  private async mergeDocuments(documentId: string, additionalDocumentIds: string[]): Promise<{
    type: string;
    downloadUrl: string;
  }> {
    const response = await fetch(`${this.pdfServicesUrl}/merge`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        documentIds: [documentId, ...additionalDocumentIds],
        options: {
          preserveBookmarks: true,
          addPageNumbers: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Document merge failed: ${response.status}`);
    }

    const result = await response.json();
    return {
      type: 'merged-comprehensive-guide',
      downloadUrl: result.downloadUrl
    };
  }

  /**
   * Build document content from portfolio data
   */
  private buildDocumentContent(data: StylePortfolioData, template: DocumentTemplate) {
    const { userPreferences, products, metadata } = data;

    return {
      title: template.title,
      subtitle: `Curated by Fesoni for ${metadata.userName || 'You'}`,
      sections: [
        {
          type: 'cover',
          title: template.title,
          subtitle: `Your personalized ${userPreferences.lifestyle} style guide`,
          date: metadata.createdDate
        },
        {
          type: 'style-summary',
          title: 'Your Style Profile',
          content: {
            aesthetics: userPreferences.aesthetics,
            lifestyle: userPreferences.lifestyle,
            budget: userPreferences.budget,
            keyWords: [...userPreferences.aesthetics, userPreferences.lifestyle]
          }
        },
        {
          type: 'product-showcase',
          title: 'Curated Products',
          products: products.map(product => ({
            name: product.title,
            price: product.price,
            image: product.image,
            url: product.url,
            category: product.category || 'Fashion'
          }))
        },
        {
          type: 'styling-tips',
          title: 'How to Style',
          tips: this.generateStylingTips(userPreferences.aesthetics, userPreferences.lifestyle)
        },
        {
          type: 'color-palette',
          title: 'Your Color Palette',
          colors: this.generateColorPalette(userPreferences.aesthetics)
        }
      ]
    };
  }

  /**
   * Get document template configuration
   */
  private getDocumentTemplate(templateType: DocumentTemplate['templateType']): DocumentTemplate {
    const templates = {
      'style-guide': {
        templateType: 'style-guide' as const,
        title: 'Personal Style Guide',
        sections: ['cover', 'style-summary', 'product-showcase', 'styling-tips', 'color-palette']
      },
      'lookbook': {
        templateType: 'lookbook' as const,
        title: 'Style Lookbook',
        sections: ['cover', 'outfit-combinations', 'product-showcase', 'inspiration']
      },
      'seasonal-guide': {
        templateType: 'seasonal-guide' as const,
        title: 'Seasonal Style Guide',
        sections: ['cover', 'seasonal-trends', 'product-showcase', 'transition-pieces']
      },
      'quick-reference': {
        templateType: 'quick-reference' as const,
        title: 'Style Quick Reference',
        sections: ['essentials', 'top-picks', 'color-guide']
      }
    };

    return templates[templateType];
  }

  /**
   * Generate styling tips based on aesthetic preferences
   */
  private generateStylingTips(aesthetics: string[], lifestyle: string): string[] {
    const tipDatabase: TipDatabase = {
      minimalist: ['Focus on clean lines and neutral colors', 'Invest in quality basics', 'Less is more - choose versatile pieces'],
      cottagecore: ['Layer delicate fabrics', 'Embrace floral patterns', 'Mix vintage with modern pieces'],
      'dark academia': ['Layer blazers over sweaters', 'Incorporate rich textures', 'Focus on earth tones and deep colors'],
      casual: ['Prioritize comfort and flexibility', 'Mix and match basics', 'Add personality with accessories'],
      professional: ['Invest in tailored pieces', 'Stick to classic cuts', 'Pay attention to fit and details']
    };

    const tips: string[] = [];
    aesthetics.forEach(aesthetic => {
      if (tipDatabase[aesthetic]) {
        tips.push(...tipDatabase[aesthetic]);
      }
    });

    if (tipDatabase[lifestyle]) {
      tips.push(...tipDatabase[lifestyle]);
    }

    return tips.slice(0, 6); // Limit to 6 tips
  }

  /**
   * Generate color palette based on aesthetics
   */
  private generateColorPalette(aesthetics: string[]): string[] {
    const colorPalettes: ColorPalettes = {
      minimalist: ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#9E9E9E', '#424242', '#212121'],
      cottagecore: ['#F8F6F0', '#E8DCC6', '#C8AD7F', '#8B7355', '#6B5B73', '#A0522D'],
      'dark academia': ['#2F1B14', '#8B4513', '#CD853F', '#F4A460', '#DEB887', '#D2B48C'],
      bohemian: ['#D4A574', '#C19A6B', '#8B7355', '#6B4423', '#A0522D', '#CD853F'],
      modern: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
    };

    let palette = ['#000000', '#FFFFFF', '#808080']; // Default colors
    
    aesthetics.forEach(aesthetic => {
      if (colorPalettes[aesthetic]) {
        palette = [...palette, ...colorPalettes[aesthetic]];
      }
    });

    return [...new Set(palette)].slice(0, 8); // Remove duplicates and limit to 8 colors
  }

  /**
   * Get primary color for document theming
   */
  private getStyleColor(aesthetics: string[]): string {
    const colorMap: ColorMap = {
      minimalist: '#2C3E50',
      cottagecore: '#8B7355',
      'dark academia': '#8B4513',
      bohemian: '#D4A574',
      modern: '#4ECDC4',
      professional: '#2C3E50'
    };

    return colorMap[aesthetics[0]] || '#2C3E50';
  }

  /**
   * Get document theme based on aesthetics
   */
  private getDocumentTheme(aesthetics: string[]): string {
    if (aesthetics.includes('minimalist')) return 'clean';
    if (aesthetics.includes('cottagecore')) return 'vintage';
    if (aesthetics.includes('dark academia')) return 'classic';
    if (aesthetics.includes('modern')) return 'contemporary';
    return 'elegant';
  }
}