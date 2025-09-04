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

interface FoxitUploadResponse {
  documentId: string;
  message: string;
}

interface FoxitTaskResponse {
  taskId: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  downloadUrl?: string;
}

interface FoxitDocumentGenerationResponse {
  message: string;
  fileExtension: string;
  base64FileString: string;
}

interface DocumentInfo {
  documentId: string;
  password?: string;
}

interface CombineConfig {
  addBookmark?: boolean;
  continueMergeOnError?: boolean;
  retainPageNumbers?: boolean;
  addToc?: boolean;
  tocTitle?: string;
}

interface ExtractRequestBody {
  documentId: string;
  extractType: 'TEXT' | 'IMAGE' | 'PAGE';
  pageRange?: string;
}

interface ImageConversionRequestBody {
  documentId: string;
  config: {
    dpi: number;
  };
  pageRange?: string;
}

export class FoxitService {
  private baseUrl: string;
  private documentGenerationUrl: string;
  private pdfServicesUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    // Use proxy URLs in development, direct URLs in production
    const isDevelopment = import.meta.env.DEV;

    if (isDevelopment) {
      // Use Vite proxy in development
      this.documentGenerationUrl = '/api/foxit/document-generation';
      this.pdfServicesUrl = '/api/foxit/pdf-services';
      this.baseUrl = '/api/foxit'; // For backward compatibility
    } else {
      // Direct API calls in production (you'll need to handle CORS differently in production)
      this.documentGenerationUrl = 'https://na1.fusion.foxit.com/document-generation';
      this.pdfServicesUrl = 'https://na1.fusion.foxit.com/pdf-services';
      this.baseUrl = 'https://na1.fusion.foxit.com';
    }

