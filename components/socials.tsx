import React from 'react';

const Socials = ({ socialIcons, showLines }: { socialIcons: any; showLines: boolean }) => {
  return (
    <>
      <div className='flex w-full justify-center items-center gap-2'>
        {showLines && (
          <>
            <div className='hidden md:block w-1/3 h-[2px] bg-gray-200 dark:bg-opacity-20 rounded-lg'></div>
          </>
        )}
        {socialIcons.map((item: any, index: any) => (
          <a
            key={index}
            href={item.link}
            className='group w-10 h-10 bg-gray-900 text-white flex justify-center items-center rounded-full outline-none focus:scale-110 hover:scale-110 hover:bg-gray-950 active:scale-105 text-xl mr-2 shadow-black/10 shadow-md transition-all hover:shadow-2xl'
          >
            {item.icon}
          </a>
        ))}
        {showLines && (
          <>
            <div className='hidden md:block w-1/3 h-[2px] bg-gray-200 dark:bg-opacity-20 rounded-lg'></div>
          </>
        )}
      </div>
    </>
  );
};

export default Socials;
