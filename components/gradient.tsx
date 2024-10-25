// export const BluePinkGradient = () => (
//   <div className='bg-gradient-to-tl from-blue-300 via-purple-200 to-pink-300 absolute top-[-1rem] -z-10 left-[-35rem] h-[31.25rem] w-[50rem] rounded-full blur-[15rem] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem] dark:bg-gradient-to-tl dark:from-blue-100 dark:via-purple-900  dark:to-blue-900'></div>
// );

// export const BluePurpleGradient = () => (
//   <div className='bg-gradient-to-tl from-blue-300 via-purple-200 to-pink-300 absolute top-[-1rem] -z-10 left-[-35rem] h-[31.25rem] w-[50rem] rounded-full blur-[15rem] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem] dark:bg-gradient-to-tl dark:from-blue-100 dark:via-purple-900  dark:to-blue-900'></div>
// );

// export const LightDarkGradient = () => (
//   <div className='bg-[#e2e2fb] absolute top-[-6rem] -z-10 right-[11rem] h-[31.25rem] w-[31.25rem] rounded-full blur-[10rem] sm:w-[68.75rem] dark:bg-[#280364]'></div>
// );

// export const DarkLightGradient = () => (
//   <div className='bg-[#e2e2fb] absolute top-[-6rem] -z-10 right-[11rem] h-[31.25rem] w-[31.25rem] rounded-full blur-[10rem] sm:w-[68.75rem] dark:bg-[#a7037e]'></div>
// );
// export const LightPurpleGradient = () => (
//   <div className='bg-[#8989f9d4] absolute bottom-0 -z-10 right-[11rem] h-[31.25rem] w-[31.25rem] rounded-full blur-[10rem] sm:w-[68.75rem] dark:bg-[#460556]'></div>
// );

// export const BluePinkDiagonalGradient = () => (
//   <div className='absolute bg-gradient-to-br from-blue-300 via-purple-200 to-pink-300  bottom-0 right-0 -z-10 left-[-35rem] h-[31.25rem] w-[50rem] rounded-full blur-[15rem] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem] dark:bg-gradient-to-bl dark:from-blue-100 dark:via-purple-900  dark:to-blue-900'></div>
// );



import React from 'react';

// Type for gradient component props
type GradientProps = {
  className?: string;
};

export const BluePinkGradient: React.FC<GradientProps> = ({ className }) => (
  <div
    className={`bg-gradient-to-tl from-cyan-200 via-blue-300 to-pink-400 absolute top-[-1rem] -z-10 left-[-35rem] h-[31.25rem] w-[50rem] rounded-full blur-[15rem] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem] dark:bg-gradient-to-tl dark:from-cyan-300 dark:via-indigo-700 dark:to-purple-900 ${
      className || ''
    }`}
  />
);

export const BluePurpleGradient: React.FC<GradientProps> = ({ className }) => (
  <div
    className={`bg-gradient-to-br from-blue-400 via-purple-300 to-indigo-500 absolute top-[-1rem] -z-10 left-[-35rem] h-[31.25rem] w-[50rem] rounded-full blur-[15rem] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem] dark:bg-gradient-to-br dark:from-indigo-400 dark:via-purple-800 dark:to-blue-900 ${
      className || ''
    }`}
  />
);

export const LightDarkGradient: React.FC<GradientProps> = ({ className }) => (
  <div
    className={`bg-[#f5f5fa] absolute top-[-6rem] -z-10 right-[11rem] h-[31.25rem] w-[31.25rem] rounded-full blur-[10rem] sm:w-[68.75rem] dark:bg-[#1a1a2e] ${
      className || ''
    }`}
  />
);

export const DarkLightGradient: React.FC<GradientProps> = ({ className }) => (
  <div
    className={`bg-[#ececf9] absolute top-[-6rem] -z-10 right-[11rem] h-[31.25rem] w-[31.25rem] rounded-full blur-[10rem] sm:w-[68.75rem] dark:bg-[#6b0f1a] ${
      className || ''
    }`}
  />
);

export const LightPurpleGradient: React.FC<GradientProps> = ({ className }) => (
  <div
    className={`bg-[#b5a4fc] absolute bottom-0 -z-10 right-[11rem] h-[31.25rem] w-[31.25rem] rounded-full blur-[10rem] sm:w-[68.75rem] dark:bg-[#320c58] ${
      className || ''
    }`}
  />
);

export const TealGoldDiagonalGradient: React.FC<GradientProps> = ({
  className,
}) => (
  <div
    className={`absolute bg-gradient-to-br from-teal-300 via-yellow-200 to-amber-500 bottom-0 right-0 -z-10 left-[-35rem] h-[31.25rem] w-[50rem] rounded-full blur-[15rem] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem] dark:bg-gradient-to-bl dark:from-teal-500 dark:via-yellow-600 dark:to-amber-700 ${
      className || ''
    }`}
  />
);
