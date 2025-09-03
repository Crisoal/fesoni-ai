import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
      <span className="text-gray-300">Processing your style preferences...</span>
    </div>
  );
};

export default LoadingSpinner;