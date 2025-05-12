import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';

interface AIInputProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

export default function AIInput({ onSubmit, disabled = false }: AIInputProps) {
  const { isDark } = useTheme();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !disabled) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to build..."
          className={`flex-1 p-2 rounded-lg border ${
            isDark 
              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={!prompt.trim() || disabled}
          className={`px-4 py-2 rounded-lg font-medium ${
            !prompt.trim() || disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          Generate
        </button>
      </div>
    </form>
  );
} 