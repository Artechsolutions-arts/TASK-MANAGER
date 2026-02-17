import logoImage from '../assets/LOGOFA.png';

interface AppotimeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function AppotimeLogo({ size = 'md', showText = false, className = '' }: AppotimeLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-11 h-11',
    xl: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-3xl'
  };
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo ~1.5–1.8x text height, gap ~1/4 logo width (match reference) */}
      <img 
        src={logoImage} 
        alt="Taskfyi Logo" 
        className={`${sizeClasses[size]} object-contain flex-shrink-0`}
      />
      
      {/* Text - smaller than logo */}
      {showText && (
        <span className={`${textSizes[size]} font-bold whitespace-nowrap leading-none ${className.includes('text-white') ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
          Taskfyi
        </span>
      )}
    </div>
  );
}
