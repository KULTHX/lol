
import React from 'react';

export const LoadingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1 rtl:space-x-reverse">
    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce"></div>
  </div>
);
