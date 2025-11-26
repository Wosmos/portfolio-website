import React from 'react';
import {
  CgBriefcase,
  CgCode,
  CgCodeSlash,
  CgFileDocument,
  CgFolder,
  CgLaptop,
  CgMail,
  CgProfile,
  CgWorkAlt,
} from 'react-icons/cg';
import movieSiteImage from '@/public/projectsThumbnails/wovies.png';
import wizmoImage from '@/public/projectsThumbnails/wizmoLandingPage.png';
import wizmo2Image from '@/public/projectsThumbnails/wizmo2.0.png';
import ResumeRight from '@/public/projectsThumbnails/ResumeRight.png';
import travelSiteLandingPageImage from '@/public/projectsThumbnails/travelSiteLandingPage.png';
import JsMiniProjects from '@/public/projectsThumbnails/JsMiniProjects.png';
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
  FaRocket,
  FaCode,
  FaCss3,
  FaJava,
} from 'react-icons/fa';
import { PiNewspaperClippingLight } from 'react-icons/pi';

import { IoPerson } from 'react-icons/io5';

import { IoLogoJavascript } from 'react-icons/io5';
import { BiLogoTypescript, BiLogoMongodb, BiNews } from 'react-icons/bi';
import { TbBrandFramerMotion, TbBrandNextjs } from 'react-icons/tb';
import {
  SiTailwindcss,
  SiRedux,
  SiAppwrite,
  SiHashnode,
  SiTypescript,
  SiMongodb,
  SiMaterialdesign,
  SiFlutter,
  SiJquery,
  SiExpress,
  SiStackoverflow,
  SiOpenai,
  SiReact,
  SiUpstash,
  SiNextdotjs,
  
  SiRedis,
  SiJavascript,
} from 'react-icons/si';
import { link } from 'fs';
import { IconBrandFramerMotion, IconMail } from '@tabler/icons-react';
import {
  MdApi,
  MdArticle,
  MdCode,
  MdEmail,
  MdFolderOpen,
  MdHome,
  MdLayers,
  MdPerson,
  MdWork,
} from 'react-icons/md';
import {
  BsBook,
  BsBriefcase,
  BsCode,
  BsCodeSlash,
  BsEnvelope,
  BsFolder2Open,
  BsHouseDoor,
  BsLaptop,
  BsNewspaper,
  BsPerson,
  BsStackOverflow,
} from 'react-icons/bs';

import { 
  SiFirebase,
  SiGoogle,
  SiVercel
} from 'react-icons/si';

import Wlogo from '@/components/w-logo';
import { Tailwind } from '@react-email/tailwind';
import { Resend } from 'resend';

export const pageLinks = [
  {
    name: 'Home',
    hash: '/',
    icon: <BsHouseDoor />,
  },
  {
    name: 'About',
    hash: '#about',
    icon: <BsPerson />,
  },
  { name: 'Skills', hash: '#skills', icon: <CgLaptop /> },
  { name: 'TechStack', hash: '#techStack', icon: <CgCodeSlash /> },
  {
    name: 'Projects',
    hash: '#projects',
    icon: <BsFolder2Open />,
  },
  {
    name: 'Experience',
    hash: '#experience',
    icon: <CgBriefcase />,
  },
  {
    name: 'Blogs',
    hash: '#blogs',
    icon: <BiNews />,
  },
  {
    name: 'Contact',
    hash: '#contact',
    icon: <BsEnvelope />,
  },
] as const;

export const links = [
  {
    name: 'Home',
    hash: '#home',
    icon: (
      <span className='w-full bg-yellow-100 ml-1  text-right'>
        <Wlogo
          width='50'
          height='25'
          classname='fill-black dark:fill-white stroke-1'
        />
      </span>
    ),
  },
  {
    name: 'About',
    hash: '#about',
    icon: <CgProfile />,
  },
  {
    name: 'Skills',
    hash: '#skills',
    icon: <CgLaptop />,
  },
  {
    name: 'TechStack',
    hash: '#techStack',
    icon: <CgCodeSlash />,
  },
  {
    name: 'Projects',
    hash: '#projects',
    icon: <CgFolder />,
  },
  {
    name: 'Experience',
    hash: '#experience',
    icon: <CgBriefcase />,
  },
  {
    name: 'Blogs',
    hash: '#blogs',
    icon: <CgFileDocument />,
  },
  {
    name: 'Contact',
    hash: '#contact',
    icon: <CgMail />,
  },
] as const;

export const socialIcons = [
  { icon: <FaInstagram />, link: 'https://www.instagram.com/wosmo_tech/' },
  {
    icon: <FaLinkedin />,
    link: 'https://www.linkedin.com/in/wasif-m-79205a1bb/',
  },
  { icon: <FaGithub />, link: 'https://github.com/Wosmos' },
  { icon: <SiHashnode />, link: 'https://hashnode.com/@Wosmo' },
] as const;

