
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-lg' },
    md: { icon: 'w-10 h-10', text: 'text-2xl' },
    lg: { icon: 'w-20 h-20', text: 'text-4xl' }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizes[size].icon} relative flex items-center justify-center`}>
        {/* Background Glow */}
        <div className="absolute inset-0 bg-indigo-600 blur-lg opacity-20 rounded-full animate-pulse"></div>
        
        {/* Main Icon */}
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
          <rect width="40" height="40" rx="12" fill="url(#logo-gradient)" />
          {/* Stylized 'F' + Growth Bars */}
          <path d="M12 28V12H28" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 20H24" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18 28H30" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          
          <defs>
            <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#4338ca" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {showText && (
        <span className={`${sizes[size].text} font-black text-slate-900 tracking-tighter`}>
          Finance<span className="text-indigo-600">Pro</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
