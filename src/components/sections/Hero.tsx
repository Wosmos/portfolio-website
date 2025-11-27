'use client';

import { useEffect, useRef } from 'react';
import Typed from 'typed.js';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Download, ArrowRight, Github, Linkedin, Instagram, Hash, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import CodeTerminal from './CodeWindow';

const Hero = () => {
  const typedRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const typed = new Typed(typedRef.current, {
      strings: [
        'Crafting digital <span class="text-cyan-400">universes</span>.',
        'Building with <span class="text-blue-400">Next.js</span> & <span class="text-purple-400">AI</span>.',
        'Engineering <span class="text-green-400">elegant</span> solutions.'
      ],
      typeSpeed: 50,
      backSpeed: 30,
      backDelay: 2000,
      loop: true,
      showCursor: true,
      cursorChar: '|',
      contentType: 'html'
    });

    return () => {
      typed.destroy();
    };
  }, []);

  useGSAP(() => {
    const tl = gsap.timeline();
    
    // Background parallax elements
    gsap.to(".bg-glow", {
        scale: 1.2,
        opacity: 0.4,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
    });

    // Content stagger
    tl.from(".hero-content-item", {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
        ease: "power3.out"
    })
    // Visual entry
    .from(".hero-visual", {
        x: 50,
        opacity: 0,
        scale: 0.95,
        duration: 1.2,
        ease: "power3.out"
    }, "-=0.6");

  }, { scope: containerRef });

  return (
    <section id="home" className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden" ref={containerRef}>
        
        {/* Ambient Background */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[100px] bg-glow"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[100px] bg-glow"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        </div>

        <div className="max-w-7xl w-full pt-12 md:pt-0">
            
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                
                {/* Hero Content - Left Side */}
                <div className="lg:col-span-7 flex flex-col justify-center">
                    
                    {/* Status Pill */}
                    <div className="hero-content-item self-start mb-6">
                        <div className="px-4 py-2 rounded-full border border-green-500/20 bg-green-500/5 flex items-center gap-3 backdrop-blur-sm">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-mono font-medium text-green-400 tracking-wider">AVAILABLE FOR HIRE</span>
                        </div>
                    </div>
                    
                    {/* Main Headings */}
                    <div className="hero-content-item mb-4">
                        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[1.1]">
                            WASIF<br/>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-400 to-white">MALIK</span>
                        </h1>
                    </div>
                    
                    {/* Typed Text */}
                    <div className="hero-content-item h-[60px] text-xl md:text-2xl text-gray-300 font-light mb-8 flex items-center">
                        <span className="mr-2 text-purple-500 font-mono">{'>'}</span>
                        <span ref={typedRef}></span>
                    </div>

                    {/* Action Buttons */}
                    <div className="hero-content-item flex flex-col sm:flex-row gap-4 mb-10">
                        <a
                         href='/my-cv.pdf'
                         download
                        className="group relative px-8 py-4 bg-white text-black font-bold rounded-full overflow-hidden transition-transform hover:scale-105">
                            <span className="relative z-10 flex items-center gap-2">
                                <Download className="w-5 h-5" />
                                Download CV
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </a>
                        
                        {/* <Link href="#projects" className="px-8 py-4 border border-white/20 text-white rounded-full hover:bg-white/10 transition-colors font-medium flex items-center justify-center gap-2 group">
                            View Work <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link> */}
                    </div>

                    {/* Social Links */}
                    <div className="hero-content-item flex gap-4 text-gray-400">
                        {[
                            { Icon: Github, href: "https://github.com/Wosmos" },
                            { Icon: Linkedin, href: "https://www.linkedin.com/in/wasif-m-79205a1bb/" },
                            { Icon: Instagram, href: "https://www.instagram.com/wosmo_tech/" },
                            { Icon: Hash, href: "https://hashnode.com/@Wosmo" }
                        ].map(({ Icon, href }, idx) => (
                            <a 
                                key={idx} 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="p-2 hover:text-white hover:scale-110 transition-all duration-300"
                            >
                                <Icon className="w-6 h-6" />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Right Side - Visual */}
                <div className="hidden md:flex lg:col-span-5 hero-visual relative z-10 justify-center lg:justify-end">
                    <CodeTerminal />
                </div>
            </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
            <ChevronDown className="w-8 h-8 text-gray-400" />
        </div>
    </section>
  );
};

export default Hero;