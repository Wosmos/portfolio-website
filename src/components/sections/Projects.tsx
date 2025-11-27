'use client';

import { useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Github, ExternalLink, Brain, Film, Layers, FileText, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const Projects = () => {
  const containerRef = useRef(null);

  useGSAP(() => {
    const cards = gsap.utils.toArray('.project-card') as HTMLElement[];
    
    // Set initial state
    gsap.set(cards, { opacity: 1, y: 0 });
    
    cards.forEach((card, index) => {
      gsap.fromTo(card, 
        { 
          opacity: 0, 
          y: 40 
        },
        {
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
            end: "top 60%",
            toggleActions: "play none none none",
            once: true // Only animate once
          },
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: index * 0.1,
          ease: "power2.out"
        }
      );
    });
  }, { scope: containerRef });

  return (
    <section id="projects" className="py-24 px-6 bg-black/20 backdrop-blur-sm" ref={containerRef}>
        <div className="max-w-7xl mx-auto">
            <div className="mb-16 text-center">
                <h2 className="text-5xl md:text-6xl font-bold mb-4 cosmic-glow" style={{ fontFamily: 'var(--font-display)' }}>SELECTED WORK</h2>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Featured Project - NextSoft Brand Website */}
                <article className="md:col-span-2 lg:col-span-2 lg:row-span-2 project-card glass-cosmic rounded-3xl overflow-hidden group relative min-h-[400px] lg:min-h-[500px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-cyan-500/20"></div>
                    <div className="absolute top-6 left-6 z-20">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            <span className="text-xs font-mono text-green-400">FEATURED PROJECT</span>
                        </div>
                        <h3 className="text-2xl lg:text-3xl font-bold mb-2">NextSoft Brand Website</h3>
                        <p className="text-gray-300 max-w-sm text-sm lg:text-base">A modern, responsive brand website featuring smooth animations, blog section, and contact form.</p>
                    </div>
                    
                    {/* Mock Browser Window with Image */}
                    <div className="absolute bottom-6 right-6 w-[70%] h-[60%] bg-gray-900 rounded-lg border border-white/10 group-hover:scale-[1.02] transition-transform duration-500 overflow-hidden shadow-2xl">
                        <div className="bg-gray-800 px-3 py-2 flex items-center gap-2 border-b border-white/10">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                            <div className="ml-3 text-xs text-gray-400 font-mono truncate">nextsoft-website.vercel.app</div>
                        </div>
                        <div className="relative h-[calc(100%-32px)] w-full">
                            <Image 
                                src="/projectsThumbnails/travelSiteLandingPage.png" 
                                alt="NextSoft Website Preview"
                                fill
                                className="object-cover object-top"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        </div>
                    </div>
                    
                    <div className="absolute bottom-6 left-6 flex gap-2 z-20 flex-wrap">
                        <span className="px-2.5 py-1 bg-black/50 backdrop-blur rounded-full text-xs">Next.js</span>
                        <span className="px-2.5 py-1 bg-black/50 backdrop-blur rounded-full text-xs">TypeScript</span>
                        <span className="px-2.5 py-1 bg-black/50 backdrop-blur rounded-full text-xs">Tailwind</span>
                    </div>
                    
                    <div className="absolute top-6 right-6 flex gap-2 z-20">
                        <a href="https://github.com/Wosmos/NextSoft-Brand-Website" target="_blank" rel="noopener noreferrer" className="p-2 bg-black/30 backdrop-blur rounded-full hover:bg-black/50 transition-colors">
                            <Github className="w-4 h-4" />
                        </a>
                        <a href="https://nextsoft-website.vercel.app/" target="_blank" rel="noopener noreferrer" className="p-2 bg-black/30 backdrop-blur rounded-full hover:bg-black/50 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </article>

                {/* Wizmo AI Project */}
                <article className="project-card glass-cosmic rounded-3xl overflow-hidden group relative p-6 flex flex-col justify-between min-h-[320px]">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl group-hover:blur-xl transition-all pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-full">
                                <Brain className="w-6 h-6 text-purple-400" />
                            </div>
                            <div className="flex gap-2">
                                <a href="https://github.com/Wosmos/wizmo.git" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                    <Github className="w-4 h-4" />
                                </a>
                                <a href="https://wizmo.netlify.app/" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Wizmo AI</h3>
                        <p className="text-gray-400 text-sm mb-4">AI-powered summarizer that transforms any blog URL into concise summaries using advanced language models.</p>
                        <div className="flex gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-white/10 rounded text-xs">React</span>
                            <span className="px-2 py-1 bg-white/10 rounded text-xs">OpenAI</span>
                            <span className="px-2 py-1 bg-white/10 rounded text-xs">API</span>
                        </div>
                    </div>
                    <div className="mt-4 h-24 rounded-xl border border-white/5 overflow-hidden relative">
                        <Image 
                            src="/projectsThumbnails/wizmo2.0.png" 
                            alt="Wizmo AI Preview"
                            fill
                            className="object-cover object-top"
                            sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/40 to-transparent"></div>
                    </div>
                </article>

                {/* Wovies Project */}
                <article className="project-card glass-cosmic rounded-3xl overflow-hidden group relative p-6 flex flex-col justify-between min-h-[320px]">
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-500/30 rounded-full blur-2xl group-hover:blur-xl transition-all pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-red-500/20 rounded-full">
                                <Film className="w-6 h-6 text-red-400" />
                            </div>
                            <a href="https://darling-queijadas-e8f108.netlify.app/" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Wovies</h3>
                        <p className="text-gray-400 text-sm mb-4">Movie discovery platform with search, ratings, reviews, and watchlist functionality using TMDB API.</p>
                        <div className="flex gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-white/10 rounded text-xs">React</span>
                            <span className="px-2 py-1 bg-white/10 rounded text-xs">SASS</span>
                            <span className="px-2 py-1 bg-white/10 rounded text-xs">Redux</span>
                        </div>
                    </div>
                    <div className="mt-4 h-24 rounded-xl border border-white/5 overflow-hidden relative">
                        <Image 
                            src="/projectsThumbnails/wovies.png" 
                            alt="Wovies Preview"
                            fill
                            className="object-cover object-top"
                            sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-red-500/40 to-transparent"></div>
                    </div>
                </article>

                {/* ResumeRight Project - Wide Card */}
                <article className="lg:col-span-2 project-card glass-cosmic rounded-3xl overflow-hidden group relative p-6 min-h-[280px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between h-full gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-orange-500/20 rounded-full">
                                    <FileText className="w-6 h-6 text-orange-400" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                                    <span className="text-xs font-mono text-yellow-400">IN DEVELOPMENT</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold mb-2">ResumeRight</h3>
                            <p className="text-gray-300 mb-4 text-sm">AI-powered resume optimization tool with ATS compatibility checks, keyword analysis, and improvement suggestions.</p>
                            <div className="flex gap-2 flex-wrap mb-4">
                                <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs">Next.js</span>
                                <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs">TypeScript</span>
                                <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs">Firebase</span>
                                <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs">Google AI</span>
                            </div>
                            <div className="flex gap-2">
                                <a href="https://github.com/Wosmos/AI-Resume-checker" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-orange-500/20 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-colors text-sm">
                                    View Code
                                </a>
                                <a href="https://ai-resume-checker-peach.vercel.app/" target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors text-sm">
                                    Preview
                                </a>
                            </div>
                        </div>
                        <div className="shrink-0 hidden md:flex">
                            <div className="w-44 h-32 rounded-xl border border-white/10 overflow-hidden relative">
                                <Image 
                                    src="/projectsThumbnails/ResumeRight.png" 
                                    alt="ResumeRight Preview"
                                    fill
                                    className="object-cover object-top"
                                    sizes="200px"
                                />
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-yellow-500/20"></div>
                            </div>
                        </div>
                    </div>
                </article>

                {/* Mini Projects */}
                <article className="project-card glass-cosmic rounded-3xl overflow-hidden group relative p-6 flex flex-col justify-between min-h-[280px]">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/30 rounded-full blur-2xl group-hover:blur-xl transition-all pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-500/20 rounded-full">
                                <Layers className="w-6 h-6 text-green-400" />
                            </div>
                            <div className="flex gap-2">
                                <a href="https://github.com/Wosmos/mini-apps?tab=readme-ov-file" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                    <Github className="w-4 h-4" />
                                </a>
                                <a href="https://wosmos.github.io/mini-apps/main.html" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Mini Projects</h3>
                        <p className="text-gray-400 text-sm mb-4">Collection of interactive mini projects showcasing vanilla web technologies and creative implementations.</p>
                        <div className="flex gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-white/10 rounded text-xs">HTML5</span>
                            <span className="px-2 py-1 bg-white/10 rounded text-xs">CSS3</span>
                            <span className="px-2 py-1 bg-white/10 rounded text-xs">JavaScript</span>
                        </div>
                    </div>
                    <div className="mt-4 h-20 rounded-xl border border-white/5 overflow-hidden relative">
                        <Image 
                            src="/projectsThumbnails/JsMiniProjects.png" 
                            alt="Mini Projects Preview"
                            fill
                            className="object-cover object-center"
                            sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-green-500/40 to-transparent"></div>
                    </div>
                </article>
            </div>

            {/* View More Projects Button */}
            <div className="text-center mt-12">
                <a href="https://github.com/Wosmos" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:scale-105 transition-all hover:shadow-2xl hover:shadow-indigo-500/25">
                    <Github className="w-5 h-5" />
                    View All Projects on GitHub
                    <ArrowRight className="w-5 h-5" />
                </a>
            </div>
        </div>
    </section>
  );
};

export default Projects;
