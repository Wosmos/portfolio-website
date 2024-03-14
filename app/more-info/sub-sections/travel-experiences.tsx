import React from 'react';
import Image from 'next/image';

const travelExperiences = [
  {
    location: 'Bali, Indonesia',
    image: '/bali.jpg',
    description:
      'Exploring the vibrant culture, stunning beaches, and lush landscapes of the Island of the Gods.',
  },
  {
    location: 'Tokyo, Japan',
    image: '/tokyo.jpg',
    description:
      'Immersing myself in the neon-lit streets, delicious cuisine, and fascinating blend of tradition and modernity.',
  },
  {
    location: 'Patagonia, Argentina',
    image: '/patagonia.jpg',
    description:
      "Hiking through the majestic mountains and glaciers of one of the world's most breathtaking natural wonders.",
  },
];

const TravelExperiences = () => {
  return (
    <div className='bg-gray-100 py-12'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <h2 className='text-3xl font-extrabold text-gray-900 mb-6'>
          Travel Experiences
        </h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8'>
          {travelExperiences.map((experience, index) => (
            <div
              key={index}
              className='bg-white rounded-lg shadow-md overflow-hidden'
            >
              <Image
                src={experience.image}
                alt={experience.location}
                width={600}
                height={400}
                className='w-full h-auto'
              />
              <div className='p-6'>
                <h3 className='text-xl font-bold'>{experience.location}</h3>
                <p className='text-gray-600 mt-2'>{experience.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TravelExperiences;
