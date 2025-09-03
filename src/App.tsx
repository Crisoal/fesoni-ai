import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-black dark:bg-white text-white dark:text-gray-900 transition-colors duration-300">
        <ThemeToggle />
        <ChatInterface />
      </div>
    </ThemeProvider>
  );
}

export default App;