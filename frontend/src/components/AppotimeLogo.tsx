import logoImage from '../assets/LOGOA.png';

interface AppotimeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function AppotimeLogo({ size = 'md', showText = false, className = '' }: AppotimeLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-2xl'
  };
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Image - ring for visibility on dark backgrounds */}
      <img 
        src={logoImage} 
        alt="Taskfyi Logo" 
        className={`${sizeClasses[size]} object-contain flex-shrink-0`}
      />
      
      {/* Text - Show conditionally, high contrast in dark mode */}
      {showText && (
        <span className={`${textSizes[size]} font-bold whitespace-nowrap ${className.includes('text-white') ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
          Taskfyi
        </span>
      )}
    </div>
  );
}
