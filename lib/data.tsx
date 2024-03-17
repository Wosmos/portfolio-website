import React from 'react';
import { CgWorkAlt } from 'react-icons/cg';
import moviesAppImage from '@/public/corpcomment.png';
import bankingAppImage from '@/public/rmtdev.png';
import landingPageImage from '@/public/wordanalytics.png';

import { LuGraduationCap } from 'react-icons/lu';
import {
  FaInstagram,
  FaLinkedin,
  FaGithub,
  FaTwitter,
  FaHtml5,
  FaReact,
  FaNodeJs,
  FaPython,
  FaGitAlt,
  FaBootstrap,
  FaCss3Alt,
  FaHome,
  FaUserAlt,
  FaLaptopCode,
  FaLayerGroup,
  FaProjectDiagram,
  FaBriefcase,
  FaBloggerB,
  FaEnvelope,
  FaSass,
  FaJs,
  FaNode,
} from 'react-icons/fa';

import { IoLogoJavascript } from 'react-icons/io5';
import { BiLogoTypescript, BiLogoMongodb } from 'react-icons/bi';
import { TbBrandFramerMotion, TbBrandNextjs } from 'react-icons/tb';
import { SiTailwindcss, SiRedux, SiAppwrite, SiHashnode, SiTypescript, SiMongodb, SiMaterialdesign, SiFlutter, SiJquery, SiExpress } from 'react-icons/si';
import { link } from 'fs';
import { IconBrandFramerMotion } from '@tabler/icons-react';
export const links = [
  {
    name: 'Home',
    hash: '#home',
    icon: <FaHome />,
  },
  {
    name: 'About',
    hash: '#about',
    icon: <FaUserAlt />,
  },
  {
    name: 'Skills',
    hash: '#skills',
    icon: <FaLaptopCode />,
  },
  {
    name: 'TechStack',
    hash: '#techStack',
    icon: <FaLayerGroup />,
  },
  {
    name: 'Projects',
    hash: '#projects',
    icon: <FaProjectDiagram />,
  },
  {
    name: 'Experience',
    hash: '#experience',
    icon: <FaBriefcase />,
  },
  {
    name: 'Blogs',
    hash: '#blogs',
    icon: <FaBloggerB />,
  },
  {
    name: 'Contact',
    hash: '#contact',
    icon: <FaEnvelope />,
  },
] as const;

export const socialIcons = [
  { icon: <FaInstagram />, link: 'https://www.instagram.com/wosmo_tech/' },
  {
    icon: <FaLinkedin />,
    link: 'https://www.linkedin.com/in/wasif-malik-79205a1bb/',
  },
  { icon: <FaGithub />, link: 'https://github.com/Wosmos' },
  { icon: <SiHashnode />, link: 'https://hashnode.com/@Wosmo' },
] as const;

export const experiencesData = [
  {
    title: 'Freelance Dev',
    location: 'Remote ',
    description:
      'I started my journey as a web developer by freelancing remotely. I gained valuable experience and skills during this time.',
    icon: React.createElement(LuGraduationCap),
    date: '2022 ',
  },
  {
    title: 'React Developer',
    location: 'Remote',
    description:
      'I interned at a startup, where I contributed as a Front-end developer. I worked on their website and helped build components using React and Tailwind CSS.',
    icon: React.createElement(FaReact),
    date: '2021 - present',
  },
] as const;

export const projectsData = [
  {
    title: 'Tech Startup Landing Page',
    description:
      'A simple landing page Ui designed for a Travel Agency. The page showcases the About, service and highlights its features.',
    tags: [
      React.createElement(FaReact),
      React.createElement(IoLogoJavascript),
      React.createElement(SiTailwindcss),
    ],
    imageUrl: landingPageImage,
    sourceCode: 'https://github.com/Wosmos/Travel-app',
    site: 'https://sparkly-fenglisu-c6f2fa.netlify.app/ ',
  },
  {
    title: 'Movies App',
    description:
      'A web application for browsing and discovering movies. Users can search for movies, view details such as ratings and reviews, and save their favorite movies to watch later.',
    tags: [
      React.createElement(FaReact),
      React.createElement(IoLogoJavascript),
      React.createElement(FaSass),
      React.createElement(SiRedux),
    ],
    imageUrl: moviesAppImage,
    sourceCode: '',
    site: 'https://darling-queijadas-e8f108.netlify.app/',
  },

] as const;

// export const Skilldata = [
//   {
//     id: 1,
//     src: web,
//     title: 'Web Development',
//     description:
//       'Crafting captivating websites that attract and retain visitors, driving engagement and conversions.',
//   },
//   {
//     id: 2,
//     src: app,
//     title: 'Mobile App Development',
//     description:
//       'Creating user-friendly mobile apps that enhance customer experiences and streamline processes.',
//   },
//   {
//     id: 3,
//     src: uiux,
//     title: 'UI/UX Design',
//     description:
//       'Designing intuitive interfaces that make interactions seamless and enjoyable for users.',
//   },
//   {
//     id: 4,
//     src: wp,
//     title: 'Creative Writing',
//     description:
//       'Producing compelling content that tells stories, captures attention, and builds brand loyalty.',
//   },
// ] as const;

// export const Blogdata = [
//   {
//     id: 1,
//     src: web,
//     title: 'Sample Title 3',
//     description: 'Lorem ipsum dolor sit amet  minima ',
//     link: 'http://hashnode.com',
//     Date: '30 June 2023',
//   },
//   {
//     id: 2,
//     src: app,
//     title: 'Sample Title 3',
//     description: 'Lorem ipsum dolor sit amet  minima ',
//     link: 'http://hashnode.com',
//     Date: '20 Jun 2023',
//   },
//   // {

// ] as const;

export const techStackIcons = [
  React.createElement(FaHtml5),
  React.createElement(FaCss3Alt),
  React.createElement(FaJs),
  React.createElement(FaReact),
  React.createElement(FaBootstrap),
  React.createElement(SiRedux),
  React.createElement(SiTypescript),
  React.createElement(SiTailwindcss),
  React.createElement(FaNode),
  React.createElement(FaGitAlt),
  React.createElement(SiAppwrite),
  React.createElement(SiMongodb),
  React.createElement(SiMaterialdesign),
  React.createElement(SiFlutter),
  React.createElement(TbBrandFramerMotion),
  React.createElement(SiJquery),
  React.createElement(SiExpress),
  // React.createElement(FaReact),
  //  'HTML',
  // 'CSS',
  // 'Tailwind',
  // 'BootStrap',
  // 'MUI',
  // 'JS',
  // 'Jquery',
  // 'Framer Motion',
  // 'React',
  // 'Redux',
  // 'Next.js',
  // 'TS',
  // 'Node.js',
  // 'Git',
  // 'AppWrite',
  // 'MongoDB',
  // 'Express',
  // 'Flutter',
] as const;
