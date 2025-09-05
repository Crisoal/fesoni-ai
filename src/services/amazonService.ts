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
  category?: string;
  brand?: string;
  manufacturer?: string;
  categories?: string[];
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
  categories?: string[];
  manufacturer?: string;
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
  categories?: string[];
  manufacturer?: string;
  brand?: string;
  productDetails?: Array<{
    name?: string;
    value?: string;
  }>;
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

    // Infer category from product description and categories
    const category = this.determineProductCategory(
      productDetail.productDescription || '',
      productDetail.categories || []
    );

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
      category,
      manufacturer: productDetail.manufacturer || '',
      categories: productDetail.categories || [],
    };
  }

  private formatDetailedProduct(productData: DetailedProductData): AmazonProduct {
    const rating = this.parseRating(productData.productRating);

    // Extract brand from product details
    const productDetails = productData.productDetails || [];
    const brandDetail = productDetails.find(detail => 
      detail.name?.toLowerCase() === 'brand'
    );
    const brand = brandDetail?.value || productData.brand || '';

    // Determine category from product title and categories
    const category = this.determineProductCategory(
      productData.productTitle || '',
      productData.categories || []
    );

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
      category,
      brand,
      manufacturer: productData.manufacturer || '',
      categories: productData.categories || [],
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

  private determineProductCategory(title: string, categories: string[]): string {
    const lowerTitle = title.toLowerCase();

    // First check if we have explicit categories from the API
    if (categories && categories.length > 0) {
      const firstCategory = categories[0];
      
      // Map common Amazon categories to our simplified categories
      const categoryMappings: { [key: string]: string } = {
        'clothing': 'Clothing',
        'shoes': 'Footwear',
        'jewelry': 'Accessories',
        'bags': 'Accessories',
        'handbags': 'Accessories',
        'watches': 'Accessories',
        'beauty': 'Beauty',
        'home': 'Home Decor',
        'kitchen': 'Home Decor',
        'electronics': 'Electronics',
        'sports': 'Sports & Outdoors',
        'books': 'Books',
        'toys': 'Toys & Games',
        'automotive': 'Automotive',
        'health': 'Health & Personal Care',
      };

      for (const [key, value] of Object.entries(categoryMappings)) {
        if (firstCategory.toLowerCase().includes(key)) {
          return value;
        }
      }
    }

    // Fallback to title-based inference
    if (lowerTitle.includes('dress') || lowerTitle.includes('shirt') || 
        lowerTitle.includes('top') || lowerTitle.includes('pants') || 
        lowerTitle.includes('jeans') || lowerTitle.includes('jacket') ||
        lowerTitle.includes('sweater') || lowerTitle.includes('coat')) {
      return 'Clothing';
    }
    
    if (lowerTitle.includes('shoe') || lowerTitle.includes('boot') || 
        lowerTitle.includes('sandal') || lowerTitle.includes('sneaker') ||
        lowerTitle.includes('heel') || lowerTitle.includes('flat')) {
      return 'Footwear';
    }
    
    if (lowerTitle.includes('bag') || lowerTitle.includes('purse') || 
        lowerTitle.includes('wallet') || lowerTitle.includes('jewelry') || 
        lowerTitle.includes('watch') || lowerTitle.includes('necklace') ||
        lowerTitle.includes('earring') || lowerTitle.includes('bracelet') ||
        lowerTitle.includes('ring') || lowerTitle.includes('sunglasses')) {
      return 'Accessories';
    }
    
    if (lowerTitle.includes('makeup') || lowerTitle.includes('skincare') || 
        lowerTitle.includes('perfume') || lowerTitle.includes('cologne') ||
        lowerTitle.includes('beauty') || lowerTitle.includes('cosmetic')) {
      return 'Beauty';
    }
    
    if (lowerTitle.includes('home') || lowerTitle.includes('decor') || 
        lowerTitle.includes('lamp') || lowerTitle.includes('furniture') ||
        lowerTitle.includes('pillow') || lowerTitle.includes('blanket') ||
        lowerTitle.includes('kitchen') || lowerTitle.includes('dining')) {
      return 'Home Decor';
    }

    if (lowerTitle.includes('phone') || lowerTitle.includes('tablet') || 
        lowerTitle.includes('laptop') || lowerTitle.includes('computer') ||
        lowerTitle.includes('headphones') || lowerTitle.includes('speaker') ||
        lowerTitle.includes('camera') || lowerTitle.includes('electronic')) {
      return 'Electronics';
    }

    if (lowerTitle.includes('book') || lowerTitle.includes('novel') || 
        lowerTitle.includes('guide') || lowerTitle.includes('magazine')) {
      return 'Books';
    }

    if (lowerTitle.includes('toy') || lowerTitle.includes('game') || 
        lowerTitle.includes('puzzle') || lowerTitle.includes('doll')) {
      return 'Toys & Games';
    }

    if (lowerTitle.includes('sport') || lowerTitle.includes('fitness') || 
        lowerTitle.includes('outdoor') || lowerTitle.includes('exercise') ||
        lowerTitle.includes('gym') || lowerTitle.includes('yoga')) {
      return 'Sports & Outdoors';
    }

    if (lowerTitle.includes('vitamin') || lowerTitle.includes('supplement') || 
        lowerTitle.includes('health') || lowerTitle.includes('medical') ||
        lowerTitle.includes('personal care')) {
      return 'Health & Personal Care';
    }

    // Default fallback
    return 'Fashion';
  }
}