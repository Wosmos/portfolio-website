'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ExternalLink, ArrowRight, FileText, Code } from 'lucide-react';

const Blog = () => {
  const containerRef = useRef(null);

  useGSAP(() => {
    const articles = gsap.utils.toArray('article');
    articles.forEach((article: any, index) => {
        gsap.from(article, {
            scrollTrigger: {
                trigger: article,
                start: "top 85%",
                toggleActions: "play none none reverse"
            },
            y: 50,
            opacity: 0,
            duration: 1,
            delay: index * 0.1,
            ease: "power3.out"
        });
    });
  }, { scope: containerRef });

  return (
    <section id="blog" className="py-24 px-6 max-w-6xl mx-auto" ref={containerRef}>
        <div className="mb-16 text-center">
            <h2 className="text-5xl md:text-6xl font-bold mb-4 cosmic-glow uppercase" style={{ fontFamily: 'var(--font-display)' }}>Thoughts & Code</h2>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto"></div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
            {/* Blog Post 1 */}
            <article className="group">
                <div className="glass-cosmic rounded-2xl overflow-hidden hover:bg-white/5 transition-all duration-300 transform hover:-translate-y-2">
                    <div className="h-48 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <FileText className="w-12 h-12 mx-auto mb-2 text-indigo-400" />
                                <div className="text-sm text-gray-300">TypeScript Guide</div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs font-mono text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">TypeScript</span>
                            <span className="text-xs text-gray-500">Mar 27, 2024</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-300 transition-colors">TypeScript: The Second Love</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">Why transitioning from JavaScript to TypeScript is painful at first but essential for building scalable, maintainable applications.</p>
                        <div className="mt-4 flex items-center text-indigo-400 text-sm font-medium group-hover:gap-2 transition-all">
                            Read More <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                    </div>
                </div>
            </article>
            
            {/* Blog Post 2 */}
            <article className="group">
                <div className="glass-cosmic rounded-2xl overflow-hidden hover:bg-white/5 transition-all duration-300 transform hover:-translate-y-2">
                    <div className="h-48 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <Code className="w-12 h-12 mx-auto mb-2 text-cyan-400" />
                                <div className="text-sm text-gray-300">React Optimization</div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">React</span>
                            <span className="text-xs text-gray-500">Feb 24, 2024</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-cyan-300 transition-colors">Memoization in React 18</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">Understanding useMemo and useCallback deeper than just syntax - when to use them and when they might hurt performance.</p>
                        <div className="mt-4 flex items-center text-cyan-400 text-sm font-medium group-hover:gap-2 transition-all">
                            Read More <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                    </div>
                </div>
            </article>
        </div>

        {/* View All Articles Button */}
        <div className="text-center mt-12">
            <a href="https://hashnode.com/@Wosmo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 border border-indigo-500/50 text-indigo-400 rounded-xl hover:bg-indigo-500/10 transition-all">
                <ExternalLink className="w-4 h-4" />
                View All Articles
            </a>
        </div>
    </section>
  );
};

export default Blog;
