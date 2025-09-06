// src/components/ProductCard.tsx

import React from 'react';
import { Star, Timer as Prime, ExternalLink, ShoppingBag } from 'lucide-react';

interface Product {
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
  category?: string; // Added category field
}

interface ProductCardProps {
  product: Product;
  showSimilarityScore?: boolean;
  similarityScore?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  showSimilarityScore = false, 
  similarityScore 
}) => {
  const hasDiscount = product.retail_price > 0 && product.price < product.retail_price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.retail_price - product.price) / product.retail_price) * 100)
    : 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-4 h-4 text-yellow-400" style={{ clipPath: 'inset(0 50% 0 0)' }} />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-600" />
      );
    }

    return stars;
  };

  return (
    <div className="bg-gray-800/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 
                    rounded-xl overflow-hidden hover:border-purple-500/30 transition-all duration-300 
                    hover:shadow-lg hover:shadow-purple-500/10 group min-w-[220px] w-[220px] flex-shrink-0">
      
      {/* Image */}
      <div className="relative overflow-hidden h-48 bg-gray-900">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-gray-500" />
          </div>
        )}
        
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{discountPercentage}%
          </div>
        )}

        {product.prime && (
          <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center space-x-1">
            <Prime className="w-3 h-3" />
            <span>Prime</span>
          </div>
        )}

        {/* Similarity Score Badge */}
        {showSimilarityScore && similarityScore !== undefined && (
          <div className={`absolute bottom-3 left-3 text-white text-xs font-bold px-2 py-1 rounded-full ${
            similarityScore >= 0.9 ? 'bg-green-600' :
            similarityScore >= 0.7 ? 'bg-yellow-600' :
            'bg-orange-600'
          }`}>
            {Math.round(similarityScore * 100)}% match
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Category */}
        {product.category && (
          <div className="flex items-center justify-between">
            <span className="bg-purple-500/20 text-purple-300 text-xs font-medium px-2 py-1 rounded-full">
              {product.category}
            </span>
          </div>
        )}

        <h3 className="text-white font-medium text-sm leading-snug line-clamp-2">
          {product.title}
        </h3>

        {/* Rating and Reviews */}
        {product.rating > 0 && (
          <div className="flex items-center space-x-2">
            <div className="flex">{renderStars(product.rating)}</div>
            <span className="text-yellow-400 text-sm font-medium">{product.rating}</span>
            {product.reviews > 0 && (
              <span className="text-gray-400 text-sm">({product.reviews.toLocaleString()})</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center space-x-2">
          <span className="text-white font-bold text-lg">
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-gray-400 line-through text-sm">
              {formatPrice(product.retail_price)}
            </span>
          )}
        </div>

        {/* Delivery */}
        {product.delivery_message && (
          <p className="text-green-400 text-xs">
            {product.delivery_message}
          </p>
        )}

        {/* View Button */}
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 
                     text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 
                     transition-all duration-200 text-sm font-medium group/btn"
        >
          <span>View on Amazon</span>
          <ExternalLink className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
        </a>
      </div>
    </div>
  );
};

export default ProductCard;