// Site-wide static data — single source of truth for all displayed content.
// Content is kept in sync with the resumes in /public/resume.
export const siteData = {
  personal: {
    name: "Wasif Malik",
    fullName: "Muhammad Wasif Malik",
    title: "Software Engineer",
    tagline: "Software Engineer",
    description:
      "Software Engineer building production web applications and systems-level software end-to-end — concurrent Go backends, modern Next.js frontends, and security-first architecture.",
    location: "Karachi, Pakistan",
    timezone: "UTC+5 (PKT)",
    email: "m.wasifmalik17@gmail.com",
    phone: "+92 306 224 8224",
    cvUrl: "/resume/Wasif_Malik_Resume_SoftwareEngineer.pdf",
    status: "AVAILABLE FOR HIRE",
  },

  // Resume variants offered in the download modal
  resumes: [
    {
      id: "software-engineer",
      label: "Software Engineer",
      description: "The full picture — Go backends, Next.js frontends, and systems work. Best fit for most roles.",
      file: "/resume/Wasif_Malik_Resume_SoftwareEngineer.pdf",
      recommended: true,
    },
    {
      id: "nextjs",
      label: "Next.js / Frontend",
      description: "Tailored for Next.js, React, and modern frontend engineering roles.",
      file: "/resume/Wasif_Malik_Resume_NextJS.pdf",
      recommended: false,
    },
    {
      id: "mern",
      label: "MERN Stack",
      description: "Tailored for MongoDB, Express, React, and Node.js full-stack roles.",
      file: "/resume/Wasif_Malik_Resume_MERN.pdf",
      recommended: false,
    },
  ],

  social: {
    github: "https://github.com/Wosmos",
    linkedin: "https://www.linkedin.com/in/wasif-malik-79205a1bb",
    instagram: "https://www.instagram.com/wosmo_tech/",
    hashnode: "https://hashnode.com/@Wosmo",
  },

  hero: {
    typedStrings: [
      'Building concurrent backends in <span class="text-cyan-400">Go</span>.',
      'Shipping production apps with <span class="text-blue-400">Next.js</span>.',
      'Engineering <span class="text-purple-400">zero-knowledge</span> security.',
    ],
  },

  about: {
    bio: "Software engineer building production web applications and systems-level software end-to-end. Specialised in concurrent backends with Go, modern frontends with Next.js, and security-first architecture — from a zero-knowledge encrypted cloud platform to a real-time chat system across web and mobile, plus client products spanning e-commerce, POS, HRMS, and real estate. Comfortable owning every layer: schema design, backend services, client implementations, and deployment.",
    stats: {
      projectsShipped: "10+",
      experience: "2+ Years Experience",
      education: "BS Software Engineering",
    },
    currentFocus: {
      title: "LEARNING",
      topic: "Go Concurrency & Cloud-Native Systems",
    },
    // Skill groups mirror the Technical Skills section of the resume
    skills: [
      { name: "LANGUAGES", color: "text-cyan-400", items: ["TypeScript", "JavaScript", "Go", "Python", "SQL"] },
      { name: "FRONTEND", color: "text-blue-400", items: ["Next.js", "React", "React Native", "Redux Toolkit", "Tailwind CSS"] },
      { name: "BACKEND", color: "text-green-400", items: ["Go (net/http)", "Node.js", "NestJS", "Django", "FastAPI", "WebSockets"] },
      { name: "DATA & CLOUD", color: "text-purple-400", items: ["PostgreSQL", "MongoDB", "Firebase", "Docker", "GitHub Actions", "Vercel"] },
      { name: "SECURITY", color: "text-orange-400", items: ["AES-256-GCM", "PBKDF2", "Web Crypto API", "WebAssembly"] },
    ],
  },

  experience: [
    {
      title: "Software Engineer",
      company: "Avialdo Solutions",
      location: "Karachi, Pakistan",
      period: "Jan 2025 - Present",
      description:
        "Building production web applications with Next.js 15 (App Router, SSR, ISR) and backend services across NestJS and Django. Designing complex PostgreSQL schemas, authoring performance-optimised queries, and driving technical decisions in Agile sprints.",
      technologies: ["Next.js 15", "NestJS", "Django", "PostgreSQL"],
      dotColor: "#06b6d4",
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      title: "MERN Stack Developer (Part-Time)",
      company: "Nexsoft",
      location: "Karachi, Pakistan",
      period: "May 2025 - Oct 2025",
      description:
        "Delivered multiple client products end-to-end: the company brand site, a full e-commerce platform with catalogue, cart, and order flows, and an internal HRMS with role-based modules for employee records and HR workflows.",
      technologies: ["MongoDB", "Express.js", "React", "Node.js"],
      dotColor: "#22c55e",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      title: "Next.js Developer",
      company: "Softechbar",
      location: "Remote",
      period: "Jan 2024 - Dec 2024",
      description:
        "Delivered a range of client projects — brand websites, point-of-sale systems, and real-estate solutions with property listings and search — using Next.js and TypeScript with SSR/SSG-optimised data-fetching for SEO and load speed.",
      technologies: ["Next.js", "TypeScript", "SSR/SSG"],
      dotColor: "#8b5cf6",
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "Frontend Engineer (AI Products)",
      company: "Liftup AI",
      location: "Jamshoro, Pakistan",
      period: "Jan 2024 - Mar 2024",
      description:
        "Engineered production-grade React + Redux interfaces for AI-driven analytics dashboards. Architected a reusable Tailwind CSS component library that cut new-feature development time by ~30%, with 60fps animations and sub-2s page loads.",
      technologies: ["React", "Redux", "Tailwind CSS"],
      dotColor: "#6366f1",
      gradient: "from-indigo-500 to-blue-500",
    },
    {
      title: "Web Developer (Intern)",
      company: "Interns Pakistan",
      location: "Remote",
      period: "Oct 2022 - Dec 2022",
      description:
        "Built responsive web pages and components with React, Vue.js, and modern JavaScript (ES6+), strengthening core web fundamentals — DOM APIs, semantic markup, accessibility (WCAG), and Git-based collaboration workflows.",
      technologies: ["React", "Vue.js", "JavaScript (ES6+)"],
      dotColor: "#eab308",
      gradient: "from-yellow-400 to-orange-500",
    },
  ],

  // context: "product"   → personal products I build and operate (live, released)
  //          "freelance" → built for a real external client/business
  //          "coursework"→ university / final-year project
  //          "learning"  → practice builds and exercises
  projects: [
    // ── Featured Projects (Bento Grid) ──
    {
      id: "zcrypt",
      title: "Zcrypt",
      description:
        "Zero-knowledge encrypted cloud storage — files are encrypted client-side with AES-256-GCM before upload, so the server can never read them. One Go backend, three clients: web, desktop (Tauri), and terminal (TUI).",
      image: "/projectsThumbnails/zcrypt.png",
      technologies: ["Go", "Next.js", "Tauri", "WebAssembly"],
      github: "https://github.com/Wosmos/zcrypt",
      live: "https://zcrypt.cloud",
      featured: true,
      context: "product",
      category: "security"
    },
    {
      id: "learnity",
      title: "Learnity",
      description:
        "Online tutoring platform connecting students with verified tutors — custom gamification engine (XP, streaks, progression), real-time HD video via GetStream, and role-based access control. Final Year Project, shipped solo.",
      image: "/projectsThumbnails/learnity.png",
      technologies: ["Next.js 15", "PostgreSQL", "GetStream", "Firebase"],
      github: "https://github.com/Wosmos/Learnity",
      live: "https://learnity-app.vercel.app",
      featured: true,
      context: "coursework",
      category: "ai"
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
      context: "product",
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
      featured: true,
      context: "product",
      category: "mobile"
    },
    {
      id: "devtoolshq",
      title: "DevToolsHQ",
      description: "Unified dashboard of developer utility tools — formatters, testers, generators — optimized for DX.",
      image: "/projectsThumbnails/devtoolshq.png",
      technologies: ["Next.js", "TypeScript", "Firebase"],
      github: "https://github.com/Wosmos/DevToolsHQ",
      live: "https://dev-tools-hq-pi.vercel.app",
      featured: true,
      context: "product",
      category: "web"
    },
    // ── All Other Projects ──
    {
      id: "netlink",
      title: "NetLink",
      description:
        "Real-time chat platform — a concurrent Go WebSocket server (goroutines + channels) fanning out to Next.js web and React Native mobile clients over a shared protocol, with persistent PostgreSQL history.",
      image: null,
      technologies: ["Go", "WebSockets", "React Native", "PostgreSQL"],
      github: "https://github.com/Wosmos/netlink",
      live: null,
      featured: false,
      context: "product",
      category: "backend"
    },
    {
      id: "furnizsh",
      title: "furniZsh",
      description: "A neon terminal in one command — Ghostty + zsh + Starship with four themes and 24 commands. Distributed via Homebrew, npm, and Scoop with a provenance-attested release pipeline.",
      image: null,
      technologies: ["Shell", "Bash", "GitHub Actions", "Homebrew"],
      github: "https://github.com/Wosmos/furnizsh",
      live: null,
      featured: false,
      context: "product",
      category: "backend"
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
      context: "product",
      category: "ai",
      status: "IN DEVELOPMENT"
    },
    {
      id: "scrappo",
      title: "Scrappo",
      description: "Dual-mode web scraper with scheduled jobs, email reporting, and multi-format exports (CSV, PDF, Excel).",
      image: "/projectsThumbnails/scrappo.png",
      technologies: ["Python", "FastAPI", "Trafilatura"],
      github: "https://github.com/Wosmos/WebScrapingTool",
      live: "https://scrappo.vercel.app",
      featured: false,
      context: "product",
      category: "backend"
    },
    {
      id: "nextsoft",
      title: "NextSoft",
      description: "Modern, responsive brand website with smooth animations, blog section, and contact form.",
      image: null,
      technologies: ["Next.js", "TypeScript", "Tailwind"],
      github: "https://github.com/Wosmos/NextSoft-Brand-Website",
      live: null,
      featured: false,
      context: "freelance",
      category: "web"
    },
    {
      id: "wizmo",
      title: "Wizmo AI",
      description: "AI-powered summarizer that transforms blog URLs into concise summaries using language models.",
      image: "/projectsThumbnails/wizmo2.0.png",
      technologies: ["React", "OpenAI", "Redux"],
      github: "https://github.com/Wosmos/wizmo",
      live: null,
      featured: false,
      context: "product",
      category: "ai"
    },
    {
      id: "wovies",
      title: "Wovies",
      description: "Movie discovery platform with search, ratings, and watchlist functionality using TMDB API.",
      image: "/projectsThumbnails/wovies.png",
      technologies: ["React", "SASS", "Redux"],
      github: "https://github.com/Wosmos/wovie",
      live: null,
      featured: false,
      context: "learning",
      category: "web"
    },
    {
      id: "django-blogs",
      title: "Django Blogs",
      description: "Minimal blog CMS with Markdown support, real-time previews, and optimized ORM queries.",
      image: null,
      technologies: ["Django", "Python", "CodeMirror"],
      github: "https://github.com/Wosmos/blog-site",
      live: null,
      featured: false,
      context: "learning",
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
      context: "learning",
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
    tagline: "Software Engineer building production web apps and systems-level software — Go backends, Next.js frontends, and security-first architecture.",
    copyright: "Wasif Malik. Crafted with ♥ and lots of ☕",
  },
};
