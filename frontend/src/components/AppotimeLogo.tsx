import logoImage from '../assets/LOGOA.png';

interface AppotimeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function AppotimeLogo({ size = 'md', showText = false, className = '' }: AppotimeLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-xl'
  };
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Image - larger than text */}
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
