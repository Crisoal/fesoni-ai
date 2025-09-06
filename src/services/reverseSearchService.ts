// src/services/reverseSearchService.ts

import { AmazonService, AmazonProduct } from './amazonService';

interface StyleSearchParams {
  aesthetics: string[];
  colors: string[];
  textures: string[];
  silhouettes: string[];
  mood: string[];
  searchKeywords: string[];
  budget?: number;
}

interface OptimizedProduct extends AmazonProduct {
  similarity_score: number;
  price_tier: 'budget' | 'mid' | 'premium';
  alternative_products?: AmazonProduct[];
  style_match_reasons: string[];
}

interface SearchResult {
  products: OptimizedProduct[];
  totalFound: number;
  searchStrategy: string;
  budgetAnalysis?: {
    withinBudget: number;
    overBudget: number;
    averagePrice: number;
    recommendedBudget: number;
  };
}

export class ReverseSearchService {
  private amazonService: AmazonService;

  constructor() {
    this.amazonService = new AmazonService();
  }

  async searchByStyle(params: StyleSearchParams, maxResults: number = 20): Promise<SearchResult> {
    try {
      console.log('Starting reverse style search with params:', params);

      // Generate comprehensive search queries based on style analysis
      const searchQueries = this.generateSearchQueries(params);
      console.log('Generated search queries:', searchQueries);

      // Execute multiple searches in parallel
      const searchPromises = searchQueries.map(query => 
        this.amazonService.searchProducts(query.keywords, Math.ceil(maxResults / searchQueries.length))
      );

      const searchResults = await Promise.all(searchPromises);
      
      // Combine and deduplicate results
      const allProducts = this.deduplicateProducts(searchResults.flat());
      console.log(`Found ${allProducts.length} unique products`);

      // Score products based on style similarity
      const scoredProducts = await this.scoreProductsBySimilarity(allProducts, params);

      // Apply budget filtering and optimization
      const optimizedProducts = this.optimizeForBudget(scoredProducts, params.budget);

      // Find alternatives for each product
      const productsWithAlternatives = await this.findAlternatives(optimizedProducts, params);

      // Sort by similarity score and price optimization
      const finalProducts = productsWithAlternatives
        .sort((a, b) => {
          // Primary sort: similarity score
          if (Math.abs(a.similarity_score - b.similarity_score) > 0.1) {
            return b.similarity_score - a.similarity_score;
          }
          // Secondary sort: price (prefer better value)
          return a.price - b.price;
        })
        .slice(0, maxResults);

      const budgetAnalysis = params.budget ? this.analyzeBudgetFit(finalProducts, params.budget) : undefined;

      return {
        products: finalProducts,
        totalFound: allProducts.length,
        searchStrategy: this.getSearchStrategy(params),
        budgetAnalysis
      };

    } catch (error) {
      console.error('Reverse search error:', error);
      throw new Error('Failed to perform style-based product search');
    }
  }

