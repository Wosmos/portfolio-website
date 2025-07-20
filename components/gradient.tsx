// 'use client';

// import React from 'react';
// import { motion } from 'framer-motion';

// export const DarkMeshGradient = () => (
//   <div className='fixed inset-0 -z-50 overflow-hidden'>
//     {/* Base Purple Layer */}
//     <div
//       className='absolute h-[150vh] w-[150vw] -top-[25%] -left-[25%] 
//         bg-radial-gradient(at_30%_40%,hsl(260,60%,10%)_0%,transparent_50%)
//         blur-[100px] opacity-50'
//     />

//     {/* Blue-Purple Diagonal Flow */}
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       transition={{ duration: 1.5 }}
//       className='absolute h-[120vh] w-[120vw] -top-[10%] -right-[30%] 
//         bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-indigo-900/50 
//         blur-[150px] rounded-full'
//     />

//     {/* Vertical Depth Gradient */}
//     <div
//       className='fixed inset-0 bg-gradient-to-b from-purple-900/20 to-blue-900/30 
//         backdrop-blur-[2px]'
//     />

//     {/* Animated Purple Core */}
//     <motion.div
//       animate={{
//         scale: [1, 1.2, 1],
//         opacity: [0.8, 1, 0.8],
//       }}
//       transition={{
//         duration: 8,
//         repeat: Infinity,
//         ease: 'easeInOut',
//       }}
//       className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
//         h-[80vh] w-[80vw] bg-radial-gradient(at_50%_50%,hsl(270,70%,15%)_0%,transparent_60%)
//         blur-[120px] opacity-70'
//     />
//   </div>
// );





'use client';
import { motion } from 'framer-motion';

// Core Mesh Component ==================================
export const VortexGradient = ({ darkMode = true }) => (
  <div className='fixed inset-0 -z-50 overflow-hidden'>
    {/* Dark Mode */}
    {darkMode ? (
      <>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1.2 }}
          transition={{
            duration: 15,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
            h-[150vh] w-[150vw] bg-radial-gradient(at_50%_50%,
            hsl(265,60%,15%)_0%,
            hsl(260,70%,10%)_30%,
            hsl(255,80%,5%)_60%) 
            blur-[150px] opacity-50'
        />

        <div
          className='absolute inset-0 bg-[radial-gradient(at_bottom_right,hsl(220,80%,10%),transparent_70%)] 
          backdrop-blur-[2px]'
        />
      </>
    ) : (
      // Light Mode
      <>
        <div
          className='absolute inset-0 bg-radial-gradient(at_50%_50%,
          hsl(260,60%,95%)_0%,
          hsl(255,70%,90%)_30%,
          hsl(250,80%,85%)_60%) 
          blur-[150px] opacity-70'
        />

        <div
          className='absolute inset-0 bg-gradient-to-br from-purple-50/40 via-blue-100/30 to-amber-50/50 
          backdrop-blur-[3px]'
        />
      </>
    )}
  </div>
);

// Supplemental Gradients ==============================
export const HorizonFlow = ({ darkMode = true }) => (
  <motion.div
    initial={{ x: -100 }}
    animate={{ x: 100 }}
    transition={{
      duration: 25,
      repeat: Infinity,
      repeatType: 'mirror',
    }}
    className={`fixed -top-[50%] -left-[25%] h-[200vh] w-[150vw] 
      ${
        darkMode
          ? 'bg-gradient-to-r from-blue-900/20 via-purple-900/30 to-indigo-900/40'
          : 'bg-gradient-to-r from-blue-100/30 via-purple-100/40 to-amber-100/20'
      }
      blur-[120px] opacity-50 -rotate-12 -z-40`}
  />
);

export const DepthVeil = ({ darkMode = true }) => (
  <div
    className={`fixed inset-0 -z-30 
    ${
      darkMode
        ? 'bg-gradient-to-b from-purple-900/10 via-blue-900/15 to-indigo-900/20'
        : 'bg-gradient-to-b from-purple-50/20 via-blue-100/25 to-amber-50/30'
    }
    backdrop-blur-[1px]`}
  />
);

export const ParticleField = ({ darkMode = true }) => (
  <div className='fixed inset-0 -z-20 overflow-hidden'>
    {[...Array(30)].map((_, i) => (
      <motion.div
        key={i}
        className={`absolute h-[1px] w-[1px] rounded-full 
          ${darkMode ? 'bg-purple-300/20' : 'bg-purple-600/20'}`}
        initial={{
          x: Math.random() * 100 + 'vw',
          y: Math.random() * 100 + 'vh',
          scale: 0,
        }}
        animate={{
          x: [0, Math.random() * 100 + 'vw', 0],
          y: [0, Math.random() * 100 + 'vh', 0],
          scale: [0, 1, 0],
        }}
        transition={{
          duration: Math.random() * 10 + 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);