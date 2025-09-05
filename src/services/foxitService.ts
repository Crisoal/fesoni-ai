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
    brand?: string;
    rating?: number;
    reviews?: number;
    prime?: boolean;
    retail_price?: number;
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

interface TaskStatusResponse {
  taskId: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  downloadUrl?: string;
  documentId?: string;
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
  public baseUrl: string;
  public documentGenerationUrl: string;
  public pdfServicesUrl: string;
  private clientId: string;
  private clientSecret: string;
  private currentAesthetics: string = '';

  constructor() {
    const isDevelopment = import.meta.env.DEV;

    if (isDevelopment) {
      this.documentGenerationUrl = '/api/foxit/document-generation';
      this.pdfServicesUrl = '/api/foxit/pdf-services';
      this.baseUrl = '/api/foxit';
    } else {
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

  async generateDocumentFromTemplate(
    templateBase64: string,
    documentValues: Record<string, unknown>,
    outputFormat: 'pdf' | 'docx' = 'pdf'
  ): Promise<FoxitDocumentGenerationResponse> {
    try {
      // Process hyperlinks in the document values
      const processedValues = this.processHyperlinksInData(documentValues);
      
      const requestBody = {
        documentValues: processedValues,
        base64FileString: templateBase64,
        outputFormat,
        currencyCulture: 'en-US',
        // Enable hyperlink processing
        preserveHyperlinks: true
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

  private processHyperlinksInData(data: Record<string, unknown>): Record<string, unknown> {
    const processed: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Convert HYPERLINK patterns to proper Word hyperlink format
        processed[key] = value.replace(
          /HYPERLINK "([^"]+)" "([^"]+)"/g,
          '<w:hyperlink r:id="rId_$1"><w:r><w:t>$2</w:t></w:r></w:hyperlink>'
        );
      } else {
        processed[key] = value;
      }
    }
    
    return processed;
  }

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

  async combineDocuments(
    documentIds: string[],
    config?: CombineConfig
  ): Promise<FoxitTaskResponse> {
    try {
      const documentInfos: DocumentInfo[] = documentIds.map(id => ({
        documentId: id,
        password: ''
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

  async downloadDocument(documentIdOrUrl: string, filename?: string): Promise<Blob> {
    try {
      let url: string;

      if (documentIdOrUrl.startsWith('http') || documentIdOrUrl.includes('/api/foxit/')) {
        url = documentIdOrUrl;
        if (filename && !url.includes('filename=')) {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}filename=${encodeURIComponent(filename)}`;
        }
      } else {
        url = `${this.pdfServicesUrl}/api/documents/${documentIdOrUrl}/download`;
        if (filename) {
          const params = new URLSearchParams({ filename });
          url = `${url}?${params.toString()}`;
        }
      }

      console.log(`Downloading document from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
          'client_id': this.clientId,
          'client_secret': this.clientSecret,
          'Accept': 'application/octet-stream, application/pdf, */*',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download response:', response.status, errorText);

        if (response.status === 404) {
          throw new Error('Document not found or has expired (24-hour retention)');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed - check API credentials');
        } else if (response.status === 500) {
          throw new Error('Server error - document may not be ready for download yet');
        } else {
          throw new Error(`Download failed: ${response.status} - ${errorText}`);
        }
      }

      return await response.blob();

    } catch (error) {
      console.error('Document download error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to download document');
    }
  }

  async createStylePortfolio(portfolioData: StylePortfolioData): Promise<{
    mainDocument: string;
    documentId?: string;
    processedVersions: Array<{
      type: string;
      taskId: string;
    }>;
  }> {
    try {
      console.log('Creating style portfolio...');

      const templateBase64 = await this.getTemplate('comprehensive-style-guide-template.docx');
      console.log('Comprehensive template loaded successfully');

      await this.debugTemplate(templateBase64);

      const templateData = this.prepareTemplateData(portfolioData);
      console.log('Template data prepared:', Object.keys(templateData));

      // Generate both PDF and DOCX versions for better formatting options
      const generatedDoc = await this.generateDocumentFromTemplate(
        templateBase64,
        templateData,
        'pdf'
      );
      console.log('Document generated successfully');

      // Also generate a DOCX version for better hyperlink support
      const generatedDocx = await this.generateDocumentFromTemplate(
        templateBase64,
        templateData,
        'docx'
      );
      console.log('DOCX version generated successfully');

      const result: {
        mainDocument: string;
        documentId?: string;
        docxVersion?: string;
        processedVersions: Array<{ type: string; taskId: string }>;
      } = {
        mainDocument: generatedDoc.base64FileString,
        docxVersion: generatedDocx.base64FileString,
        processedVersions: []
      };

      try {
        const uploadedDoc = await this.uploadGeneratedDocument(generatedDoc.base64FileString);
        console.log('Document uploaded for processing:', uploadedDoc.documentId);

        result.documentId = uploadedDoc.documentId;

        // Also upload the DOCX version
        const uploadedDocx = await this.uploadGeneratedDocument(generatedDocx.base64FileString, 'docx');
        console.log('DOCX version uploaded:', uploadedDocx.documentId);

        const processingPromises = [];

        processingPromises.push(
          this.compressDocument(uploadedDoc.documentId, 'MEDIUM')
            .then(task => ({ type: 'compressed', taskId: task.taskId }))
            .catch(error => {
              console.warn('Compression task failed:', error);
              return null;
            })
        );

        processingPromises.push(
          this.convertToImages(uploadedDoc.documentId, '1-3', 200)
            .then(task => ({ type: 'social-images', taskId: task.taskId }))
            .catch(error => {
              console.warn('Image conversion task failed:', error);
              return null;
            })
        );

        processingPromises.push(
          this.extractFromDocument(uploadedDoc.documentId, 'PAGE', '1,2')
            .then(task => ({ type: 'quick-reference', taskId: task.taskId }))
            .catch(error => {
              console.warn('Page extraction task failed:', error);
              return null;
            })
        );

        // Add DOCX download option
        processingPromises.push(
          Promise.resolve({ type: 'docx-version', taskId: uploadedDocx.documentId })
        );

        const processedResults = await Promise.all(processingPromises);
        result.processedVersions = processedResults.filter(Boolean) as Array<{ type: string; taskId: string }>;

      } catch (uploadError) {
        console.warn('Document upload failed, but main document is available:', uploadError);
      }

      return result;

    } catch (error) {
      console.error('Style portfolio creation error:', error);
      throw new Error(`Failed to create style portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async debugTemplate(templateBase64?: string): Promise<void> {
    try {
      const template = templateBase64 || await this.getTemplate('comprehensive-style-guide-template.docx');
      const analysis = await this.analyzeTemplate(template);

      console.log('=== FOXIT TEMPLATE ANALYSIS ===');
      console.log('Single Tags Found:', analysis.singleTagsString);
      console.log('Double Tags Found:', analysis.doubleTagsString);
      console.log('===============================');

    } catch (error) {
      console.error('Template analysis failed:', error);
    }
  }

  private async uploadGeneratedDocument(base64String: string, format: 'pdf' | 'docx' = 'pdf'): Promise<FoxitUploadResponse> {
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const mimeType = format === 'docx' 
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf';
    const blob = new Blob([byteArray], { type: mimeType });

    const fileName = format === 'docx' 
      ? 'generated-style-guide.docx'
      : 'generated-style-guide.pdf';
    
    return this.uploadDocument(blob, fileName);
  }

  private prepareTemplateData(portfolioData: StylePortfolioData): Record<string, unknown> {
    const { userPreferences, products, metadata } = portfolioData;

    // Store current aesthetics for category intros
    this.currentAesthetics = userPreferences.aesthetics.join(' + ');

    // Group products by category for organized display
    const productsByCategory = this.groupProductsByCategory(products);

    // Generate enhanced product sections
    const productSections: Record<string, string> = {};
    Object.entries(productsByCategory).forEach(([category, categoryProducts]) => {
      const categoryKey = category.toLowerCase().replace(/\s+/g, '');
      productSections[`${categoryKey}Products`] = this.generateFormattedCategorySection(categoryProducts, category);
    });

    const stylingTips = this.generateStylingTips(
      userPreferences.aesthetics,
      userPreferences.lifestyle
    );

    const colorPalette = this.generateColorPalette(userPreferences.aesthetics)
      .slice(0, 6)
      .join(' • ');

    // Generate formatted product list with proper hyperlinks
    const formattedProductList = this.generateFormattedProductList(products);

    const templateData = {
      // User info
      userName: metadata.userName || 'Style Enthusiast',
      createdDate: new Date(metadata.createdDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      season: metadata.season || 'Current Season',
      occasion: metadata.occasion || userPreferences.lifestyle || 'General',

      // Style preferences
      aesthetics: userPreferences.aesthetics.join(' + '),
      lifestyle: userPreferences.lifestyle,
      budget: userPreferences.budget || 'Flexible',
      personalStyle: userPreferences.personalStyle || userPreferences.aesthetics.join(' + '),

      // Product content organized by category
      ...productSections,

      // Complete product list
      productList: formattedProductList,

      // Styling content
      stylingTipsList: stylingTips.map(tip => `• ${tip}`).join('\n\n'),
      colorPalette: colorPalette,

      // Statistics
      totalProducts: products.length,
      categoriesCount: Object.keys(productsByCategory).length,
      averagePrice: this.calculateAveragePrice(products),
      primeEligible: products.filter(p => p.prime).length,
      categorySummary: Object.entries(productsByCategory)
        .map(([category, products]) => `${category}: ${products.length} items`)
        .join(' | '),

      // Additional template content placeholders
      contentTitle: 'Additional Style Content',
      mainContent: 'Content will be dynamically generated based on merge type',
      integrationTips: 'Styling integration tips will be generated contextually'
    };

    console.log('Template data prepared with keys:', Object.keys(templateData));
    console.log('Product categories:', Object.keys(productsByCategory));

    return templateData;
  }

  private groupProductsByCategory(products: StylePortfolioData['products']): Record<string, StylePortfolioData['products']> {
    const grouped: Record<string, StylePortfolioData['products']> = {};

    products.forEach(product => {
      const category = product.category || 'Fashion';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });

    return grouped;
  }

  private generateCategorySection(products: StylePortfolioData['products'], category: string): string {
    if (products.length === 0) {
      return `No ${category.toLowerCase()} items found in your current selection.
      
Try refining your search or exploring different brands to find perfect ${category.toLowerCase()} pieces for your ${this.currentAesthetics} aesthetic.`;
    }

    const categoryIntro = this.getCategoryIntro(category, products.length);
    const productList = products.map(product => this.formatProductForDocument(product)).join('\n');

    return `${categoryIntro}\n\n${productList}`;
  }

  private generateFormattedCategorySection(products: StylePortfolioData['products'], category: string): string {
    if (products.length === 0) {
      return `No ${category.toLowerCase()} items found in your current selection.
      
Try refining your search or exploring different brands to find perfect ${category.toLowerCase()} pieces for your ${this.currentAesthetics} aesthetic.`;
    }

    const categoryIntro = this.getCategoryIntro(category, products.length);
    const productList = this.generateFormattedProductList(products);

    return `${categoryIntro}\n\n${productList}`;
  }

  private generateFormattedProductList(products: StylePortfolioData['products']): string {
    return products.map((product, index) => {
      const title = product.title.length > 80 
        ? product.title.substring(0, 77) + '...' 
        : product.title;

      const price = product.price ? `$${product.price.toFixed(2)}` : 'Price varies';
      const originalPrice = product.retail_price && product.retail_price > product.price
        ? ` (was $${product.retail_price.toFixed(2)})`
        : '';

      const rating = product.rating ? `${product.rating.toFixed(1)}/5 stars` : '';
      const reviews = product.reviews ? `(${product.reviews.toLocaleString()} reviews)` : '';
      const brand = product.brand ? `by ${product.brand}` : '';
      const prime = product.prime ? 'Prime Eligible' : '';

      // Create formatted product entry
      let productEntry = `${index + 1}. ${title}`;
      
      if (brand) {
        productEntry += ` ${brand}`;
      }
      
      productEntry += `\n   Price: ${price}${originalPrice}`;
      
      if (rating && reviews) {
        productEntry += `\n   Rating: ${rating} ${reviews}`;
      }
      
      if (prime) {
        productEntry += `\n   ✓ ${prime}`;
      }
      
      // Add hyperlinked shop now button - this will be processed by the Word template
      productEntry += `\n   🛒 HYPERLINK "${product.url}" "Shop Now"`;
      
      return productEntry;
    }).join('\n\n');
  }

  private getCategoryIntro(category: string, count: number): string {
    const intros = {
      'Clothing': `${count} carefully selected clothing pieces that embody your style:`,
      'Accessories': `${count} accessories to complete and elevate your looks:`,
      'Footwear': `${count} footwear options that combine style and comfort:`,
      'Home Decor': `${count} home decor items that extend your aesthetic to your living space:`
    };

    return intros[category as keyof typeof intros] || `${count} ${category.toLowerCase()} items curated for you:`;
  }

  private formatProductForDocument(product: StylePortfolioData['products'][0]): string {
    const title = product.title.length > 100
      ? product.title.substring(0, 97) + '...'
      : product.title;

    const price = product.price ? `$${product.price.toFixed(2)}` : 'Price varies';
    const originalPrice = product.retail_price && product.retail_price > product.price
      ? ` (Originally $${product.retail_price.toFixed(2)})`
      : '';

    const rating = product.rating ? `★${product.rating.toFixed(1)}` : '';
    const reviews = product.reviews ? `(${product.reviews.toLocaleString()} reviews)` : '';
    const brand = product.brand ? product.brand : '';
    const prime = product.prime ? '📦 Prime Eligible' : '';

    // Enhanced product details
    const features = [];
    if (brand) features.push(`Brand: ${brand}`);
    if (rating && reviews) features.push(`Rating: ${rating} ${reviews}`);
    if (prime) features.push(prime);

    return `
▼ ${title}
   ${features.join(' | ')}
   Price: ${price}${originalPrice}
   Category: ${product.category || 'Fashion'}
   🛒 Shop Now: ${product.url}
   
───────────────────────────────────────────────────────────────────────────
`;
  }

  private calculateAveragePrice(products: StylePortfolioData['products']): string {
    const validPrices = products.filter(p => p.price > 0).map(p => p.price);
    if (validPrices.length === 0) return 'Price varies';

    const average = validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length;
    return `${average.toFixed(2)}`;
  }

  async getTemplate(templateName: string): Promise<string> {
    try {
      console.log(`Loading ${templateName} from assets...`);
      const response = await fetch(`/assets/templates/${templateName}`);

      if (!response.ok) {
        throw new Error(`Template file not found: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      console.log(`Successfully loaded ${templateName} from assets`);
      return base64;

    } catch (error) {
      console.error(`Failed to load ${templateName} from assets:`, error);

      // Fallback to environment variable for main template only
      if (templateName === 'comprehensive-style-guide-template.docx') {
        const templateFromEnv = import.meta.env.VITE_STYLE_TEMPLATE_BASE64;
        if (templateFromEnv) {
          console.log('Using comprehensive template from environment variable');
          return templateFromEnv;
        }
      }

      throw new Error(`
      Template Loading Failed: Could not load ${templateName}
      
      Please ensure:
      1. File exists at: public/assets/templates/${templateName}
      2. File is a valid Word document with Foxit text tags
      3. Development server has access to the public folder
      
      Error details: ${error instanceof Error ? error.message : 'Unknown error'}
    `);
    }
  }

  async createAdditionalContent(
    option: { id: string; name: string; description: string; additionalContent: string },
    portfolioData: StylePortfolioData
  ): Promise<{ documentId: string } | null> {
    try {
      console.log(`Creating additional content for ${option.id}...`);

      // Get additional content template based on option type
      const templateBase64 = await this.getAdditionalContentTemplate(option.id);

      // Prepare data for additional content
      const additionalData = this.prepareAdditionalContentData(option, portfolioData);

      // Generate additional document
      const generatedDoc = await this.generateDocumentFromTemplate(
        templateBase64,
        additionalData,
        'pdf'
      );

      // Upload generated document
      const byteCharacters = atob(generatedDoc.base64FileString);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      const uploadResult = await this.uploadDocument(blob, `additional-${option.id}.pdf`);

      return { documentId: uploadResult.documentId };

    } catch (error) {
      console.error(`Failed to create additional content for ${option.id}:`, error);
      return null;
    }
  }

  private async getAdditionalContentTemplate(optionId: string): Promise<string> {
    try {
      // Map option IDs to specific templates
      const templateMap: { [key: string]: string } = {
        'trend-report': 'trend-report-template.docx',
        'care-guide': 'care-guide-template.docx',
        'size-fit': 'size-fit-template.docx',
        'master-collection': 'additional-content-template.docx'
      };

      const templateName = templateMap[optionId] || 'additional-content-template.docx';
      return await this.getTemplate(templateName);

    } catch (error) {
      console.error(`Failed to load template for ${optionId}:`, error);
      // Fallback to base additional content template
      return await this.getTemplate('additional-content-template.docx');
    }
  }

  private prepareAdditionalContentData(
    option: { id: string; name: string; description: string; additionalContent: string },
    portfolioData: StylePortfolioData
  ): Record<string, unknown> {
    const baseData = {
      userName: portfolioData.metadata.userName || 'Style Enthusiast',
      createdDate: new Date().toLocaleDateString(),
      aesthetics: portfolioData.userPreferences.aesthetics.join(' + '),
      season: portfolioData.metadata.season || 'Current Season',
      colorPalette: this.generateColorPalette(portfolioData.userPreferences.aesthetics)
        .slice(0, 6)
        .join(' • ')
    };

    switch (option.id) {
      case 'trend-report':
        return {
          ...baseData,
          trendTitle: `${portfolioData.metadata.season} ${new Date().getFullYear()} Trends`,
          keyTrends: this.generateTrendContent(portfolioData.userPreferences.aesthetics),
          colorTrends: this.generateColorTrends(portfolioData.metadata.season || 'Spring'),
          keyPieces: this.generateKeyPieces(portfolioData.userPreferences.aesthetics),
          contentTitle: 'Seasonal Trend Report',
          mainContent: this.generateTrendContent(portfolioData.userPreferences.aesthetics),
          integrationTips: this.generateTrendIntegrationTips(portfolioData.userPreferences.aesthetics)
        };

      case 'care-guide':
        return {
          ...baseData,
          fabricCare: this.generateFabricCareGuide(),
          stainRemoval: this.generateStainRemovalTips(),
          storageTips: this.generateStorageTips(),
          contentTitle: 'Fabric Care & Maintenance Guide',
          mainContent: this.generateFabricCareGuide(),
          integrationTips: this.generateCareIntegrationTips(portfolioData.userPreferences.aesthetics)
        };

      case 'size-fit':
        return {
          ...baseData,
          sizingCharts: this.generateSizingCharts(),
          fitTips: this.generateFitTips(portfolioData.userPreferences.aesthetics),
          measurementGuide: this.generateMeasurementGuide(),
          contentTitle: 'Size & Fit Guide',
          mainContent: this.generateSizingCharts(),
          integrationTips: this.generateSizeIntegrationTips(portfolioData.userPreferences.aesthetics)
        };

      case 'master-collection':
        return {
          ...baseData,
          allContent: 'Complete package with trends, care instructions, sizing, and advanced styling',
          contentTitle: 'Master Style Collection',
          mainContent: 'This comprehensive package includes seasonal trends, care instructions, sizing guides, and advanced styling techniques.',
          integrationTips: this.generateMasterIntegrationTips(portfolioData.userPreferences.aesthetics)
        };

      default:
        return {
          ...baseData,
          contentTitle: option.name,
          mainContent: option.additionalContent,
          integrationTips: this.generateGeneralIntegrationTips(portfolioData.userPreferences.aesthetics)
        };
    }
  }

  private generateTrendContent(userAesthetics: string[]): string {
    return userAesthetics.map(aesthetic => {
      switch (aesthetic.toLowerCase()) {
        case 'cottagecore':
          return '• Romantic florals and prairie dresses trending\n• Natural fabrics gaining popularity\n• Vintage-inspired details in high demand';
        case 'minimalist':
          return '• Clean lines and neutral tones dominating\n• Quality basics over trendy pieces\n• Sustainable fashion focus increasing';
        case 'dark academia':
          return '• Tweed and wool textures resurging\n• Vintage library aesthetics popular\n• Rich earth tones in high demand';
        case 'sleek':
          return '• Modern architectural silhouettes trending\n• High-tech fabrics gaining traction\n• Monochromatic styling popular';
        case 'cute':
          return '• Soft pastels and playful details trending\n• Kawaii-inspired accessories popular\n• Comfort-first styling on the rise';
        default:
          return `• ${aesthetic} aesthetic gaining mainstream appeal\n• Focus on authentic personal expression\n• Quality over quantity trend continues`;
      }
    }).join('\n\n');
  }

  private generateColorTrends(season: string): string {
    const seasonalColors = {
      'Spring': 'Soft pastels, sage green, warm coral, butter yellow',
      'Summer': 'Ocean blues, coral pink, sandy beige, sunset orange',
      'Fall': 'Rich burgundy, forest green, warm browns, golden yellow',
      'Winter': 'Deep navy, emerald green, berry tones, classic black'
    };
    return seasonalColors[season as keyof typeof seasonalColors] || 'Classic neutrals with seasonal accent colors';
  }

  private generateKeyPieces(userAesthetics: string[]): string {
    return userAesthetics.map(aesthetic => {
      switch (aesthetic.toLowerCase()) {
        case 'cottagecore':
          return '• Midi prairie skirts\n• Puff sleeve blouses\n• Wicker accessories\n• Mary Jane shoes';
        case 'minimalist':
          return '• Quality white button-down\n• Well-fitted trousers\n• Classic trench coat\n• Leather loafers';
        case 'dark academia':
          return '• Wool blazers\n• Vintage leather bags\n• Oxford shoes\n• Plaid scarves';
        case 'sleek':
          return '• Structured blazers\n• Streamlined pants\n• Modern sneakers\n• Geometric jewelry';
        case 'cute':
          return '• A-line dresses\n• Cardigans with details\n• Canvas sneakers\n• Delicate jewelry';
        default:
          return '• Versatile blazer\n• Quality jeans\n• Classic white tee\n• Comfortable sneakers';
      }
    }).join('\n\n');
  }

  private generateFabricCareGuide(): string {
    return `Cotton: Machine wash cool, tumble dry low
Linen: Hand wash or gentle cycle, air dry
Wool: Dry clean or hand wash cool
Silk: Hand wash or dry clean only
Denim: Wash inside out, cold water
Cashmere: Hand wash with specialized detergent
Leather: Professional cleaning recommended
Synthetic blends: Follow garment care labels`;
  }

  private generateStainRemovalTips(): string {
    return `Oil stains: Dish soap and warm water
Blood: Cold water and hydrogen peroxide
Sweat: White vinegar and baking soda
Makeup: Makeup remover then regular wash
Grass: Rubbing alcohol then wash
Wine: Salt immediately, then club soda
Coffee: Cold water rinse, then wash
Ink: Rubbing alcohol on cotton ball`;
  }

  private generateStorageTips(): string {
    return `Hang delicate items and structured pieces
Fold knitwear to prevent stretching
Use cedar blocks for moths
Store shoes with trees or stuffing
Keep accessories organized in compartments
Use breathable garment bags
Avoid plastic bags for long-term storage
Clean items before seasonal storage`;
  }

  private generateSizingCharts(): string {
    return `US sizing varies by brand - always check individual size charts
European sizes run differently than US
Consult brand-specific sizing guides
Consider fabric stretch when choosing size
Asian brands typically run smaller
Vintage sizing differs from modern standards
When in doubt, size up for comfort
Check return policies before purchasing`;
  }

  private generateFitTips(userAesthetics: string[]): string {
    return userAesthetics.map(aesthetic => {
      switch (aesthetic.toLowerCase()) {
        case 'cottagecore':
          return 'Embrace relaxed, flowing fits\nHigh-waisted bottoms are flattering\nLayer pieces for depth and interest';
        case 'minimalist':
          return 'Focus on clean, tailored silhouettes\nEnsure proper shoulder fit\nAvoid excess fabric or tight fits';
        case 'dark academia':
          return 'Structured fits with classic proportions\nEmphasize waist definition\nLayer for scholarly sophistication';
        case 'sleek':
          return 'Modern, streamlined silhouettes\nClean lines without bulk\nTailored fits that skim the body';
        case 'cute':
          return 'Comfortable fits that flatter\nHigh-waisted styles work well\nA-line silhouettes are universally flattering';
        default:
          return 'Choose fits that flatter your body type\nEnsure comfort and ease of movement\nTailor key pieces for perfect fit';
      }
    }).join('\n\n');
  }

  private generateMeasurementGuide(): string {
    return `Bust: Measure around fullest part
Waist: Measure at natural waistline
Hips: Measure around fullest part
Inseam: Measure from crotch to ankle
Shoulder: Measure from shoulder point to shoulder point
Arm length: Measure from shoulder to wrist
Chest: Measure around chest at underarm level
Thigh: Measure around fullest part of thigh`;
  }

  private generateTrendIntegrationTips(aesthetics: string[]): string {
    return `To integrate current trends with your ${aesthetics.join(' + ')} aesthetic:
• Start with small trend pieces that complement your core style
• Choose trends in colors from your established palette
• Focus on trends that enhance rather than overwhelm your look
• Invest in trend-conscious accessories rather than major wardrobe overhauls
• Remember that personal style should evolve, not be replaced by trends`;
  }

  private generateCareIntegrationTips(aesthetics: string[]): string {
    return `Caring for your ${aesthetics.join(' + ')} wardrobe:
• Invest in proper care tools for your key pieces
• Follow fabric care instructions to maintain quality
• Store seasonal items properly to extend their life
• Address stains and damage promptly
• Consider professional cleaning for investment pieces`;
  }

  private generateSizeIntegrationTips(aesthetics: string[]): string {
    return `Achieving the perfect fit for your ${aesthetics.join(' + ')} style:
• Understand how different brands fit your body
• Don't be afraid to size up for comfort
• Consider alterations for key investment pieces
• Pay attention to fabric content and stretch
• Build relationships with trusted tailors for complex adjustments`;
  }

  private generateMasterIntegrationTips(aesthetics: string[]): string {
    return `Mastering your complete ${aesthetics.join(' + ')} style system:
• Use trends strategically to keep your look current
• Maintain your wardrobe properly to protect your investments
• Ensure proper fit across all your pieces
• Build a cohesive system that works across seasons
• Remember that great style is about how everything works together`;
  }

  private generateGeneralIntegrationTips(aesthetics: string[]): string {
    return `Integrating new elements with your ${aesthetics.join(' + ')} style:
• Stay true to your core aesthetic while allowing for growth
• Choose additions that enhance your existing wardrobe
• Focus on versatile pieces that work multiple ways
• Consider how new items fit into your lifestyle
• Build gradually rather than completely overhauling your style`;
  }

  private generateStylingTips(aesthetics: string[], lifestyle: string): string[] {
    const tipDatabase: { [key: string]: string[] } = {
      minimalist: [
        'Focus on clean lines and neutral colors for timeless elegance',
        'Invest in quality basics that mix and match effortlessly',
        'Choose pieces with simple, elegant silhouettes that flatter your form',
        'Less is more - select versatile, timeless items over trendy pieces',
        'Stick to a cohesive color palette of 3-5 colors maximum',
        'Pay attention to fabric quality and construction details'
      ],
      cottagecore: [
        'Layer delicate fabrics and textures for romantic depth',
        'Embrace floral patterns, gingham, and vintage-inspired prints',
        'Mix antique and vintage pieces with modern comfort',
        'Choose natural fabrics like cotton, linen, and wool',
        'Incorporate earthy tones and soft, muted colors',
        'Add feminine touches like ruffles, puff sleeves, and lace details'
      ],
      'dark academia': [
        'Layer blazers over comfortable sweaters for scholarly sophistication',
        'Incorporate rich textures like wool, tweed, and corduroy',
        'Focus on earth tones and deep, scholarly colors like burgundy and forest green',
        'Add vintage accessories for authentic intellectual appeal',
        'Choose classic patterns like plaid, herringbone, and houndstooth',
        'Invest in quality outerwear like wool coats and leather jackets'
      ],
      sleek: [
        'Choose streamlined silhouettes and modern cuts for contemporary appeal',
        'Stick to a cohesive color palette with strategic pops of color',
        'Invest in quality materials with smooth finishes and clean lines',
        'Keep accessories minimal and functional yet stylish',
        'Focus on fit - tailoring makes all the difference',
        'Choose pieces with architectural elements and interesting details'
      ],
      cute: [
        'Add playful details and soft textures for charm and whimsy',
        'Mix feminine touches with practical, comfortable pieces',
        'Use pastel colors and gentle patterns for a soft aesthetic',
        'Choose comfortable fits that flatter your natural shape',
        'Incorporate fun accessories like bows, ribbons, and delicate jewelry',
        'Balance sweet details with more mature pieces for sophistication'
      ],
      casual: [
        'Prioritize comfort without sacrificing style or put-togetherness',
        'Mix and match versatile basics for effortless everyday looks',
        'Add personality with fun accessories, shoes, and statement pieces',
        'Choose breathable, easy-care fabrics for practical daily wear',
        'Focus on pieces that work for multiple occasions and activities',
        'Invest in quality basics like great jeans, comfortable shoes, and versatile tops'
      ],
      professional: [
        'Invest in well-tailored, classic pieces that command respect',
        'Stick to sophisticated color combinations and timeless patterns',
        'Pay attention to fit and quality details like buttons and seams',
        'Choose versatile pieces that work for multiple professional occasions',
        'Build a capsule wardrobe of mix-and-match essentials',
        'Keep accessories polished and appropriate for your industry'
      ]
    };

    const tips: string[] = [];

    aesthetics.forEach(aesthetic => {
      const aestheticKey = aesthetic.toLowerCase();
      if (tipDatabase[aestheticKey]) {
        tips.push(...tipDatabase[aestheticKey].slice(0, 3));
      }
    });

    const lifestyleKey = lifestyle.toLowerCase();
    if (tipDatabase[lifestyleKey]) {
      tips.push(...tipDatabase[lifestyleKey].slice(0, 2));
    }

    if (tips.length === 0) {
      tips.push(
        'Choose pieces that reflect your personal style and make you feel confident',
        'Invest in quality over quantity for a more sustainable wardrobe',
        'Mix textures and patterns thoughtfully for visual interest',
        'Ensure proper fit for the most flattering and comfortable look',
        'Build a cohesive color palette that works across seasons',
        'Focus on versatile pieces that can be dressed up or down'
      );
    }

    return [...new Set(tips)].slice(0, 8);
  }

  private generateColorPalette(aesthetics: string[]): string[] {
    const colorPalettes: { [key: string]: string[] } = {
      minimalist: ['White', 'Light Gray', 'Charcoal', 'Black', 'Beige', 'Navy', 'Camel', 'Cream'],
      cottagecore: ['Cream', 'Sage Green', 'Dusty Rose', 'Warm Brown', 'Lavender', 'Soft Yellow', 'Blush Pink', 'Sage'],
      'dark academia': ['Deep Brown', 'Forest Green', 'Burgundy', 'Cream', 'Navy', 'Charcoal', 'Wine', 'Camel'],
      sleek: ['Black', 'White', 'Silver', 'Deep Navy', 'Charcoal', 'Cool Gray', 'Ice Blue', 'Platinum'],
      cute: ['Soft Pink', 'Lavender', 'Mint Green', 'Cream', 'Peach', 'Light Blue', 'Powder Blue', 'Rose Gold'],
      bohemian: ['Terracotta', 'Mustard', 'Deep Teal', 'Rust', 'Sage', 'Cream', 'Burnt Orange', 'Olive'],
      modern: ['Black', 'White', 'Bold Red', 'Electric Blue', 'Bright Yellow', 'Deep Purple', 'Hot Pink', 'Lime Green']
    };

    let palette = ['Black', 'White', 'Gray'];

    aesthetics.forEach(aesthetic => {
      const aestheticKey = aesthetic.toLowerCase();
      if (colorPalettes[aestheticKey]) {
        palette = [...palette, ...colorPalettes[aestheticKey]];
      }
    });

    return [...new Set(palette)].slice(0, 10);
  }

  async checkTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      const url = `${this.pdfServicesUrl}/api/tasks/${taskId}`;

      console.log(`Checking task status at: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'client_id': this.clientId,
          'client_secret': this.clientSecret,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Task status response: ${response.status}`, errorText);

        if (response.status === 404) {
          return {
            taskId,
            status: 'failed',
            message: 'Task not found - may have expired or completed',
          };
        }

        throw new Error(`Task status check failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`Task ${taskId} full response:`, result);

      const mappedStatus = this.mapFoxitStatusToOurFormat(result.status || result.state);
      const documentId = result.resultDocumentId || result.documentId || result.outputDocumentId;

      console.log(`Task ${taskId} parsed:`, {
        status: mappedStatus,
        documentId,
        originalStatus: result.status || result.state,
        allFields: Object.keys(result)
      });

      let downloadUrl: string | undefined;
      if (mappedStatus === 'completed' && documentId) {
        downloadUrl = documentId;
        console.log(`Will use document ID for download: ${documentId}`);
      }

      return {
        taskId: result.taskId || taskId,
        status: mappedStatus,
        message: result.message || `Task is ${mappedStatus}`,
        downloadUrl: downloadUrl,
        documentId: documentId
      };

    } catch (error) {
      console.error('Task status check error:', error);

      return {
        taskId,
        status: 'failed',
        message: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private mapFoxitStatusToOurFormat(foxitStatus: string): 'processing' | 'completed' | 'failed' {
    switch (foxitStatus?.toUpperCase()) {
      case 'PENDING':
      case 'PROCESSING':
        return 'processing';
      case 'COMPLETED':
        return 'completed';
      case 'FAILED':
      default:
        return 'failed';
    }
  }
}

export type { TaskStatusResponse };