    this.clientId = import.meta.env.VITE_FOXIT_CLIENT_ID;
    this.clientSecret = import.meta.env.VITE_FOXIT_CLIENT_SECRET;
  }

  private get authHeaders() {
    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'client_id': this.clientId,
      'client_secret': this.clientSecret,
    };
  }

  private get uploadHeaders() {
    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'client_id': this.clientId,
      'client_secret': this.clientSecret,
    };
  }

  /**
   * Upload a file to Foxit and get document ID
   */
  async uploadDocument(file: File | Blob, fileName: string = 'document.pdf'): Promise<FoxitUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file, fileName);

      const response = await fetch(`${this.pdfServicesUrl}/api/documents/upload`, {
        method: 'POST',
        headers: this.uploadHeaders,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload response:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Document upload error:', error);
      throw new Error('Failed to upload document to Foxit');
    }
  }

  /**
 * Generate a document from template using Document Generation API
 */
  async generateDocumentFromTemplate(
    templateBase64: string,
    documentValues: Record<string, unknown>,
    outputFormat: 'pdf' | 'docx' = 'pdf' // Changed to lowercase
  ): Promise<FoxitDocumentGenerationResponse> {
    try {
      const requestBody = {
        documentValues,
        base64FileString: templateBase64,
        outputFormat, // This will now be lowercase 'pdf' or 'docx'
        currencyCulture: 'en-US'
      };

      console.log('Making document generation request to:', `${this.documentGenerationUrl}/api/GenerateDocumentBase64`);

      const response = await fetch(`${this.documentGenerationUrl}/api/GenerateDocumentBase64`, {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Document generation response:', response.status, errorText);
        throw new Error(`Document generation failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Document generation error:', error);
      throw new Error('Failed to generate document from template');
    }
  }

  /**
   * Analyze a template document to extract tags
   */
  async analyzeTemplate(templateBase64: string): Promise<{
    singleTagsString: string[];
    doubleTagsString: string[];
  }> {
    try {
      const response = await fetch(`${this.documentGenerationUrl}/api/AnalyzeDocumentBase64`, {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify({
          base64FileString: templateBase64
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Template analysis response:', response.status, errorText);
        throw new Error(`Template analysis failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Template analysis error:', error);
      throw new Error('Failed to analyze template');
    }
  }

  /**
   * Compress a PDF document
   */
  async compressDocument(
    documentId: string,
    compressionLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
  ): Promise<FoxitTaskResponse> {
    try {
      const response = await fetch(`${this.pdfServicesUrl}/api/documents/modify/pdf-compress`, {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify({
          documentId,
          compressionLevel
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Compression response:', response.status, errorText);
        throw new Error(`Compression failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Document compression error:', error);
      throw new Error('Failed to compress document');
    }
  }

  /**
   * Split a PDF document into multiple files
   */
  async splitDocument(documentId: string, pageCount: number): Promise<FoxitTaskResponse> {
    try {
      const response = await fetch(`${this.pdfServicesUrl}/api/documents/modify/pdf-split`, {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify({
          documentId,
          pageCount
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Document split response:', response.status, errorText);
        throw new Error(`Document split failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Document split error:', error);
      throw new Error('Failed to split document');
    }
  }

  /**
   * Extract content from PDF (text, images, or pages)
   */
  async extractFromDocument(
    documentId: string,
    extractType: 'TEXT' | 'IMAGE' | 'PAGE',
    pageRange?: string
  ): Promise<FoxitTaskResponse> {
    try {
      const requestBody: ExtractRequestBody = {
        documentId,
        extractType
      };

      if (pageRange) {
        requestBody.pageRange = pageRange;
      }

      const response = await fetch(`${this.pdfServicesUrl}/api/documents/modify/pdf-extract`, {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Extraction response:', response.status, errorText);
        throw new Error(`Extraction failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Document extraction error:', error);
      throw new Error('Failed to extract from document');
    }
  }

  /**
   * Convert PDF pages to images
   */
  async convertToImages(
    documentId: string,
    pageRange?: string,
    dpi: number = 150
  ): Promise<FoxitTaskResponse> {
    try {
      const requestBody: ImageConversionRequestBody = {
        documentId,
        config: {
          dpi
        }
      };

      if (pageRange) {
        requestBody.pageRange = pageRange;
      }

      const response = await fetch(`${this.pdfServicesUrl}/api/documents/convert/pdf-to-image`, {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Image conversion response:', response.status, errorText);
        throw new Error(`Image conversion failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Image conversion error:', error);
      throw new Error('Failed to convert to images');
    }
  }

  /**
   * Combine multiple PDF documents
   */
  async combineDocuments(
    documentIds: string[],
    config?: CombineConfig
  ): Promise<FoxitTaskResponse> {
    try {
      const documentInfos: DocumentInfo[] = documentIds.map(id => ({
        documentId: id,
        password: '' // Empty for unsecured documents
      }));

      const response = await fetch(`${this.pdfServicesUrl}/api/documents/enhance/pdf-combine`, {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify({
          documentInfos,
          config: config || {
            addBookmark: true,
            continueMergeOnError: true,
            retainPageNumbers: false
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Document combine response:', response.status, errorText);
        throw new Error(`Document combine failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Document combine error:', error);
      throw new Error('Failed to combine documents');
    }
  }

  /**
   * Download a document by its ID
   */
  async downloadDocument(documentId: string, filename?: string): Promise<Blob> {
    try {
      const url = new URL(`${this.pdfServicesUrl}/api/documents/${documentId}/download`);
      if (filename) {
        url.searchParams.set('filename', filename);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'client_id': this.clientId,
          'client_secret': this.clientSecret,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download response:', response.status, errorText);
        throw new Error(`Download failed: ${response.status}`);
      }

      return await response.blob();

    } catch (error) {
      console.error('Document download error:', error);
      throw new Error('Failed to download document');
    }
  }

  /**
 * Create a style portfolio workflow using templates
 */
  async createStylePortfolio(portfolioData: StylePortfolioData): Promise<{
    mainDocument: string; // base64 string
    documentId?: string;
    processedVersions: Array<{
      type: string;
      taskId: string;
    }>;
  }> {
    try {
      console.log('Creating style portfolio...');

      // Get the template
      const templateBase64 = await this.getStyleTemplate();
      console.log('Template loaded successfully');

      // Debug: Analyze template to see what tags Foxit detects
      await this.debugTemplate();

      // Prepare data for template
      const templateData = this.prepareTemplateData(portfolioData);
      console.log('Template data prepared:', Object.keys(templateData));

      // Generate main document with lowercase format
      const generatedDoc = await this.generateDocumentFromTemplate(
        templateBase64,
        templateData,
        'pdf' // Changed to lowercase
      );
      console.log('Document generated successfully');

      // Initialize result with main document
      const result: {
        mainDocument: string;
        documentId?: string;
        processedVersions: Array<{ type: string; taskId: string }>;
      } = {
        mainDocument: generatedDoc.base64FileString,
        processedVersions: []
      };

      // Try to upload for additional processing (optional)
      try {
        const uploadedDoc = await this.uploadGeneratedDocument(generatedDoc.base64FileString);
        console.log('Document uploaded for processing:', uploadedDoc.documentId);

        result.documentId = uploadedDoc.documentId;

        // Create processed versions (non-blocking)
        const processingPromises = [];

        // Compressed version
        processingPromises.push(
          this.compressDocument(uploadedDoc.documentId, 'MEDIUM')
            .then(task => ({ type: 'compressed', taskId: task.taskId }))
            .catch(error => {
              console.warn('Compression task failed:', error);
              return null;
            })
        );

        // Convert to images for social sharing
        processingPromises.push(
          this.convertToImages(uploadedDoc.documentId, '1-3', 200)
            .then(task => ({ type: 'social-images', taskId: task.taskId }))
            .catch(error => {
              console.warn('Image conversion task failed:', error);
              return null;
            })
        );

        // Extract key pages
        processingPromises.push(
          this.extractFromDocument(uploadedDoc.documentId, 'PAGE', '1,2')
            .then(task => ({ type: 'quick-reference', taskId: task.taskId }))
            .catch(error => {
              console.warn('Page extraction task failed:', error);
              return null;
            })
        );

        const processedResults = await Promise.all(processingPromises);
        result.processedVersions = processedResults.filter(Boolean) as Array<{ type: string; taskId: string }>;

      } catch (uploadError) {
        console.warn('Document upload failed, but main document is available:', uploadError);
        // Continue without processed versions
      }

      return result;

    } catch (error) {
      console.error('Style portfolio creation error:', error);
      throw new Error(`Failed to create style portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Debug method to analyze template and see what tags Foxit detects
   */
  async debugTemplate(): Promise<void> {
    try {
      // Get the template
      const templateBase64 = await this.getStyleTemplate();

      // Analyze the template to see what tags Foxit finds
      const analysis = await this.analyzeTemplate(templateBase64);

      console.log('=== FOXIT TEMPLATE ANALYSIS ===');
      console.log('Single Tags Found:', analysis.singleTagsString);
      console.log('Double Tags Found:', analysis.doubleTagsString);
      console.log('===============================');

    } catch (error) {
      console.error('Template analysis failed:', error);
    }
  }

  /**
   * Helper method to upload a base64 document
   */
  private async uploadGeneratedDocument(base64String: string): Promise<FoxitUploadResponse> {
    // Convert base64 to blob
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    return this.uploadDocument(blob, 'generated-style-guide.pdf');
  }

  /**
 * Prepare data for document template - Reverted to string format
 */
  private prepareTemplateData(portfolioData: StylePortfolioData): Record<string, unknown> {
    const { userPreferences, products, metadata } = portfolioData;

    // Generate styling tips as formatted string instead of array
    const stylingTips = this.generateStylingTips(
      userPreferences.aesthetics,
      userPreferences.lifestyle
    );

    // Convert products to formatted text string (BACK TO ORIGINAL)
    const productList = products.slice(0, 10).map(product => {
      const title = product.title.length > 80
        ? product.title.substring(0, 77) + '...'
        : product.title;
      const price = product.price ? `$${product.price.toFixed(2)}` : 'Price varies';
      const category = product.category || 'Fashion';

      return `- ${title}
  Price: ${price} | Category: ${category}`;
    }).join('\n\n');

    // Convert styling tips to formatted text string (BACK TO ORIGINAL)
    const stylingTipsList = stylingTips.map(tip => `- ${tip}`).join('\n\n');

    // Generate color palette as readable string
    const colorPalette = this.generateColorPalette(userPreferences.aesthetics)
      .slice(0, 6)
      .join(' • ');

    const templateData = {
      // User info - simple strings only
      userName: metadata.userName || 'Style Enthusiast',
      createdDate: new Date(metadata.createdDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      season: metadata.season || 'Current Season',
      occasion: metadata.occasion || userPreferences.lifestyle || 'General',

      // Style preferences as simple strings
      aesthetics: userPreferences.aesthetics.join(' + '),
      lifestyle: userPreferences.lifestyle,
      budget: userPreferences.budget || 'Flexible',
      personalStyle: userPreferences.personalStyle || userPreferences.aesthetics.join(' + '),

      // Content as formatted strings (NOT arrays)
      productList: productList,
      stylingTipsList: stylingTipsList,
      colorPalette: colorPalette
    };

    console.log('Template data prepared with keys:', Object.keys(templateData));
    console.log('Product list preview:', productList.substring(0, 100) + '...');
    console.log('Styling tips preview:', stylingTipsList.substring(0, 100) + '...');

    return templateData;
  }

  /**
 * Get style template - loads pre-designed Word template as base64
 */
  private async getStyleTemplate(): Promise<string> {
    try {
      console.log('Loading Word template from assets...');
      const response = await fetch('/assets/templates/style-guide-template.docx');

      if (!response.ok) {
        throw new Error(`Template file not found: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      console.log('Successfully loaded Word template from assets');
      return base64;

    } catch (error) {
      console.error('Failed to load template from assets:', error);

      // Fallback to environment variable
      const templateFromEnv = import.meta.env.VITE_STYLE_TEMPLATE_BASE64;
      if (templateFromEnv) {
        console.log('Using template from environment variable');
        return templateFromEnv;
      }

      // Final error if no template is available
      throw new Error(`
      Template Loading Failed: Could not load style-guide-template.docx
      
      Please ensure:
      1. File exists at: public/assets/templates/style-guide-template.docx
      2. File is a valid Word document with Foxit text tags
      3. Development server has access to the public folder
      
      Error details: ${error instanceof Error ? error.message : 'Unknown error'}
    `);
    }
  }

  /**
 * Generate styling tips based on aesthetic preferences - Enhanced
 */
  private generateStylingTips(aesthetics: string[], lifestyle: string): string[] {
    const tipDatabase: { [key: string]: string[] } = {
      minimalist: [
        'Focus on clean lines and neutral colors',
        'Invest in quality basics that mix and match',
        'Choose pieces with simple, elegant silhouettes',
        'Less is more - select versatile, timeless items'
      ],
      cottagecore: [
        'Layer delicate fabrics and textures',
        'Embrace floral patterns and earthy tones',
        'Mix vintage pieces with modern comfort',
        'Choose natural fabrics like cotton and linen'
      ],
      'dark academia': [
        'Layer blazers over comfortable sweaters',
        'Incorporate rich textures like wool and tweed',
        'Focus on earth tones and deep, scholarly colors',
        'Add vintage accessories for authentic appeal'
      ],
      sleek: [
        'Choose streamlined silhouettes and modern cuts',
        'Stick to a cohesive color palette',
        'Invest in quality materials with smooth finishes',
        'Keep accessories minimal and functional'
      ],
      cute: [
        'Add playful details and soft textures',
        'Mix feminine touches with practical pieces',
        'Use pastel colors and gentle patterns',
        'Choose comfortable fits that flatter your shape'
      ],
      casual: [
        'Prioritize comfort without sacrificing style',
        'Mix and match versatile basics',
        'Add personality with fun accessories',
        'Choose breathable, easy-care fabrics'
      ],
      professional: [
        'Invest in well-tailored, classic pieces',
        'Stick to sophisticated color combinations',
        'Pay attention to fit and quality details',
        'Choose versatile pieces that work for multiple occasions'
      ]
    };

    const tips: string[] = [];

    // Add aesthetic-specific tips
    aesthetics.forEach(aesthetic => {
      const aestheticKey = aesthetic.toLowerCase();
      if (tipDatabase[aestheticKey]) {
        tips.push(...tipDatabase[aestheticKey].slice(0, 2)); // Max 2 tips per aesthetic
      }
    });

    // Add lifestyle-specific tips
    const lifestyleKey = lifestyle.toLowerCase();
    if (tipDatabase[lifestyleKey]) {
      tips.push(...tipDatabase[lifestyleKey].slice(0, 2));
    }

    // Generic styling tips if no specific ones found
    if (tips.length === 0) {
      tips.push(
        'Choose pieces that reflect your personal style',
        'Invest in quality over quantity',
        'Mix textures and patterns thoughtfully',
        'Ensure proper fit for the most flattering look'
      );
    }

    // Return max 6 tips to avoid overwhelming the document
    return [...new Set(tips)].slice(0, 6);
  }

  /**
 * Generate color palette based on aesthetics - Enhanced
 */
  private generateColorPalette(aesthetics: string[]): string[] {
    const colorPalettes: { [key: string]: string[] } = {
      minimalist: ['White', 'Light Gray', 'Charcoal', 'Black', 'Beige', 'Navy'],
      cottagecore: ['Cream', 'Sage Green', 'Dusty Rose', 'Warm Brown', 'Lavender', 'Soft Yellow'],
      'dark academia': ['Deep Brown', 'Forest Green', 'Burgundy', 'Cream', 'Navy', 'Charcoal'],
      sleek: ['Black', 'White', 'Silver', 'Deep Navy', 'Charcoal', 'Cool Gray'],
      cute: ['Soft Pink', 'Lavender', 'Mint Green', 'Cream', 'Peach', 'Light Blue'],
      bohemian: ['Terracotta', 'Mustard', 'Deep Teal', 'Rust', 'Sage', 'Cream'],
      modern: ['Black', 'White', 'Bold Red', 'Electric Blue', 'Bright Yellow', 'Deep Purple']
    };

    let palette = ['Black', 'White', 'Gray']; // Base neutral palette

    aesthetics.forEach(aesthetic => {
      const aestheticKey = aesthetic.toLowerCase();
      if (colorPalettes[aestheticKey]) {
        palette = [...palette, ...colorPalettes[aestheticKey]];
      }
    });

    // Remove duplicates and return unique colors
    return [...new Set(palette)].slice(0, 8);
  }
}