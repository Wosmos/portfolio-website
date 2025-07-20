import React from 'react';
import { useTheme } from '@/context/theme-context';
import { DepthVeil, HorizonFlow, ParticleField, VortexGradient } from './gradient';

type LayoutProps = {
  children: React.ReactNode;
};

const DynamicLayout: React.FC<LayoutProps> = ({ children }) => {
  const { theme } = useTheme();

  return (
    <div className={`${theme === 'dark' ? 'dark' : 'light'}`}>
      <VortexGradient darkMode={theme === 'dark'} />
      <HorizonFlow darkMode={theme === 'dark'} />
      <DepthVeil darkMode={theme === 'dark'} />
      <ParticleField darkMode={theme === 'dark'} />
      <div className='relative z-10'>{children}</div>
    </div>
  );
};

export default DynamicLayout;
