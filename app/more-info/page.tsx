'use client';

import React from 'react';

import SectionHeading from '@/components/section-heading';
import FavoriteFoods from './sub-sections/food';
import FavoriteItems from './sub-sections/favorites';
import HobbiesAndInterests from './sub-sections/hobbies';
import FunnyStories from './sub-sections/my-stories';
import TravelExperiences from './sub-sections/travel-experiences';

const page = () => {
  return (
    <div className='w-full   text-center sm:mb-0  flex flex-col justify-center items-center'>
      <div className='max-w-[68rem] scroll-mt-[100rem]'>
        <SectionHeading>More About Me</SectionHeading>
        <FavoriteFoods />
        <FavoriteItems />
        <HobbiesAndInterests />
        <FunnyStories />
        <TravelExperiences />
      </div>
    </div>
  );
};

export default page;
