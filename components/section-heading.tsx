import React from 'react';

type SectionHeadingProps = {
  children: React.ReactNode;
};

export default function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <h2 className='text-6xl font-semibold capitalize md-8 md:mb-12 text-center'>
      {children}
    </h2>
  );
}
