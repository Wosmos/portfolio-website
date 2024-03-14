import React from 'react';
import { FaCamera, FaHiking, FaMusic } from 'react-icons/fa';

const hobbies = [
  {
    icon: <FaCamera className='text-4xl text-indigo-500' />,
    title: 'Photography',
    description: 'Capturing moments and telling stories through the lens.',
  },
  {
    icon: <FaHiking className='text-4xl text-green-500' />,
    title: 'Hiking',
    description: 'Exploring nature and getting lost in the great outdoors.',
  },
  {
    icon: <FaMusic className='text-4xl text-purple-500' />,
    title: 'Music',
    description: 'Listening to and playing a variety of musical genres.',
  },
];

const HobbiesAndInterests = () => {
  return (
    <div className='bg-gray-100 py-12'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <h2 className='text-3xl font-extrabold text-gray-900 mb-6'>
          Hobbies and Interests
        </h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8'>
          {hobbies.map((hobby, index) => (
            <div
              key={index}
              className='bg-white rounded-lg shadow-md p-6 flex flex-col items-center'
            >
              {hobby.icon}
              <h3 className='text-xl font-bold mt-4'>{hobby.title}</h3>
              <p className='text-gray-600 mt-2 text-center'>
                {hobby.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HobbiesAndInterests;
