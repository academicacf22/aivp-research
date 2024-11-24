import { useState } from 'react';

export default function AnimatedCard({ children, onClick, className = '' }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className={`
        relative overflow-hidden rounded-lg bg-white shadow-lg transition-all duration-300
        transform hover:scale-[1.02] hover:shadow-xl cursor-pointer
        ${isHovered ? 'ring-2 ring-primary ring-opacity-50' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative z-10 h-full">
        {/* Content Area */}
        {children}
      </div>
      
      {/* Animated Background Gradient */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5
          transition-transform duration-300 ease-in-out
          ${isHovered ? 'scale-110' : 'scale-100'}
        `}
      />
    </div>
  );
}