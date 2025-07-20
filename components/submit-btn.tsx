import React from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import { experimental_useFormStatus as useFormStatus } from 'react-dom';

export default function SubmitBtn() {
  const { pending } = useFormStatus();

  return (
    <button
      type='submit'
      className={`group flex items-center justify-center gap-2 h-[3rem] w-full md:w-[10rem] rounded-full outline-none transition-all 
        focus:scale-[1.02] hover:scale-[1.02] active:scale-[1.01] disabled:scale-100 disabled:cursor-not-allowed
        bg-purple-600 text-white font-medium
        hover:shadow-lg hover:shadow-blue-500/30
        focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
        dark:from-blue-700 dark:to-blue-600 dark:hover:shadow-blue-700/30
        dark:focus:ring-blue-500 dark:focus:ring-offset-gray-800 
            hover:bg-purple-700 
             duration-300 
            shadow-lg shadow-purple-500/50 
           
            dark:bg-purple-800 
            dark:hover:bg-purple-700

        ${pending ? 'opacity-80' : 'opacity-100'}`}
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <div className='flex items-center justify-center gap-2'>
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
          <span>Sending...</span>
        </div>
      ) : (
        <>
          <span>Send Message</span>
          <FaPaperPlane className='text-xs transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
        </>
      )}
    </button>
  );
}