'use client';

import { 
  Zap, 
  Palette, 
  Code, 
  Triangle, 
  Smartphone, 
  FileText, 
  Server, 
  Database, 
  Waves 
} from 'lucide-react';
import { RiNextjsLine, RiTailwindCssLine } from 'react-icons/ri';
import { SiCss3, SiFlutter, SiGo, SiMongodb, SiNodedotjs, SiPostgresql, SiPrisma, SiReact, SiTypescript } from 'react-icons/si';

const TechMarquee = () => {
  const techs = [
    { Icon: Zap, name: 'HTML5', color: 'text-orange-400' },
    { Icon: SiCss3, name: 'CSS3', color: 'text-blue-400' },
    { Icon: Code, name: 'JAVASCRIPT', color: 'text-yellow-400' },
    { Icon: RiTailwindCssLine, name: 'TAILWIND', color: 'text-cyan-400' },
    { Icon: SiGo, name: 'GO', color: 'text-white' },
    { Icon: SiReact, name: 'REACT', color: 'text-cyan-400' },
    { Icon: SiPostgresql, name: 'POSTGRESQL', color: 'text-white' },
    { Icon: RiNextjsLine, name: 'NEXT.JS', color: 'text-white' },
    { Icon: SiFlutter, name: 'FLUTTER', color: 'text-blue-500' },
    { Icon: SiTypescript, name: 'TYPESCRIPT', color: 'text-blue-600' },
    { Icon: SiNodedotjs, name: 'NODE.JS', color: 'text-green-400' },
    { Icon: SiMongodb, name: 'MONGODB', color: 'text-green-500' },
    { Icon: SiPrisma, name: 'Prisma', color: 'text-white' },
  ];

  return (
    <div className="py-12 my-2 backdrop-blur-xl border-y border-cyan-400/20 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent overflow-hidden">
        <div className="flex gap-20 animate-marquee whitespace-nowrap">
            {[...techs, ...techs].map((tech, index) => (
                <div key={index} className="flex items-center gap-3 text-2xl font-bold font-mono text-gray-400 hover:text-cyan-400 transition-colors">
                    <tech.Icon className={`w-6 h-6 ${tech.color}`} />
                    {tech.name}
                </div>
            ))}
        </div>
    </div>
  );
};

export default TechMarquee;
