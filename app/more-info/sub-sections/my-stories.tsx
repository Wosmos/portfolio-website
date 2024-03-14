import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const stories = [
  {
    title: 'The Great Pasta Incident',
    content:
      'One time, I accidentally spilled an entire pot of spaghetti on my boss during a team lunch. It was a messy situation, but we both ended up laughing hysterically about it.',
  },
  {
    title: 'The Unfortunate Wardrobe Malfunction',
    content:
      "During a job interview, I somehow managed to split the seam of my pants without realizing it. It wasn't until I stood up to leave that I noticed the embarrassing situation. Needless to say, I didn't get the job.",
  },
  {
    title: 'The Epic Dance Battle',
    content:
      "At a friend's wedding, I got a little too carried away on the dance floor and ended up challenging the bride's grandma to a dance-off. Surprisingly, she had some serious moves and showed me up in front of everyone!",
  },
];

const FunnyStories = () => {
  const [expandedStory, setExpandedStory] = useState(null);

  const toggleStory = (index: any): any => {
    setExpandedStory(expandedStory === index ? null : index);
  };

  return (
    <div className=' py-12'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <h2 className='text-3xl font-extrabold text-gray-900 mb-6'>
          Funny Anecdotes or Stories
        </h2>
        <div className='space-y-4'>
          {stories.map((story, index) => (
            <div key={index} className=' rounded-xl shadow-md p-6'>
              <div
                className='flex justify-between items-center cursor-pointer'
                onClick={() => toggleStory(index)}
              >
                <h3 className='text-xl font-bold'>{story.title}</h3>
                {expandedStory === index ? (
                  <FaChevronUp className='text-gray-600' />
                ) : (
                  <FaChevronDown className='text-gray-600' />
                )}
              </div>
              {expandedStory === index && (
                <p className='text-gray-600 mt-4'>{story.content}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FunnyStories;
