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
    bio: "Full-stack engineer and systems thinker obsessed with building high-performance, scalable applications. Currently deep in Go (Golang) for backend services, Next.js for frontend, and exploring Rust for tooling. Passionate about clean architecture, concurrency, and pushing the limits of what’s possible with modern infra. Building real-world systems—not just CRUD apps.",
   stats: {
    repositories: "50+",
    experience: "2+ Years Experience",
    education: "Software Engineering ",
  },
    currentFocus: {
    title: "LEARNING",
    topic: "Go Concurrency & Cloud-Native Systems",
    progress: 65,
  },
    skills: [
      { name: "FRONTEND", percentage: 85, color: "from-cyan-400 to-blue-500" },
      { name: "BACKEND", percentage: 58, color: "from-green-400 to-emerald-500" },
      { name: "MOBILE", percentage: 62, color: "from-purple-400 to-pink-500" },
      { name: "AI/ML", percentage: 55, color: "from-orange-400 to-red-500" },
      { name: "SYSTEM DESIGN", percentage: 55, color: "from-orange-400 to-red-500" },
      { name: "CLOUD INFRA", percentage: 55, color: "from-orange-400 to-red-500" },
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
    // ── Featured Projects (Bento Grid) ──
    {
      id: "zcrypt",
      title: "Zcrypt",
      description: "Zero-knowledge encrypted cloud storage with AES-256-GCM encryption, Git-based distributed architecture, and bring-your-own-backend support.",
      image: "/projectsThumbnails/zcrypt.png",
      technologies: ["Next.js", "Go", "AES-256-GCM"],
      github: null,
      live: "https://zcrypt.cloud",
      featured: true,
      category: "security"
    },
    {
      id: "learnity",
      title: "Learnity",
      description: "AI-powered educational platform with gamification, XP system, streak multipliers, and real-time video study groups. Final Year Project.",
      image: "/projectsThumbnails/learnity.png",
      technologies: ["Next.js 15", "PostgreSQL", "Firebase", "getStream"],
      github: "https://github.com/Wosmos/Learnity",
      live: "https://learnity-app.vercel.app",
      featured: true,
      category: "ai"
    },
    {
      id: "netlink",
      title: "NetLink",
      description: "Scalable chat backend in Go handling thousands of concurrent WebSocket connections with minimal latency.",
      image: null,
      technologies: ["Go", "WebSocket", "PostgreSQL"],
      github: "https://github.com/Wosmos/NetLink",
      live: null,
      featured: true,
      category: "backend"
    },
    {
      id: "docxo",
      title: "DocXO",
      description: "Google Docs-inspired editor with real-time collaboration, inline comments, and version history using Liveblocks and Lexical.",
      image: "/projectsThumbnails/docxo.png",
      technologies: ["Next.js", "Liveblocks", "Lexical"],
      github: "https://github.com/Wosmos/DocXO",
      live: "https://doc-xo.vercel.app",
      featured: true,
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
      featured: true,
      category: "ai",
      status: "IN DEVELOPMENT"
    },
    // ── All Other Projects ──
    {
      id: "scrappo",
      title: "Scrappo",
      description: "Dual-mode web scraper with scheduled jobs, email reporting, and multi-format exports (CSV, PDF, Excel).",
      image: "/projectsThumbnails/scrappo.png",
      technologies: ["Python", "FastAPI", "Trafilatura"],
      github: "https://github.com/Wosmos/Scrappo",
      live: "https://scrappo.vercel.app",
      featured: false,
      category: "backend"
    },
    {
      id: "devtoolshq",
      title: "DevToolsHQ",
      description: "Unified dashboard of developer utility tools — formatters, testers, generators — optimized for DX.",
      image: "/projectsThumbnails/devtoolshq.png",
      technologies: ["Next.js", "TypeScript", "Firebase"],
      github: "https://github.com/Wosmos/DevToolsHQ",
      live: "https://dev-tools-hq-pi.vercel.app",
      featured: false,
      category: "web"
    },
    {
      id: "tellow",
      title: "Tellow",
      description: "Cross-platform video calling app with authentication, multi-node functionality, and real-time notifications.",
      image: null,
      technologies: ["React Native", "Expo", "GetStream", "Clerk"],
      github: "https://github.com/Wosmos/Tellow",
      live: null,
      featured: false,
      category: "mobile"
    },
    {
      id: "nextsoft",
      title: "NextSoft",
      description: "Modern, responsive brand website with smooth animations, blog section, and contact form.",
      image: "/projectsThumbnails/travelSiteLandingPage.png",
      technologies: ["Next.js", "TypeScript", "Tailwind"],
      github: "https://github.com/Wosmos/NextSoft-Brand-Website",
      live: null,
      featured: false,
      category: "web"
    },
    {
      id: "wizmo",
      title: "Wizmo AI",
      description: "AI-powered summarizer that transforms blog URLs into concise summaries using language models.",
      image: "/projectsThumbnails/wizmo2.0.png",
      technologies: ["React", "OpenAI", "Redux"],
      github: "https://github.com/Wosmos/wizmo.git",
      live: "https://wizmo.netlify.app/",
      featured: false,
      category: "ai"
    },
    {
      id: "wovies",
      title: "Wovies",
      description: "Movie discovery platform with search, ratings, and watchlist functionality using TMDB API.",
      image: "/projectsThumbnails/wovies.png",
      technologies: ["React", "SASS", "Redux"],
      github: null,
      live: "https://darling-queijadas-e8f108.netlify.app/",
      featured: false,
      category: "web"
    },
    {
      id: "django-blogs",
      title: "Django Blogs",
      description: "Minimal blog CMS with Markdown support, real-time previews, and optimized ORM queries.",
      image: null,
      technologies: ["Django", "Python", "CodeMirror"],
      github: "https://github.com/Wosmos/django-blogs",
      live: null,
      featured: false,
      category: "backend"
    },
    {
      id: "miniprojects",
      title: "Mini Projects",
      description: "Collection of interactive mini projects showcasing vanilla web technologies and creative implementations.",
      image: "/projectsThumbnails/JsMiniProjects.png",
      technologies: ["HTML5", "CSS3", "JavaScript"],
      github: "https://github.com/Wosmos/mini-apps",
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
