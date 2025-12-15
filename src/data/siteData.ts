// Site-wide static data
export const siteData = {
  personal: {
    name: "Wasif Malik",
    title: "Cosmic Engineer",
    tagline: "Full Stack Engineer",
    description: "Full Stack Engineer crafting digital experiences with Next.js, Flutter, and AI. Building the future, one line of code at a time.",
    location: "Karachi, Pakistan",
    timezone: "UTC+5 (PKT)",
    email: "m.wasifmalik17@gmail.com",
    phone: "+92 306 224 8224",
    cvUrl: "/my-cv.pdf",
    status: "AVAILABLE FOR HIRE",
  },

  social: {
    github: "https://github.com/Wosmos",
    linkedin: "https://www.linkedin.com/in/wasif-m-79205a1bb/",
    instagram: "https://www.instagram.com/wosmo_tech/",
    hashnode: "https://hashnode.com/@Wosmo",
  },

  hero: {
    typedStrings: [
      'Crafting digital <span class="text-cyan-400">universes</span>.',
      'Building with <span class="text-blue-400">Next.js</span> & <span class="text-purple-400">AI</span>.',
      'Engineering <span class="text-green-400">elegant</span> solutions.'
    ],
  },

  about: {
    bio: "Software Engineering student passionate about bridging design and functionality. Crafting intuitive interfaces with React Native and building robust backends with Node.js. Currently exploring Generative AI and modern web technologies.",
    stats: {
      repositories: "45+",
      experience: "2+ Years Experience",
      education: "Software Engineering",
    },
    currentFocus: {
      title: "LEARNING",
      topic: "System Design & LLM Agents",
      progress: 75,
    },
    skills: [
      { name: "FRONTEND", percentage: 95, color: "from-cyan-400 to-blue-500" },
      { name: "BACKEND", percentage: 88, color: "from-green-400 to-emerald-500" },
      { name: "MOBILE", percentage: 92, color: "from-purple-400 to-pink-500" },
      { name: "AI/ML", percentage: 85, color: "from-orange-400 to-red-500" },
    ],
  },

  experience: [
    {
      title: "Full Stack Developer",
      company: "Avialdo Solutions",
      location: "Karachi",
      period: "Jan 2025 - Present",
      description: "Currently building scalable web applications with Next.js framework and managing PostgreSQL databases. Actively collaborate with cross-functional teams using Jira for project management and Confluence for documentation in a product-driven development environment.",
      technologies: ["Next.js 14", "PostgreSQL", "Microservices", "Jira"],
      dotColor: "#00d4ff",
      periodColor: "#00d4ff"
    },
    {
      title: "Frontend Developer Intern",
      company: "LiftUp AI",
      location: "Jamshoro",
      period: "Jan 2024 - Mar 2024",
      description: "Developed expertise in modern frontend technologies including advanced CSS methodologies and SCSS for maintainable styling architecture. Built interactive React components, implemented state management with Redux, and integrated RESTful APIs to deliver responsive, user-centric web applications.",
      technologies: ["React.js", "SCSS", "Redux", "REST APIs"],
      dotColor: "#7c3aed",
      periodColor: "#a855f7"
    },
    {
      title: "Frontend React Developer",
      company: "Remote",
      location: "Remote",
      period: "2021 - Present",
      description: "Contributed to startup growth as a Frontend Developer intern, developing website components and user interfaces using React and Tailwind CSS in an agile environment.",
      technologies: ["React", "Tailwind CSS", "Agile"],
      dotColor: "#6366f1",
      periodColor: "#6366f1"
    },
    {
      title: "Freelance Web Developer",
      company: "Remote",
      location: "Remote",
      period: "2022",
      description: "Began my professional development career through freelance work, building foundational skills in web development while working with diverse clients and projects remotely.",
      technologies: ["Web Development", "Client Relations", "Remote Work"],
      dotColor: "#eab308",
      periodColor: "#eab308"
    }
  ],

  projects: [
    {
      id: "nextsoft",
      title: "NextSoft Brand Website",
      description: "A modern, responsive brand website featuring smooth animations, blog section, and contact form.",
      image: "/projectsThumbnails/travelSiteLandingPage.png",
      technologies: ["Next.js", "TypeScript", "Tailwind"],
      github: "https://github.com/Wosmos/NextSoft-Brand-Website",
      live: "https://nextsoft-website.vercel.app/",
      featured: true,
      category: "web"
    },
    {
      id: "wizmo",
      title: "Wizmo AI",
      description: "AI-powered summarizer that transforms any blog URL into concise summaries using advanced language models.",
      image: "/projectsThumbnails/wizmo2.0.png",
      technologies: ["React", "OpenAI", "API"],
      github: "https://github.com/Wosmos/wizmo.git",
      live: "https://wizmo.netlify.app/",
      featured: false,
      category: "ai"
    },
    {
      id: "wovies",
      title: "Wovies",
      description: "Movie discovery platform with search, ratings, reviews, and watchlist functionality using TMDB API.",
      image: "/projectsThumbnails/wovies.png",
      technologies: ["React", "SASS", "Redux"],
      github: null,
      live: "https://darling-queijadas-e8f108.netlify.app/",
      featured: false,
      category: "web"
    },
    {
      id: "resumeright",
      title: "ResumeRight",
      description: "AI-powered resume optimization tool with ATS compatibility checks, keyword analysis, and improvement suggestions.",
      image: "/projectsThumbnails/ResumeRight.png",
      technologies: ["Next.js", "TypeScript", "Firebase", "Google AI"],
      github: "https://github.com/Wosmos/AI-Resume-checker",
      live: "https://ai-resume-checker-peach.vercel.app/",
      featured: false,
      category: "ai",
      status: "IN DEVELOPMENT"
    },
    {
      id: "miniprojects",
      title: "Mini Projects",
      description: "Collection of interactive mini projects showcasing vanilla web technologies and creative implementations.",
      image: "/projectsThumbnails/JsMiniProjects.png",
      technologies: ["HTML5", "CSS3", "JavaScript"],
      github: "https://github.com/Wosmos/mini-apps?tab=readme-ov-file",
      live: "https://wosmos.github.io/mini-apps/main.html",
      featured: false,
      category: "web"
    }
  ],

  blog: [
    {
      id: "typescript-love",
      title: "TypeScript: The Second Love",
      description: "Why transitioning from JavaScript to TypeScript is painful at first but essential for building scalable, maintainable applications.",
      date: "Mar 27, 2024",
      category: "TypeScript",
      url: "https://hashnode.com/@Wosmo",
    },
    {
      id: "react-memoization",
      title: "Memoization in React 18",
      description: "Understanding useMemo and useCallback deeper than just syntax - when to use them and when they might hurt performance.",
      date: "Feb 24, 2024",
      category: "React",
      url: "https://hashnode.com/@Wosmo",
    }
  ],

  services: [
    "Web Development",
    "Mobile App Development",
    "AI Integration",
    "UI/UX Design",
    "Technical Consulting"
  ],

  footer: {
    tagline: "Full Stack Engineer crafting digital experiences with modern technologies. Building the future, one line of code at a time.",
    copyright: "© 2024 Wasif Malik. Crafted with ♥ and lots of ☕"
  }
};
