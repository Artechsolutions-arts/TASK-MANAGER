import logoImage from '../assets/LOGOA.png';

interface AppotimeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function AppotimeLogo({ size = 'md', showText = false, className = '' }: AppotimeLogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-9 h-9',
    xl: 'w-10 h-10'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-3xl'
  };
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Image - same height as text for balanced look */}
      <img 
        src={logoImage} 
        alt="Taskfyi Logo" 
        className={`${sizeClasses[size]} object-contain flex-shrink-0`}
      />
      
      {/* Text - Show conditionally, same visual size as icon */}
      {showText && (
        <span className={`${textSizes[size]} font-bold whitespace-nowrap leading-none ${className.includes('text-white') ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
          Taskfyi
        </span>
      )}
    </div>
  );
}
