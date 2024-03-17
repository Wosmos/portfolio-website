'use client';
import './styles.css';
import React, { useState } from 'react';

const Cv = ({ data }: any) => {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <section className='w-[700px] bg-white/60 dark:bg-black/30 shadow-md p-6 rounded-sm'>
      <div
        className={`container mx-auto px-4 py-8 ${
          theme === 'dark' ? 'dark' : ''
        }`}
      >
        <div className='header mb-8 '>
          <h2 className='text-2xl font-semibold mb-2 border-l-4 pl-2 border-blue-500'>
            {data.firstName} {data.lastName}
          </h2>
          <div className='flex items-center mb-4'>
            <span className='mr-2'>
              <strong>Email:</strong>
            </span>
            <span>{data.email}</span>
            <span className='mx-4'>|</span>
            <span className='mr-2'>
              <strong>Phone:</strong>
            </span>
            <span>{data.phone}</span>
          </div>
          <div>
            <p className='text-3xl font-bold mb-2 border-l-4 pl-2 border-blue-500'>
              {data.position}
            </p>
            <p>{data.description}</p>
          </div>
        </div>
        <div className='details'>
          {data.sections.map((section: any, index: any) => (
            <div key={index} className='section mb-8'>
              <h2 className='text-3xl font-bold mb-2 border-l-4 pl-2 border-blue-500'>
                {section.title}
              </h2>
              <div className='section__list'>
                {section.title === 'Skills' ? (
                  <div className='flex flex-wrap'>
                    {section.items.map((item: any, subIndex: any) => (
                      <div
                        key={subIndex}
                        className='w-full md:w-1/2 mb-4 flex items-center'
                      >
                        <div className='w-1/4 pr-4 text-right'>
                          <div className='font-semibold'>{item.name}</div>
                        </div>
                        <div className='w-3/4'>
                          <div className='dark:bg-gray-200/20 bg-black/20 h-2 mx-2   rounded-full overflow-hidden'>
                            <div
                              className='bg-blue-500 h-2 rounded-full '
                              style={{ width: `${item.level}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : section.title === 'Interests' ? (
                  <ul className='pl-8'>
                    {section.items.map((item: any, subIndex: any) => (
                      <li key={subIndex} className='custom-list-item '>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  section.items.map((item: any, subIndex: any) => (
                    <div key={subIndex} className='section__list-item mb-4'>
                      <div className='flex mb-2'>
                        {/* First column */}
                        <div className='w-1/2 pr-4'>
                          <div className='font-semibold'>{item.name}</div>
                          <div>{item.address}</div>
                          <div>{item.duration}</div>
                        </div>
                        {/* Second column */}
                        <div className='w-1/2'>
                          <div className='font-semibold '>{item.position}</div>
                          <div className=''>{item.description} </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Cv;
