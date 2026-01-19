// Site-wide static data
export const siteData = {
  personal: {
    name: "Muhammad Wasif Malik",
    f_name: "Wasif",
    l_name: "Malik",
    title: "Software Engineer",
    tagline: "Full Stack Developer",
    description:
      "Full Stack Developer with over two years of hands-on experience building web applications using React and Next.js. I specialise in creating responsive user interfaces and integrating them with backend APIs to deliver complete solutions.",
    location: "Karachi, Pakistan",
    timezone: "UTC+5 (PKT)",
    email: "m.wasifmalik17@gmail.com",
    phone: "+92 306 224 8224",
    cvUrl: "/my-cv.pdf",
    status: "AVAILABLE FOR HIRE",
  },

  social: {
    github: "https://github.com/Wosmos",
    linkedin: "https://linkedin.com/in/wasif-malik-79205a1bb/",
    instagram: "https://www.instagram.com/wosmo_tech/",
    hashnode: "https://hashnode.com/@Wosmo",
  },

  hero: {
    typedStrings: [
      'Crafting digital <span class="text-cyan-400">universes</span>.',
      'Building with <span class="text-blue-400">Next.js</span> & <span class="text-purple-400">AI</span>.',
      'Engineering <span class="text-green-400">elegant</span> solutions.',
    ],
  },

  about: {
    bio: "Full Stack Developer with over two years of hands-on experience building web applications using React and Next.js. My professional work focuses primarily on the MERN stack and Next.js, where I have developed production applications, including real-time collaborative tools and enterprise management systems. Currently pursuing my Bachelor's degree in Software Engineering while actively expanding my technical knowledge through personal projects exploring Go, Python frameworks, and React Native for mobile development.",
    stats: {
      repositories: "45+",
      experience: "2+ Years Experience",
      education: "BSc Software Engineering",
    },
    currentFocus: {
      title: "LEARNING",
      topic: "System Design & Cloud Infrastructure",
      progress: 80,
    },
    skills: [
      { name: "FRONTEND", percentage: 95, color: "from-cyan-400 to-blue-500" },
      { name: "BACKEND", percentage: 88, color: "from-green-400 to-emerald-500" },
      { name: "MOBILE", percentage: 85, color: "from-purple-400 to-pink-500" },
      { name: "AI/ML", percentage: 80, color: "from-orange-400 to-red-500" },
    ],
  },

  experience: [
    {
      title: "Next.js Developer",
      company: "Avialdo Solutions",
      location: "Karachi, Pakistan",
      period: "February 2025 - Present",
      description:
        "Developing production-grade applications using Next.js 15, focusing on server-side rendering (SSR) and optimised data fetching. Designing and managing complex PostgreSQL schemas; optimising queries to ensure data integrity for enterprise-level systems. Leading technical decision-making in an Agile environment using Jira and Confluence.",
      technologies: ["Next.js 15", "PostgreSQL", "Jira", "Confluence"],
      dotColor: "#06b6d4", // Cyan
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      title: "Frontend Developer",
      company: "Liftup AI",
      location: "Jamshoro",
      period: "January 2024 - March 2024",
      description:
        "Engineered responsive interfaces using React and Redux; implemented a reusable component library with Tailwind CSS, reducing development time for new features by 30%. Seamlessly integrated RESTful APIs to handle dynamic, real-time data updates for AI-driven dashboards. Achieved 60fps animations and sub-2s page loads through code-splitting and asset optimisation.",
      technologies: ["React", "Redux", "Tailwind CSS", "RESTful APIs"],
      dotColor: "#8b5cf6", // Violet
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "Web Designer",
      company: "Interns Pakistan",
      location: "Remote, Pakistan",
      period: "October 2022 - December 2022",
      description:
        "Established foundation in web development through hands-on experience with HTML5, CSS3, and modern JavaScript (ES6+). Learned version control with Git and GitHub workflows. Developed clean, semantic code following industry best practices and accessibility standards.",
      technologies: ["HTML5", "CSS3", "JavaScript (ES6+)"],
      dotColor: "#6366f1", // Indigo
      gradient: "from-indigo-500 to-blue-500",
    },
  ],

  projects: [
    {
      id: "learnity",
      title: "Learnity – AI-Powered EdTech Platform (FYP)",
      description:
        "An AI-powered educational platform featuring gamification, XP system, streak multipliers, and real-time video study groups.",
      image: "/projectsThumbnails/learnity-lms.png", // add this image to public folder
      technologies: ["Next.js 15", "TypeScript", "PostgreSQL", "getStream", "Tailwind CSS", "Firebase"],
      github: "https://github.com/Wosmos/Learnity",
      live: "http://learnity-app.vercel.app",
      featured: true,
      category: "web",
      mobileImage: "/projectsThumbnails/learnity-lms-mobile.png",
    },
    {
      id: "docxo",
      title: "DocXO – Real-Time Collaborative Editor",
      description:
        "Google Docs-inspired editor with real-time collaboration, inline comments, and version history using Liveblocks and Lexical.",
      image: "/projectsThumbnails/doxco.png",
      technologies: ["Next.js", "Liveblocks", "Lexical Editor", "Clerk Auth", "TypeScript"],
      github: "https://github.com/Wosmos/DocXO",
      live: "doc-xo.vercel.app",
      featured: false,
      category: "web",
      mobileImage: "/projectsThumbnails/doxco-mobile.png",
    },
    {
      id: "resumeright",
      title: "ResumeRight",
      description: "AI-powered resume optimization tool with ATS compatibility checks, keyword analysis, and improvement suggestions.",
      image: "/projectsThumbnails/resume-right.png",
      technologies: ["Next.js", "TypeScript", "Firebase", "Google AI"],
      github: "https://github.com/Wosmos/AI-Resume-checker",
      live: "https://ai-resume-checker-peach.vercel.app/",
      featured: false,
      category: "ai",
      mobileImage: "/projectsThumbnails/resume-right-mobile.png",
      status: "IN DEVELOPMENT"
    },
    {
      id: "devtoolshq",
      title: "DevToolsHQ – Developer Productivity Suite",
      description:
        "Unified dashboard of utility tools (formatters, testers, code generators) optimized for Developer Experience (DX).",
      image: "/projectsThumbnails/dev-tools-hq.png",
      technologies: ["Next.js", "TypeScript", "Firebase Auth"],
      github: "https://github.com/Wosmos/DevToolsHQ",
      live: "https://dev-tools-hq-pi.vercel.app",
      featured: false,
      category: "web",
      mobileImage: "/projectsThumbnails/dev-tools-hq-mobile.png",
    },
    {
      id: "django-blogs",
      title: "Django Blogs – Minimal Blog CMS",
      description:
        "Full-featured blog CMS with Markdown support, real-time previews, and optimized ORM queries.",
      image: "/projectsThumbnails/django-blogs.png",
      technologies: ["Django 5.0", "Python", "CodeMirror", "SQLite"],
      github: "https://github.com/Wosmos/django-blogs",
      live: null,
      featured: false,
      category: "web",
      mobileImage: "/projectsThumbnails/django-blogs-mobile.png",
    },
    {
      id: "netlink",
      title: "NetLink – High-Performance Chat Backend",
      description:
        "Scalable chat backend in Go handling thousands of concurrent WebSocket connections with minimal latency.",
      image: "/projectsThumbnails/netlink.png",
      technologies: ["Go (Golang)", "WebSockets", "PostgreSQL"],
      github: "https://github.com/Wosmos/NetLink",
      live: "https://netlink.vercel.app",
      featured: false,
      category: "backend",
      mobileImage: "/projectsThumbnails/netlink-mobile.png",
    },
    {
      id: "scrappo",
      title: "Scrappo – Automated Web Scraping Tool",
      description:
        "Dual-mode scraper (on-demand/scheduled) with email reporting and multi-format exports (CSV, PDF, Excel).",
      image: "/projectsThumbnails/scrappo.png",
      technologies: ["Python", "FastAPI", "Trafilatura", "APScheduler", "SQLite"],
      github: "https://github.com/Wosmos/Scrappo",
      live: null,
      featured: true,
      category: "ai",
      mobileImage: "/projectsThumbnails/scrappo-mobile.png",
    },

  ],

  blog: [
    {
      id: "typescript-love",
      title: "TypeScript: The Second Love",
      description:
        "Why transitioning from JavaScript to TypeScript is painful at first but essential for building scalable, maintainable applications.",
      date: "Mar 27, 2024",
      category: "TypeScript",
      url: "https://hashnode.com/@Wosmo",
    },
    {
      id: "react-memoization",
      title: "Memoization in React 18",
      description:
        "Understanding useMemo and useCallback deeper than just syntax - when to use them and when they might hurt performance.",
      date: "Feb 24, 2024",
      category: "React",
      url: "https://hashnode.com/@Wosmo",
    },
  ],

  services: [
    "Web Development",
    "Mobile App Development",
    "AI Integration",
    "UI/UX Design",
    "Technical Consulting",
  ],

  footer: {
    tagline:
      "Full Stack Developer crafting digital experiences with modern technologies. Building the future, one line of code at a time.",
    copyright: `© ${new Date().getFullYear()} Muhammad Wasif Malik. Crafted with ♥ and lots of ☕`,
  },
};