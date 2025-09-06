import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Target, Shuffle } from 'lucide-react';
import { AmazonProduct } from '../services/amazonService';

interface BudgetBreakdown {
  totalCost: number;
  savings: number;
  originalTotal: number;
  allocation: Array<{
    category: string;
    amount: number;
    percentage: number;
    recommendation: 'splurge' | 'save' | 'balanced';
  }>;
}

interface OptimizedProduct extends AmazonProduct {
  similarity_score: number;
  price_tier: 'budget' | 'mid' | 'premium';
  alternative_products?: AmazonProduct[];
}

interface BudgetOptimizerProps {
  products: OptimizedProduct[];
  budget?: number;
  onProductsUpdate: (products: OptimizedProduct[]) => void;
}

const BudgetOptimizer: React.FC<BudgetOptimizerProps> = ({
  products,
  budget,
  onProductsUpdate
}) => {
  const [showAlternatives, setShowAlternatives] = useState<string | null>(null);
  const [optimizationMode, setOptimizationMode] = useState<'balanced' | 'budget' | 'quality'>('balanced');

  const calculateBudgetBreakdown = (): BudgetBreakdown => {
    const totalCost = products.reduce((sum, product) => sum + product.price, 0);
    const originalTotal = products.reduce((sum, product) => sum + (product.retail_price || product.price), 0);
    const savings = originalTotal - totalCost;

    // Group products by category for allocation
    const categoryTotals: { [key: string]: number } = {};
    products.forEach(product => {
      const category = product.category || 'Fashion';
      categoryTotals[category] = (categoryTotals[category] || 0) + product.price;
    });

    const allocation = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalCost) * 100,
      recommendation: getRecommendation(category, amount, totalCost)
    }));

    return {
      totalCost,
      savings,
      originalTotal,
      allocation
    };
  };

  const getRecommendation = (category: string, amount: number, total: number): 'splurge' | 'save' | 'balanced' => {
    const percentage = (amount / total) * 100;
    
    // Investment pieces (outerwear, bags) should get higher allocation
    if (['Outerwear', 'Bags', 'Shoes'].includes(category)) {
      return percentage > 40 ? 'splurge' : 'balanced';
    }
    
    // Trendy items should be budget-friendly
    if (['Accessories', 'Jewelry'].includes(category)) {
      return percentage > 20 ? 'save' : 'balanced';
    }
    
    return 'balanced';
  };

  const optimizeForBudget = (targetBudget: number) => {
    const currentTotal = products.reduce((sum, product) => sum + product.price, 0);
    
    if (currentTotal <= targetBudget) return;

    // Sort products by price descending to optimize expensive items first
    const sortedProducts = [...products].sort((a, b) => b.price - a.price);
    const optimizedProducts: OptimizedProduct[] = [];
    let remainingBudget = targetBudget;

    sortedProducts.forEach(product => {
      if (remainingBudget >= product.price) {
        optimizedProducts.push(product);
        remainingBudget -= product.price;
      } else {
        // Find cheaper alternative
        const alternatives = product.alternative_products || [];
        const affordableAlternative = alternatives.find(alt => alt.price <= remainingBudget);
        
        if (affordableAlternative) {
          optimizedProducts.push({
            ...affordableAlternative,
            similarity_score: product.similarity_score * 0.8, // Slightly lower similarity
            price_tier: 'budget',
            alternative_products: alternatives
          });
          remainingBudget -= affordableAlternative.price;
        }
      }
    });

    onProductsUpdate(optimizedProducts);
  };

  const swapProduct = (productId: string, alternativeIndex: number) => {
    const updatedProducts = products.map(product => {
      if (product.product_id === productId && product.alternative_products) {
        const alternative = product.alternative_products[alternativeIndex];
        return {
          ...alternative,
          similarity_score: product.similarity_score * 0.9,
          price_tier: alternative.price < product.price ? 'budget' : 'premium',
          alternative_products: product.alternative_products
        };
      }
      return product;
    });
    
    onProductsUpdate(updatedProducts);
  };

  const breakdown = calculateBudgetBreakdown();
  const isOverBudget = budget && breakdown.totalCost > budget;

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Budget Overview</h3>
          </div>
          
          {budget && (
            <div className="text-right">
              <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
                ${breakdown.totalCost.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">
                of ${budget.toFixed(2)} budget
              </div>
            </div>
          )}
        </div>

        {/* Budget Bar */}
        {budget && (
          <div className="mb-4">
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  isOverBudget ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((breakdown.totalCost / budget) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>$0</span>
              <span>${budget.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Savings Display */}
        {breakdown.savings > 0 && (
          <div className="flex items-center space-x-2 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
            <TrendingDown className="w-4 h-4 text-green-400" />
            <span className="text-green-300">
              You're saving ${breakdown.savings.toFixed(2)} from retail prices!
            </span>
          </div>
        )}

        {/* Over Budget Warning */}
        {isOverBudget && (
          <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-red-400" />
              <span className="text-red-300">
                Over budget by ${(breakdown.totalCost - budget!).toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => optimizeForBudget(budget!)}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            >
              Optimize
            </button>
          </div>
        )}
      </div>

      {/* Budget Allocation */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Budget Allocation</h3>
        
        <div className="space-y-3">
          {breakdown.allocation.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="font-medium text-white">{item.category}</div>
                  <div className="text-sm text-gray-400">
                    {item.percentage.toFixed(1)}% of total budget
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-semibold text-white">${item.amount.toFixed(2)}</div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  item.recommendation === 'splurge' 
                    ? 'bg-purple-900/50 text-purple-300'
                    : item.recommendation === 'save'
                    ? 'bg-green-900/50 text-green-300'
                    : 'bg-blue-900/50 text-blue-300'
                }`}>
                  {item.recommendation === 'splurge' ? 'Investment' : 
                   item.recommendation === 'save' ? 'Save Here' : 'Balanced'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optimization Controls */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Optimization Strategy</h3>
        
        <div className="flex space-x-2 mb-4">
          {[
            { id: 'balanced', label: 'Balanced', icon: Target },
            { id: 'budget', label: 'Budget Focus', icon: TrendingDown },
            { id: 'quality', label: 'Quality Focus', icon: TrendingUp }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setOptimizationMode(id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                optimizationMode === id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-400">
          {optimizationMode === 'balanced' && 'Mix of quality and budget-friendly options'}
          {optimizationMode === 'budget' && 'Prioritize lowest prices while maintaining style'}
          {optimizationMode === 'quality' && 'Focus on higher-quality, investment pieces'}
        </div>
      </div>

      {/* Product Alternatives */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Smart Substitutions</h3>
        
        {products.map((product) => (
          <div key={product.product_id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-start space-x-4">
              <img
                src={product.image}
                alt={product.title}
                className="w-16 h-16 object-cover rounded-lg"
              />
              
              <div className="flex-1">
                <h4 className="font-medium text-white line-clamp-2">{product.title}</h4>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-lg font-semibold text-green-400">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    product.similarity_score >= 0.9 ? 'bg-green-900/50 text-green-300' :
                    product.similarity_score >= 0.7 ? 'bg-yellow-900/50 text-yellow-300' :
                    'bg-orange-900/50 text-orange-300'
                  }`}>
                    {Math.round(product.similarity_score * 100)}% match
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    product.price_tier === 'budget' ? 'bg-blue-900/50 text-blue-300' :
                    product.price_tier === 'premium' ? 'bg-purple-900/50 text-purple-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {product.price_tier}
                  </span>
                </div>
              </div>
              
              {product.alternative_products && product.alternative_products.length > 0 && (
                <button
                  onClick={() => setShowAlternatives(
                    showAlternatives === product.product_id ? null : product.product_id
                  )}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Alternatives</span>
                </button>
              )}
            </div>
            
            {/* Alternative Products */}
            {showAlternatives === product.product_id && product.alternative_products && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {product.alternative_products.slice(0, 4).map((alt, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer"
                      onClick={() => swapProduct(product.product_id, index)}
                    >
                      <img
                        src={alt.image}
                        alt={alt.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-white line-clamp-1">{alt.title}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-semibold text-green-400">
                            ${alt.price.toFixed(2)}
                          </span>
                          {alt.price < product.price && (
                            <span className="text-xs text-green-300">
                              Save ${(product.price - alt.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetOptimizer;