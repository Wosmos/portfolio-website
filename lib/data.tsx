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
import moviesAppImage from '@/public/corpcomment.png';
import bankingAppImage from '@/public/rmtdev.png';
import landingPageImage from '@/public/wordanalytics.png';
import { PiNewspaperFill } from 'react-icons/pi';
import Whome from '@/public/logo.png';
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
} from 'react-icons/si';
import { link } from 'fs';
import { IconBrandFramerMotion, IconMail } from '@tabler/icons-react';
import {
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
import Wlogo from '@/components/w-logo';
import { Tailwind } from '@react-email/tailwind';

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
  {
    title: 'Wizmo',
    description:
      'A web based ai powered summarizer or summary generator, it summarizes any blog inserted in input field just by pasting that blogs url',
    tags: [
      React.createElement(IoLogoJavascript),
      React.createElement(FaReact),
      React.createElement(Tailwind),
      React.createElement(SiOpenai),
    ],
    imageUrl: moviesAppImage,
    sourceCode: '',
    site: 'https://darling-queijadas-e8f108.netlify.app/',
  },
  {
    title: 'Wizmo 2.0',
    description:
      'A web based ai powered summarizer or summary generator, it summarizes any blog inserted in input field just by pasting that blogs url',
    tags: [
      React.createElement(IoLogoJavascript),
      React.createElement(FaReact),
      React.createElement(Tailwind),
      React.createElement(SiOpenai),
    ],
    imageUrl: moviesAppImage,
    sourceCode: '',
    site: 'https://darling-queijadas-e8f108.netlify.app/',
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
