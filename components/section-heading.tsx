import React from 'react';

type SectionHeadingProps = {
  children: React.ReactNode;
};

export default function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <h2 className=' text-4xl duration-1000  cursor-default text-edge-outline animate-title font-display sm:text-5xl md:text-6xl font-bold whitespace-nowrap capitalize  md:mb-12 mb-4 text-center'>
      {children}
    </h2>
  );
}
