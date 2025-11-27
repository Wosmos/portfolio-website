'use client';

interface LoadingSpinnerProps {
  className?: string;
}

const LoadingSpinner = ({ className = "" }: LoadingSpinnerProps) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <div className="w-12 h-12 border-4 border-cosmic-border rounded-full animate-spin border-t-cosmic-primary"></div>
        <div className="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-pulse border-t-cosmic-secondary" style={{ animationDelay: '0.5s' }}></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;