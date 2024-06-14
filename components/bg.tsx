'use client';
import React, { useState, useEffect } from 'react';

const BackgroundColumns: React.FC = () => {
  const phrases = 'Wosmo Batman Best Astrophile '.repeat(6).trim().split(' ');
  const [columns, setColumns] = useState<JSX.Element[]>([]);

  useEffect(() => {
    const generateColumns = (): JSX.Element[] => {
      const newColumns: JSX.Element[] = [];
      for (let i = 0; i < 20; i++) {
        newColumns.push(
          <ul
            key={i}
            className='opacity-80 text-yellow-400/20 flex mx-[2px] -z-[999]'
          >
            {phrases.map((item, subIndex) => (
              <li key={`${i}-${subIndex}`} className='mx-[3px]'>
                {item}
              </li>
            ))}
          </ul>
        );
      }
      return newColumns;
    };

    setColumns(generateColumns());
  }, [phrases]);

  return (
    <div className='fixed top-0 left-0 w-full h-full flex flex-col justify-between pointer-events-none text-sm'>
      {columns}
    </div>
  );
};

export default BackgroundColumns;
