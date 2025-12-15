'use client';

import { Github, Linkedin, Instagram, Hash } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const Footer = () => {
  return (
    <footer className="py-12 px-6 border-t border-white/5 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
                {/* Brand */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-10 text-white">
                             <Logo className="h-full w-auto" />
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Full Stack Engineer crafting digital experiences with modern technologies. 
                        Building the future, one line of code at a time.
                    </p>
                </div>

                {/* Quick Links */}
                <div>
                    <h4 className="text-lg font-bold mb-4">Quick Links</h4>
                    <div className="space-y-2">
                        <a href="#about" className="block text-gray-400 hover:text-indigo-400 transition-colors text-sm">About</a>
                        <a href="#projects" className="block text-gray-400 hover:text-indigo-400 transition-colors text-sm">Projects</a>
                        <a href="#experience" className="block text-gray-400 hover:text-indigo-400 transition-colors text-sm">Experience</a>
                        <a href="#blog" className="block text-gray-400 hover:text-indigo-400 transition-colors text-sm">Blog</a>
                        <a href="#contact" className="block text-gray-400 hover:text-indigo-400 transition-colors text-sm">Contact</a>
                    </div>
                </div>

                {/* Services */}
                <div>
                    <h4 className="text-lg font-bold mb-4">Services</h4>
                    <div className="space-y-2 text-sm text-gray-400">
                        <div>Web Development</div>
                        <div>Mobile App Development</div>
                        <div>AI Integration</div>
                        <div>UI/UX Design</div>
                        <div>Technical Consulting</div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-gray-500 text-sm flex items-center gap-1">
                    © 2024 Wasif Malik. Crafted with 
                    <span className="text-purple-400">♥</span> 
                    and lots of 
                    <span className="text-amber-400">☕</span>
                </p>
                <div className="flex items-center gap-4">
                    <a href="https://github.com/Wosmos" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-indigo-400 transition-colors">
                        <Github className="w-4 h-4" />
                    </a>
                    <a href="https://www.linkedin.com/in/wasif-m-79205a1bb/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-indigo-400 transition-colors">
                        <Linkedin className="w-4 h-4" />
                    </a>
                    <a href="https://www.instagram.com/wosmo_tech/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-indigo-400 transition-colors">
                        <Instagram className="w-4 h-4" />
                    </a>
                    <a href="https://hashnode.com/@Wosmo" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-indigo-400 transition-colors">
                        <Hash className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>
    </footer>
  );
};

export default Footer;
