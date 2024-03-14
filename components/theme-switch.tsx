'use client';

import { useTheme } from '@/context/theme-context';
import React from 'react';
import { BsMoon, BsSun } from 'react-icons/bs';

export default function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className='fixed bottom-5 right-5 bg-white w-[3rem] h-[3rem] bg-opacity-80 backdrop-blur-[0.5rem] border border-white border-opacity-40  rounded-full flex items-center justify-center hover:scale-[1.15] active:scale-105   dark:bg-gray-950 shadow-black/10 shadow-md transition-all hover:shadow-2xl'
      onClick={toggleTheme}
    >
      {theme === 'light' ? <BsSun /> : <BsMoon />}
    </button>
  );
}
