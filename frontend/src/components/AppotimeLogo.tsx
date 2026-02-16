import logoImage from '../assets/logo f.png';

interface AppotimeLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function AppotimeLogo({ size = 'md', showText = false, className = '' }: AppotimeLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl'
  };
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Logo Image */}
      <img 
        src={logoImage} 
        alt="Appotime Logo" 
        className={`${sizeClasses[size]} object-contain flex-shrink-0`}
      />
      
      {/* Text - Show conditionally */}
      {showText && (
        <span className={`${textSizes[size]} font-bold whitespace-nowrap ${className.includes('text-white') ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          Appotime
        </span>
      )}
    </div>
  );
}