  private generateSearchQueries(params: StyleSearchParams): Array<{ keywords: string[]; weight: number }> {
    const queries: Array<{ keywords: string[]; weight: number }> = [];

    // Primary aesthetic-based searches
    params.aesthetics.forEach(aesthetic => {
      queries.push({
        keywords: [aesthetic, 'style', 'fashion'],
        weight: 1.0
      });
      
      // Combine aesthetic with specific items
      params.searchKeywords.forEach(keyword => {
        queries.push({
          keywords: [aesthetic, keyword],
          weight: 0.9
        });
      });
    });

    // Color-based searches
    if (params.colors.length > 0) {
      const primaryColors = params.colors.slice(0, 2);
      primaryColors.forEach(color => {
        queries.push({
          keywords: [color, 'clothing', 'fashion'],
          weight: 0.7
        });
      });
    }

    // Texture and material searches
    params.textures.forEach(texture => {
      queries.push({
        keywords: [texture, 'fabric', 'clothing'],
        weight: 0.6
      });
    });

    // Mood-based searches
    params.mood.forEach(mood => {
      queries.push({
        keywords: [mood, 'style', 'outfit'],
        weight: 0.8
      });
    });

    // Direct keyword searches (highest priority)
    params.searchKeywords.forEach(keyword => {
      queries.push({
        keywords: [keyword],
        weight: 1.2
      });
    });

    // Sort by weight and return top queries
    return queries
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8); // Limit to prevent too many API calls
  }

  private deduplicateProducts(products: AmazonProduct[]): AmazonProduct[] {
    const seen = new Set<string>();
    return products.filter(product => {
      const key = `${product.title.toLowerCase()}-${product.price}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async scoreProductsBySimilarity(
    products: AmazonProduct[], 
    params: StyleSearchParams
  ): Promise<OptimizedProduct[]> {
    return products.map(product => {
      const score = this.calculateSimilarityScore(product, params);
      const priceTier = this.determinePriceTier(product.price);
      const matchReasons = this.getStyleMatchReasons(product, params);

      return {
        ...product,
        similarity_score: score,
        price_tier: priceTier,
        style_match_reasons: matchReasons
      };
    });
  }

  private calculateSimilarityScore(product: AmazonProduct, params: StyleSearchParams): number {
    let score = 0;
    let maxScore = 0;

    const productText = `${product.title} ${product.category || ''}`.toLowerCase();

    // Aesthetic matching (40% of score)
    const aestheticWeight = 0.4;
    let aestheticScore = 0;
    params.aesthetics.forEach(aesthetic => {
      if (productText.includes(aesthetic.toLowerCase())) {
        aestheticScore += 1;
      }
    });
    score += (aestheticScore / Math.max(params.aesthetics.length, 1)) * aestheticWeight;
    maxScore += aestheticWeight;

    // Keyword matching (30% of score)
    const keywordWeight = 0.3;
    let keywordScore = 0;
    params.searchKeywords.forEach(keyword => {
      if (productText.includes(keyword.toLowerCase())) {
        keywordScore += 1;
      }
    });
    score += (keywordScore / Math.max(params.searchKeywords.length, 1)) * keywordWeight;
    maxScore += keywordWeight;

    // Color matching (15% of score)
    const colorWeight = 0.15;
    let colorScore = 0;
    params.colors.forEach(color => {
      if (productText.includes(color.toLowerCase())) {
        colorScore += 1;
      }
    });
    score += (colorScore / Math.max(params.colors.length, 1)) * colorWeight;
    maxScore += colorWeight;

    // Mood matching (15% of score)
    const moodWeight = 0.15;
    let moodScore = 0;
    params.mood.forEach(mood => {
      if (productText.includes(mood.toLowerCase())) {
        moodScore += 1;
      }
    });
    score += (moodScore / Math.max(params.mood.length, 1)) * moodWeight;
    maxScore += moodWeight;

    // Normalize score to 0-1 range
    return maxScore > 0 ? Math.min(score / maxScore, 1) : 0.5;
  }

  private determinePriceTier(price: number): 'budget' | 'mid' | 'premium' {
    if (price < 50) return 'budget';
    if (price < 150) return 'mid';
    return 'premium';
  }

  private getStyleMatchReasons(product: AmazonProduct, params: StyleSearchParams): string[] {
    const reasons: string[] = [];
    const productText = `${product.title} ${product.category || ''}`.toLowerCase();

    // Check aesthetic matches
    params.aesthetics.forEach(aesthetic => {
      if (productText.includes(aesthetic.toLowerCase())) {
        reasons.push(`Matches ${aesthetic} aesthetic`);
      }
    });

    // Check color matches
    params.colors.forEach(color => {
      if (productText.includes(color.toLowerCase())) {
        reasons.push(`Features ${color} color`);
      }
    });

    // Check mood matches
    params.mood.forEach(mood => {
      if (productText.includes(mood.toLowerCase())) {
        reasons.push(`Captures ${mood} vibe`);
      }
    });

    // Check specific features
    if (product.prime) {
      reasons.push('Prime eligible for fast delivery');
    }

    if (product.rating && product.rating >= 4.0) {
      reasons.push(`Highly rated (${product.rating}/5 stars)`);
    }

    return reasons.slice(0, 3); // Limit to top 3 reasons
  }

  private optimizeForBudget(products: OptimizedProduct[], budget?: number): OptimizedProduct[] {
    if (!budget) return products;

    // Separate products by budget fit
    const withinBudget = products.filter(p => p.price <= budget);
    const overBudget = products.filter(p => p.price > budget);

    // Prioritize within-budget items, but include some over-budget for alternatives
    return [
      ...withinBudget.sort((a, b) => b.similarity_score - a.similarity_score),
      ...overBudget
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, Math.floor(products.length * 0.3)) // Include 30% over-budget items
    ];
  }

  private async findAlternatives(products: OptimizedProduct[], params: StyleSearchParams): Promise<OptimizedProduct[]> {
    // For each product, try to find 2-3 alternatives in different price ranges
    const productsWithAlternatives = await Promise.all(
      products.map(async (product) => {
        try {
          // Generate alternative search based on product category and style
          const altKeywords = [
            product.category || 'fashion',
            ...params.aesthetics.slice(0, 1),
            'alternative',
            'similar'
          ];

          const alternatives = await this.amazonService.searchProducts(altKeywords, 6);
          
          // Filter alternatives that are different from the main product
          const filteredAlternatives = alternatives
            .filter(alt => 
              alt.product_id !== product.product_id && 
              Math.abs(alt.price - product.price) > 5 // Different price point
            )
            .slice(0, 3);

          return {
            ...product,
            alternative_products: filteredAlternatives
          };
        } catch (error) {
          console.error(`Failed to find alternatives for ${product.product_id}:`, error);
          return product;
        }
      })
    );

    return productsWithAlternatives;
  }

  private analyzeBudgetFit(products: OptimizedProduct[], budget: number) {
    const withinBudget = products.filter(p => p.price <= budget).length;
    const overBudget = products.length - withinBudget;
    const averagePrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
    
    // Recommend budget based on 75th percentile of prices
    const sortedPrices = products.map(p => p.price).sort((a, b) => a - b);
    const recommendedBudget = sortedPrices[Math.floor(sortedPrices.length * 0.75)];

    return {
      withinBudget,
      overBudget,
      averagePrice: Math.round(averagePrice * 100) / 100,
      recommendedBudget: Math.round(recommendedBudget * 100) / 100
    };
  }

  private getSearchStrategy(params: StyleSearchParams): string {
    const strategies = [];
    
    if (params.aesthetics.length > 0) {
      strategies.push(`${params.aesthetics.length} aesthetic${params.aesthetics.length > 1 ? 's' : ''}`);
    }
    
    if (params.colors.length > 0) {
      strategies.push(`${params.colors.length} color${params.colors.length > 1 ? 's' : ''}`);
    }
    
    if (params.budget) {
      strategies.push(`$${params.budget} budget`);
    }

    return `Searched using ${strategies.join(', ')} with ${params.searchKeywords.length} specific keywords`;
  }
}

export type { OptimizedProduct, SearchResult, StyleSearchParams };