export const experiencesData = [
  {
    title: 'Freelance Web Developer',
    location: 'Remote',
    description:
      'Began my professional development career through freelance work, building foundational skills in web development while working with diverse clients and projects remotely.',
    icon: React.createElement(FaLaptopCode),
    date: '2022',
  },
  {
    title: 'Frontend React Developer',
    location: 'Remote',
    description:
      'Contributed to startup growth as a Frontend Developer intern, developing website components and user interfaces using React and Tailwind CSS in an agile environment.',
    icon: React.createElement(FaReact),
    date: '2021 - present',
  },
  {
    title: 'Frontend Developer Intern - LiftUp AI',
    location: 'Jamshoro',
    description:
      'Developed expertise in modern frontend technologies including advanced CSS methodologies and SCSS for maintainable styling architecture. Built interactive React components, implemented state management with Redux, and integrated RESTful APIs to deliver responsive, user-centric web applications.',
    icon: React.createElement(FaRocket),
    date: 'Jan 2024 - Mar 2024',
  },
  {
    title: 'Full Stack Developer - Avialdo Solutions',
    location: 'Karachi',
    description:
      'Currently building scalable web applications with Next.js framework and managing PostgreSQL databases. Actively collaborate with cross-functional teams using Jira for project management and Confluence for documentation in a product-driven development environment.',
    icon: React.createElement(FaCode),
    date: 'Jan 2025 - Present',
  },
] as const;

export const projectsData = [
  {
    title: 'NextSoft Brand Website',
    description:
      'A modern, responsive brand website for NextSoft, a software development company. Built with Next.js, Tailwind CSS, shadcn, the site features smooth animations, a blog section, and a contact form.',
    tags: [
      React.createElement(FaReact),
      React.createElement(IoLogoJavascript),
      React.createElement(SiTailwindcss),
      React.createElement(SiNextdotjs),
      React.createElement(SiTypescript),
      React.createElement(Resend),
      
    ],
    imageUrl: '',
    sourceCode: 'https://github.com/Wosmos/NextSoft-Brand-Website',
    site: 'https://nextsoft-website.vercel.app/',
    isShareable: true,
  },
  {
    title: 'Mini Projects',
    description:
      'A collection of mini intresting projects build with simple html, css and javascript.',
    tags: [
      React.createElement(FaHtml5),
      React.createElement(FaCss3),
      React.createElement(SiTailwindcss),
      React.createElement(SiJavascript),
    ],
    imageUrl: JsMiniProjects,
    sourceCode: 'https://github.com/Wosmos/mini-apps?tab=readme-ov-file',
    site: 'https://wosmos.github.io/mini-apps/main.html',
    isShareable: true,
  },
  {
    title: 'Wovies',
    description:
      'A web application for browsing and discovering movies. Users can search for movies, view details such as ratings and reviews, and save their favorite movies to watch later.',
    tags: [
      React.createElement(FaReact),
      React.createElement(IoLogoJavascript),
      React.createElement(FaSass),
      React.createElement(SiRedux),
      React.createElement(MdApi),
    ],
    imageUrl: movieSiteImage,
    sourceCode: '',
    site: 'https://darling-queijadas-e8f108.netlify.app/',
    isShareable: true,
  },
  {
    title: 'Wizmo',
    description:
      'A web based ai powered summarizer or summary generator, it summarizes any blog inserted in input field just by pasting that blogs url',
    tags: [
      React.createElement(IoLogoJavascript),
      React.createElement(FaReact),
      React.createElement(SiTailwindcss),
      React.createElement(SiOpenai),
    ],
    imageUrl: wizmoImage,
    sourceCode: 'https://github.com/Wosmos/wizmo.git',
    site: 'https://wizmo.netlify.app/',
    isShareable: true,
  },
   {
    title: 'ResumeRight - AI Resume Analyser',
    description: 'AI-powered resume optimisation tool with ATS checks.',
    tags: [
      React.createElement(SiNextdotjs, { key: 'next' }),
      React.createElement(SiTailwindcss, { key: 'tailwind' }),
      React.createElement(SiTypescript, { key: 'typescript' }),
      React.createElement(SiFirebase, { key: 'firebase' }),
      React.createElement(SiGoogle, { key: 'google' }),
      React.createElement(SiVercel, { key: 'vercel' }),
    ],
    imageUrl: ResumeRight,
    sourceCode: 'https://github.com/Wosmos/AI-Resume-checker',
    site: 'https://ai-resume-checker-peach.vercel.app/',
    isShareable: false,
  },
] as const;

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
