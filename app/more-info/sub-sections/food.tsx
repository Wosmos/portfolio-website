import React from 'react';
import Image from 'next/image';

const favoriteFoods = [
  {
    name: 'Margherita Pizza',
    image: '/pizza.jpg',
    description:
      'A classic Italian pizza with fresh basil, tomatoes, and mozzarella cheese.',
    recipeUrl: 'https://www.example.com/margherita-pizza-recipe',
  },
  {
    name: 'Sushi Rolls',
    image: '/sushi.jpg',
    description:
      'A delicious assortment of sushi rolls with fresh fish and vegetables.',
    recipeUrl: 'https://www.example.com/sushi-rolls-recipe',
  },
  {
    name: 'Chocolate Chip Cookies',
    image: '/cookies.jpg',
    description:
      'Soft, chewy, and loaded with chocolate chips – the perfect treat!',
    recipeUrl: 'https://www.example.com/chocolate-chip-cookies-recipe',
  },
];

const FavoriteFoods = () => {
  return (
    <div className='bg-transparent py-12'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <h2 className='text-4xl font-bold text-white mb-12 text-center'>
          Favorite Foods and Recipes
        </h2>
        <div className=' flex flex-wrap justify-center gap-4'>
          {favoriteFoods.map((food, index) => (
            <div
              key={index}
              className='overflow-hidden shadow-lg transition-transform transform hover:scale-105 flex flex-col items-start gap-4 duration-300 group px-8 pt-16 pb-4 bg-white/20 borderBlack rounded-xl py-3 dark:bg-white/10 dark:text-white/80 group cursor-pointer'
              style={{ minWidth: '250px', maxWidth: '300px' }}
            >
              <div className='relative h-44'>
                <Image
                  src={food.image}
                  alt={food.name}
                  fill
                  className='object-cover'
                />
              </div>
              <div className='p-6 flex-grow'>
                <h3 className='text-xl font-bold mb-2'>{food.name}</h3>
                <p className='text-gray-600 mb-4'>{food.description}</p>
                <a
                  href={food.recipeUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='justify-center shadow-xl  duration-300
      group bg-gray-900 text-white px-7 py-3 flex items-center gap-3 rounded-xl outline-none focus:scale-110 hover:scale-110 hover:bg-gray-950 active:scale-105 transition '
                >
                  Get Recipe
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FavoriteFoods;
