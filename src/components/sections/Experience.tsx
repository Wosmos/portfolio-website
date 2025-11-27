'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import ExperienceCard from '@/components/ui/ExperienceCard';

interface ExperienceData {
  title: string;
  company: string;
  location: string;
  period: string;
  description: string;
  technologies: string[];
  dotColor: string;
  periodColor: string;
}

const Experience = () => {
  const containerRef = useRef(null);

  const experiences: ExperienceData[] = [
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
  ];

  useGSAP(() => {
    const items = gsap.utils.toArray('.experience-item');
    items.forEach((item: any, index) => {
        gsap.from(item, {
            scrollTrigger: {
                trigger: item,
                start: "top 85%",
                toggleActions: "play none none reverse"
            },
            x: -50,
            opacity: 0,
            duration: 1,
            delay: index * 0.1,
            ease: "power3.out"
        });
    });
  }, { scope: containerRef });

  return (
    <section id="experience" className="py-24 px-6 max-w-6xl mx-auto" ref={containerRef}>
        <div className="mb-16 text-center">
            <h2 className="text-5xl md:text-6xl font-bold mb-4 cosmic-glow" style={{ fontFamily: 'var(--font-display)' }}>EXPERIENCE</h2>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto"></div>
        </div>

        <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500 via-purple-500 to-cyan-400"></div>
            
            <div className="space-y-12">
                {experiences.map((experience, index) => (
                    <ExperienceCard
                        key={index}
                        title={experience.title}
                        company={experience.company}
                        location={experience.location}
                        period={experience.period}
                        description={experience.description}
                        technologies={experience.technologies}
                        dotColor={experience.dotColor}
                        periodColor={experience.periodColor}
                        index={index}
                    />
                ))}
            </div>
        </div>
    </section>
  );
};

export default Experience;
