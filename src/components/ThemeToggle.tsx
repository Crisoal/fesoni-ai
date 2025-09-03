import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-6 right-6 p-3 rounded-full transition-all duration-300 
                 bg-white/10 hover:bg-white/20 backdrop-blur-sm
                 dark:bg-gray-800/50 dark:hover:bg-gray-700/50
                 border border-white/20 dark:border-gray-600/30
                 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-white transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Moon className="w-5 h-5 text-gray-800 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};

export default ThemeToggle;