'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { User, Github, BookOpen, Layers, PenTool, Cpu } from 'lucide-react';
import { SiGo, SiTypescript, SiNextdotjs, SiNodedotjs, SiReact, SiPostgresql } from 'react-icons/si';
import { siteData } from '@/data/siteData';

gsap.registerPlugin(ScrollTrigger);

const About = () => {
    const containerRef = useRef<HTMLElement>(null);



    useGSAP(() => {
        const q = gsap.utils.selector(containerRef);

        // Initial state for animations
        gsap.set(q(".cosmic-card, .bento-card"), { y: 50, opacity: 0 });

        // Animate cards with Batch for better order control
        ScrollTrigger.batch(q(".cosmic-card, .bento-card"), {
            interval: 0.05,
            batchMax: 4,
            once: true,
            onEnter: (batch) => {
                gsap.to(batch, {
                    opacity: 1,
                    y: 0,
                    duration: 0.4,
                    stagger: 0.06,
                    ease: "power3.out",
                    overwrite: true
                });
            },
            start: "top 95%"
        });
    }, { scope: containerRef });

    return (
        <section id="about" className="py-24 px-6 max-w-7xl mx-auto" ref={containerRef}>
            <div className="mb-16 text-center">
                {/* <div className="inline-flex items-center gap-2 px-4 py-2 glass-panel rounded-full mb-6">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                <span className="text-sm font-mono text-cyan-400">ABOUT_MODULE</span>
            </div> */}
                <h2 className="text-5xl md:text-6xl font-bold mb-4 cosmic-glow" style={{ fontFamily: 'var(--font-display)' }}>SYSTEM PROFILE</h2>
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* Main Bio Card */}
                <div className="md:col-span-2 lg:col-span-2 cosmic-card">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                            <User className="w-6 h-6 text-black" />
                        </div>
                        <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>THE ARCHITECT</h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed mb-6">
                        {siteData.about.bio}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-cyan-400/10 text-cyan-400 rounded-full text-sm border border-cyan-400/20 flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                            Karachi, Pakistan
                        </span>
                        <span className="px-3 py-1 bg-purple-400/10 text-purple-400 rounded-full text-sm border border-purple-400/20 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {siteData.about.stats.education}
                        </span>
                        <span className="px-3 py-1 bg-orange-400/10 text-orange-400 rounded-full text-sm border border-orange-400/20 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {siteData.about.stats.experience}
                        </span>
                    </div>
                </div>

                {/* GitHub Stats */}
                <div className="cosmic-card text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Github className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>{siteData.about.stats.repositories}</div>
                    <div className="text-gray-400 text-sm">REPOSITORIES</div>
                    <div className="text-xs text-cyan-400 mt-2 font-mono">ACTIVE_CONTRIBUTOR</div>
                </div>

                {/* Current Focus */}
                <div className="cosmic-card">
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                        <BookOpen className="w-6 h-6 text-black" />
                    </div>
                    <h4 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>LEARNING</h4>
                    <p className="text-gray-400 text-sm mb-3">{siteData.about.currentFocus.topic}</p>
                    <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full" style={{ width: `${siteData.about.currentFocus.progress}%` }}></div>
                    </div>
                    <div className="text-xs text-orange-400 font-mono">{siteData.about.currentFocus.progress}% COMPLETE</div>
                </div>

                {/* Skills Showcase */}
                <div className="md:col-span-2 lg:col-span-2 cosmic-card">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Cpu className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>TECH ARSENAL</h4>
                    </div>

                    <div className="space-y-4 mb-6">
                        {siteData.about.skills.map((group) => (
                            <div key={group.name} className="skill-item">
                                <div className={`text-xs font-mono mb-2 tracking-wider ${group.color}`}>{group.name}</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {group.items.map((item) => (
                                        <span key={item} className="px-2.5 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-gray-300">{item}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tech Stack Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        <div className="glass-panel p-3 rounded-lg text-center group hover:bg-cyan-400/10 transition-all">
                            <SiGo className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                            <div className="text-xs text-gray-400 group-hover:text-cyan-400 font-mono">GO</div>
                        </div>
                        <div className="glass-panel p-3 rounded-lg text-center group hover:bg-blue-400/10 transition-all">
                            <SiTypescript className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                            <div className="text-xs text-gray-400 group-hover:text-blue-400 font-mono">TS</div>
                        </div>
                        <div className="glass-panel p-3 rounded-lg text-center group hover:bg-gray-200/10 transition-all">
                            <SiNextdotjs className="w-5 h-5 mx-auto mb-1 text-gray-200" />
                            <div className="text-xs text-gray-400 group-hover:text-gray-200 font-mono">NEXT</div>
                        </div>
                        <div className="glass-panel p-3 rounded-lg text-center group hover:bg-cyan-400/10 transition-all">
                            <SiReact className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                            <div className="text-xs text-gray-400 group-hover:text-cyan-400 font-mono">REACT</div>
                        </div>
                        <div className="glass-panel p-3 rounded-lg text-center group hover:bg-green-400/10 transition-all">
                            <SiNodedotjs className="w-5 h-5 mx-auto mb-1 text-green-400" />
                            <div className="text-xs text-gray-400 group-hover:text-green-400 font-mono">NODE</div>
                        </div>
                        <div className="glass-panel p-3 rounded-lg text-center group hover:bg-sky-400/10 transition-all">
                            <SiPostgresql className="w-5 h-5 mx-auto mb-1 text-sky-400" />
                            <div className="text-xs text-gray-400 group-hover:text-sky-400 font-mono">POSTGRES</div>
                        </div>
                    </div>
                </div>

                {/* Latest Articles */}
                <div className="bento-card bento-large glass-cosmic p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xl font-bold flex items-center gap-2">
                            <PenTool className="w-6 h-6 text-purple-400" />
                            Latest Articles
                        </h4>
                        <a href="https://hashnode.com/@Wosmo" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                            View All →
                        </a>
                    </div>
                    <div className="space-y-4">
                        <article className="glass-cosmic p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs font-mono text-indigo-400">Mar 27, 2024</span>
                                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                <span className="text-xs text-gray-400">TypeScript</span>
                            </div>
                            <h5 className="font-semibold group-hover:text-indigo-300 transition-colors">TypeScript: The Second Love</h5>
                            <p className="text-sm text-gray-400 mt-1">Why transitioning from JS to TS is painful at first but essential for scalability.</p>
                        </article>
                        <article className="glass-cosmic p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs font-mono text-indigo-400">Feb 24, 2024</span>
                                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                <span className="text-xs text-gray-400">React</span>
                            </div>
                            <h5 className="font-semibold group-hover:text-indigo-300 transition-colors">Memoization in React 18</h5>
                            <p className="text-sm text-gray-400 mt-1">Understanding useMemo and useCallback deeper than just syntax.</p>
                        </article>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default About;
