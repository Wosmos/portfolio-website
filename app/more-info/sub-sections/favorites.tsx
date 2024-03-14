import React from 'react';
import Image from 'next/image';

const favorites = [
  {
    type: 'Book',
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    coverUrl: '/book-cover.jpg',
    description:
      'A story about following your dreams and embracing your destiny.',
  },
  {
    type: 'Movie',
    title: 'Inception',
    director: 'Christopher Nolan',
    coverUrl: '/movie-poster.jpg',
    description: 'A mind-bending sci-fi thriller about the world of dreams.',
  },
  {
    type: 'Music',
    title: 'Melodrama',
    artist: 'Lorde',
    coverUrl: '/album-cover.jpg',
    description:
      'A powerful and emotional album exploring themes of heartbreak and self-discovery.',
  },
];

const FavoriteItems = () => {
  return (
    <div className='bg-white py-12'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <h2 className='text-3xl font-extrabold text-gray-900 mb-6'>
          Favorite Books, Movies, and Music
        </h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8'>
          {favorites.map((favorite, index) => (
            <div
              key={index}
              className='bg-gray-100 rounded-lg shadow-md overflow-hidden transition duration-300 hover:scale-105'
            >
              <Image
                src={favorite.coverUrl}
                alt={favorite.title}
                width={400}
                height={600}
                className='w-full h-auto'
              />
              <div className='p-6'>
                <h3 className='text-xl font-bold'>{favorite.title}</h3>
                <p className='text-gray-600 mt-2'>{favorite.description}</p>
                {favorite.type === 'Book' && (
                  <p className='text-gray-600 mt-2'>by {favorite.author}</p>
                )}
                {favorite.type === 'Movie' && (
                  <p className='text-gray-600 mt-2'>
                    Directed by {favorite.director}
                  </p>
                )}
                {favorite.type === 'Music' && (
                  <p className='text-gray-600 mt-2'>by {favorite.artist}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FavoriteItems;
