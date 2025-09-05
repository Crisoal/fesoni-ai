// src/services/socialImageGenerator.ts
import { StylePortfolioData } from './foxitService';

interface SocialImageFormat {
  name: string;
  dimensions: string;
  width: number;
  height: number;
  description: string;
}

interface ProductImage {
  url: string;
  title: string;
  price: number;
  image: string;
}

export class SocialImageGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async createSocialImages(
    formats: SocialImageFormat[],
    portfolioData: StylePortfolioData
  ): Promise<Array<{ format: SocialImageFormat; blob: Blob; filename: string }>> {
    const results = [];

    for (const format of formats) {
      try {
        const blob = await this.generateImageForFormat(format, portfolioData);
        const filename = `${format.name.replace(/\s+/g, '_')}_${portfolioData.userPreferences.aesthetics.join('_')}.png`;
        results.push({ format, blob, filename });
      } catch (error) {
        console.error(`Failed to generate ${format.name}:`, error);
      }
    }

    return results;
  }

  private async generateImageForFormat(
    format: SocialImageFormat,
    portfolioData: StylePortfolioData
  ): Promise<Blob> {
    // Set canvas dimensions
    this.canvas.width = format.width;
    this.canvas.height = format.height;

    // Clear canvas
    this.ctx.fillStyle = this.getBackgroundColor(portfolioData.userPreferences.aesthetics);
    this.ctx.fillRect(0, 0, format.width, format.height);

    // Generate based on format type
    if (format.name.includes('Instagram Square')) {
      await this.generateInstagramSquare(portfolioData);
    } else if (format.name.includes('Pinterest')) {
      await this.generatePinterestVertical(portfolioData);
    } else if (format.name.includes('Stories')) {
      await this.generateInstagramStories(portfolioData);
    } else if (format.name.includes('Facebook')) {
      await this.generateFacebookSquare(portfolioData);
    }

    // Convert canvas to blob
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png', 0.9);
    });
  }

  private async generateInstagramSquare(portfolioData: StylePortfolioData): Promise<void> {
    const { width, height } = this.canvas;
    const products = portfolioData.products.slice(0, 4); // Top 4 products

    // Header text
    this.drawHeaderText(portfolioData.userPreferences.aesthetics.join(' ').toUpperCase(), width / 2, 80);

    // Product grid (2x2)
    const gridSize = Math.min(width * 0.35, height * 0.35);
    const spacing = 20;
    const startX = (width - (gridSize * 2 + spacing)) / 2;
    const startY = height * 0.25;

    for (let i = 0; i < Math.min(4, products.length); i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = startX + col * (gridSize + spacing);
      const y = startY + row * (gridSize + spacing);

      await this.drawProductImage(products[i], x, y, gridSize, gridSize);
    }

    // Footer text
    const seasonText = `${portfolioData.metadata.season || 'Style'} Inspo ✨`;
    this.drawFooterText(seasonText, width / 2, height - 100);
    this.drawBrandingText('Curated by Fesoni', width / 2, height - 60);
  }

  private async generatePinterestVertical(portfolioData: StylePortfolioData): Promise<void> {
    const { width, height } = this.canvas;
    const products = portfolioData.products.slice(0, 4); // Top 4 products

    // Header
    this.drawHeaderText('GET THE LOOK', width / 2, 80);
    this.drawSubheaderText(
      `${portfolioData.userPreferences.aesthetics.join(' ')}`,
      width / 2,
      120
    );
    this.drawSubheaderText(
      `${portfolioData.metadata.season || 'Style'} 2025`,
      width / 2,
      150
    );

    // Product stack
    const productHeight = 180;
    const spacing = 20;
    let currentY = 200;

    for (let i = 0; i < Math.min(4, products.length); i++) {
      const product = products[i];
      const productWidth = width * 0.8;
      const x = (width - productWidth) / 2;

      // Product image
      await this.drawProductImage(product, x, currentY, productWidth * 0.6, productHeight * 0.7);

      // Product info
      this.drawProductText(
        product.title.length > 30 ? product.title.substring(0, 27) + '...' : product.title,
        x + productWidth * 0.65,
        currentY + 30
      );
      this.drawPriceText(`$${product.price.toFixed(2)}`, x + productWidth * 0.65, currentY + 60);

      currentY += productHeight + spacing;
    }

    // Call to action
    this.drawFooterText('Shop via link in bio ⬆️', width / 2, height - 60);
  }

  private async generateInstagramStories(portfolioData: StylePortfolioData): Promise<void> {
    const { width, height } = this.canvas;
    const product = portfolioData.products[0]; // Featured product

    if (!product) return;

    // Header text
    this.drawStoryHeaderText('STYLE ALERT! 🚨', width / 2, 150);

    // Large product image
    const imageSize = Math.min(width * 0.8, height * 0.5);
    const imageX = (width - imageSize) / 2;
    const imageY = height * 0.25;

    await this.drawProductImage(product, imageX, imageY, imageSize, imageSize);

    // Description
    const aesthetic = portfolioData.userPreferences.aesthetics[0] || 'style';
    this.drawStoryText(`Perfect for ${aesthetic} vibes ✨`, width / 2, imageY + imageSize + 60);

    // Navigation hint
    this.drawStoryText('Swipe for more →', width / 2, height - 150);

    // Call to action
    this.drawStoryText('📍 Shop link in bio', width / 2, height - 100);
  }

  private async generateFacebookSquare(portfolioData: StylePortfolioData): Promise<void> {
    // Similar to Instagram Square but with Facebook-specific styling
    await this.generateInstagramSquare(portfolioData);
  }

  private async drawProductImage(
    product: ProductImage,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    try {
      const img = await this.loadImage(product.image);
      
      // Draw background
      this.ctx.fillStyle = '#f8f9fa';
      this.ctx.fillRect(x, y, width, height);
      
      // Calculate aspect ratio and draw image
      const aspectRatio = img.width / img.height;
      let drawWidth = width;
      let drawHeight = height;
      let drawX = x;
      let drawY = y;

      if (aspectRatio > 1) {
        drawHeight = width / aspectRatio;
        drawY = y + (height - drawHeight) / 2;
      } else {
        drawWidth = height * aspectRatio;
        drawX = x + (width - drawWidth) / 2;
      }

      this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Draw border
      this.ctx.strokeStyle = '#e0e0e0';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
    } catch (error) {
      console.error('Failed to load product image:', error);
      // Draw placeholder
      this.ctx.fillStyle = '#f0f0f0';
      this.ctx.fillRect(x, y, width, height);
      this.ctx.fillStyle = '#666';
      this.ctx.font = '16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Image', x + width/2, y + height/2);
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private drawHeaderText(text: string, x: number, y: number): void {
    this.ctx.fillStyle = '#2d3748';
    this.ctx.font = 'bold 32px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y);
  }

  private drawSubheaderText(text: string, x: number, y: number): void {
    this.ctx.fillStyle = '#4a5568';
    this.ctx.font = '24px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y);
  }

  private drawFooterText(text: string, x: number, y: number): void {
    this.ctx.fillStyle = '#2d3748';
    this.ctx.font = 'bold 20px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y);
  }

  private drawBrandingText(text: string, x: number, y: number): void {
    this.ctx.fillStyle = '#718096';
    this.ctx.font = '16px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y);
  }

  private drawProductText(text: string, x: number, y: number): void {
    this.ctx.fillStyle = '#2d3748';
    this.ctx.font = 'bold 18px Arial, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(text, x, y);
  }

  private drawPriceText(text: string, x: number, y: number): void {
    this.ctx.fillStyle = '#38a169';
    this.ctx.font = 'bold 20px Arial, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(text, x, y);
  }

  private drawStoryHeaderText(text: string, x: number, y: number): void {
    this.ctx.fillStyle = '#2d3748';
    this.ctx.font = 'bold 36px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y);
  }

  private drawStoryText(text: string, x: number, y: number): void {
    this.ctx.fillStyle = '#4a5568';
    this.ctx.font = '24px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y);
  }

  private getBackgroundColor(aesthetics: string[]): string {
    const colorMap: { [key: string]: string } = {
      'minimalist': '#ffffff',
      'cottagecore': '#faf5f0',
      'dark academia': '#f7f5f3',
      'sleek': '#f8f9fa',
      'cute': '#fef7f7'
    };

    const aesthetic = aesthetics[0]?.toLowerCase();
    return colorMap[aesthetic] || '#ffffff';
  }
}