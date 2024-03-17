import React from 'react';
import cvData from '@/lib/data/cv.json';
import Cv from './cv';
const page = () => {
  return (
    <section className='flex justify-center items-center'>
      <Cv data={cvData} />
    </section>
  );
};

export default page;
