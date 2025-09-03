// src/services/amazonService.ts
export interface AmazonProduct {
  product_id: string;
  title: string;
  url: string;
  image: string;
  price: number;
  retail_price: number;
  rating: number;
  reviews: number;
  prime: boolean;
  delivery_message: string;
  variations: unknown[];
}

// Define types for the Amazon API response structures
interface SearchProductDetail {
  asin?: string;
  productDescription?: string;
  dpUrl?: string;
  imgUrl?: string;
  price?: number;
  retailPrice?: number;
  productRating?: string;
  countReview?: number;
  prime?: boolean;
  deliveryMessage?: string;
  variations?: unknown[];
}

interface DetailedProductData {
  asin?: string;
  productTitle?: string;
  mainImage?: {
    imageUrl?: string;
  };
  price?: number;
  retailPrice?: number;
  productRating?: string;
  countReview?: number;
  prime?: boolean;
  priceShippingInformation?: string;
  variations?: unknown[];
}

export class AmazonService {
  private apiKey: string;
  private host: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_RAPIDAPI_KEY;
    this.host = import.meta.env.VITE_RAPIDAPI_HOST;
    this.baseUrl = `https://${this.host}`;
  }

  private get headers() {
    return {
      'x-rapidapi-host': this.host,
      'x-rapidapi-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async searchProducts(keywords: string[], maxResults: number = 12): Promise<AmazonProduct[]> {
    try {
      const searchQuery = keywords.join(' ');
      
      const params = new URLSearchParams({
        domainCode: 'com',
        keyword: searchQuery,
        page: '1',
        excludeSponsored: 'false',
        sortBy: 'relevanceblender',
        withCache: 'true'
      });

      const response = await fetch(
        `${this.baseUrl}/amz/amazon-search-by-keyword-asin?${params}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Amazon API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.responseStatus === 'PRODUCT_FOUND_RESPONSE') {
        const products = data.searchProductDetails || [];
        return products.slice(0, maxResults).map((product: SearchProductDetail) => this.formatSearchProduct(product));
      }

      return [];
    } catch (error) {
      console.error('Amazon search error:', error);
      return [];
    }
  }

  async getProductDetails(asin: string): Promise<AmazonProduct | null> {
    try {
      const amazonUrl = `https://www.amazon.com/dp/${asin}/`;
      
      const params = new URLSearchParams({
        url: amazonUrl
      });

      const response = await fetch(
        `${this.baseUrl}/amz/amazon-lookup-product?${params}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Amazon details API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.responseStatus === 'PRODUCT_FOUND_RESPONSE') {
        return this.formatDetailedProduct(data);
      }

      return null;
    } catch (error) {
      console.error('Amazon product details error:', error);
      return null;
    }
  }

  private formatSearchProduct(productDetail: SearchProductDetail): AmazonProduct {
    const rating = this.parseRating(productDetail.productRating);
    const dpUrl = productDetail.dpUrl || '';
    const fullUrl = dpUrl ? `https://amazon.com${dpUrl}` : '';

    return {
      product_id: productDetail.asin || '',
      title: productDetail.productDescription || '',
      url: fullUrl,
      image: productDetail.imgUrl || '',
      price: productDetail.price || 0,
      retail_price: productDetail.retailPrice || 0,
      rating,
      reviews: productDetail.countReview || 0,
      prime: productDetail.prime || false,
      delivery_message: productDetail.deliveryMessage || '',
      variations: productDetail.variations || [],
    };
  }

  private formatDetailedProduct(productData: DetailedProductData): AmazonProduct {
    const rating = this.parseRating(productData.productRating);

    return {
      product_id: productData.asin || '',
      title: productData.productTitle || '',
      url: `https://amazon.com/dp/${productData.asin || ''}/`,
      image: productData.mainImage?.imageUrl || '',
      price: productData.price || 0,
      retail_price: productData.retailPrice || 0,
      rating,
      reviews: productData.countReview || 0,
      prime: productData.prime || false,
      delivery_message: productData.priceShippingInformation || '',
      variations: productData.variations || [],
    };
  }

  private parseRating(ratingStr?: string): number {
    try {
      if (!ratingStr) return 0;
      const match = ratingStr.match(/(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : 0;
    } catch {
      return 0;
    }
  }
}