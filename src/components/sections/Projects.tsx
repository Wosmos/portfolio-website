"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  Github,
  ExternalLink,
  ArrowRight,
  Code2,
  Cpu,
  Database,
  Smartphone,
  Globe,
  Terminal,
  X,
  Layers,
} from "lucide-react";
import { siteData } from "@/data/siteData";

gsap.registerPlugin(ScrollTrigger);

// --- UTILS ---
const cn = (...classes: string[]) => classes.filter(Boolean).join(" ");

const getTechIcon = (tech: string) => {
  const t = tech.toLowerCase();
  if (t.includes("react") || t.includes("next") || t.includes("vue"))
    return <Code2 size={14} />;
  if (t.includes("ai") || t.includes("model") || t.includes("gpt"))
    return <Cpu size={14} />;
  if (t.includes("sql") || t.includes("data") || t.includes("mongo"))
    return <Database size={14} />;
  if (t.includes("mobile") || t.includes("flutter"))
    return <Smartphone size={14} />;
  if (t.includes("css") || t.includes("tail") || t.includes("style"))
    return <Globe size={14} />;
  return <Terminal size={14} />;
};

/**
 * --- PROJECT MODAL ---
 * (Kept largely the same as it handles the details perfectly)
 */
const ProjectModal = ({
  project,
  onClose,
}: {
  project: any;
  onClose: () => void;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleClose = useCallback(() => {
    gsap.to(contentRef.current, { y: 50, opacity: 0, duration: 0.3 });
    gsap.to(modalRef.current, {
      opacity: 0,
      duration: 0.3,
      onComplete: onClose,
    });
  }, [onClose]);

  useGSAP(
    () => {
      const tl = gsap.timeline();
      tl.fromTo(
        modalRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 },
      ).fromTo(
        contentRef.current,
        { y: 50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.1)" },
        "-=0.1",
      );
    },
    { scope: modalRef },
  );

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
      />
      <div
        ref={contentRef}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-all"
        >
          <X size={20} />
        </button>

        {/* Image Side */}
        <div className="w-full md:w-5/12 h-64 md:h-auto relative bg-neutral-900">
          <Image
            src={project.mobileImage}
            alt={project.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>

        {/* Content Side */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0f0f0f]">
          <h2 className="text-3xl font-bold text-white mb-2">
            {project.title}
          </h2>
          <div className="flex gap-4 mb-6">
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
              >
                <ExternalLink size={14} /> Live Demo
              </a>
            )}
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
              >
                <Github size={14} /> Source Code
              </a>
            )}
          </div>
          <p className="text-neutral-300 mb-6 leading-relaxed">
            {project.description}
          </p>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} /> Technologies
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((t: string, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-white/5 border border-white/10 text-xs text-neutral-300"
                >
                  {getTechIcon(t)} {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * --- SIMPLIFIED CARD ---
 * Pure CSS hover effects, no JS tilt for smoother performance
 */
const ProjectCard = ({
  project,
  className,
  onClick,
}: {
  project: any;
  className?: any;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-neutral-900 border border-white/10 cursor-pointer project-card-entry",
        "transition-all duration-500 hover:border-white/30 hover:shadow-2xl",
        className,
      )}
    >
      <div className="absolute inset-0 w-full h-full">
        <Image
          src={project.image}
          alt={project.title}
          fill
          className="
      object-cover
      transition-transform duration-700
      group-hover:scale-110
      opacity-80
      group-hover:opacity-55
    "
        />

        {/* Premium Glass Layer */}
        <div
          className="
      absolute inset-0
      opacity-0 group-hover:opacity-100
      transition-all duration-500 ease-out

      bg-white/5
      backdrop-blur-xl
      backdrop-saturate-150
      backdrop-brightness-110

      ring-1 ring-white/10
      shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]
    "
        />

        {/* Light Reflection */}
        <div
          className="
      pointer-events-none
      absolute -top-1/2 left-0 w-full h-full
      opacity-0 group-hover:opacity-100
      transition-opacity duration-700

      bg-gradient-to-b
      from-white/15
      via-transparent
      to-transparent
    "
        />

        {/* Depth Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90" />
      </div>

      {/* Content Layer */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
          {/* Category Tag */}
          <span className="inline-block mb-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md text-cyan-300 border border-white/10">
            {project.category}
          </span>

          {/* Title */}
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
            {project.title}
          </h3>

          {/* Hidden Details revealed on hover */}
          <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500">
            <div className="overflow-hidden">
              <div className="pt-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100">
                <span className="text-sm text-neutral-300 line-clamp-1">
                  {project.description}
                </span>
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-black shrink-0">
                  <ArrowRight
                    size={16}
                    className="-rotate-45 group-hover:rotate-0 transition-transform duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * --- MAIN LAYOUT ---
 * 3 Cols Top, 2 Cols Bottom
 */
const Projects = () => {
  const containerRef = useRef(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Strictly select first 5 projects
  const projects = siteData.projects.slice(0, 5);

  useGSAP(
    () => {
      // Simple fade up animation for cards
      gsap.fromTo(
        ".project-card-entry",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          },
        },
      );
    },
    { scope: containerRef },
  );

  return (
    <section
      id="projects"
      ref={containerRef}
      className="relative py-20 px-4 md:px-8 min-h-screen flex flex-col justify-center"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1400px] mx-auto w-full relative z-10">
        {/* Header */}
        <div className="mb-16 text-center">
        <h2
          className="text-5xl md:text-6xl font-bold mb-4 cosmic-glow"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Selected Works
        </h2>
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto"></div>
      </div>

        {/* 
          GRID LAYOUT EXPLANATION:
          - lg:grid-cols-6 creates a 6-column grid.
          - Row 1 (Items 0,1,2): col-span-2 (2+2+2 = 6, fills width).
          - Row 2 (Items 3,4): col-span-3 (3+3 = 6, fills width, splits perfectly).
          - h-[40vh] makes rows responsive to laptop screen height.
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {projects.map((project, idx) => {
            // Logic for 3 on top, 2 on bottom
            // If idx < 3 (0, 1, 2) -> Span 2 cols each (3 items per row)
            // If idx >= 3 (3, 4)   -> Span 3 cols each (2 items per row)
            const isTopRow = idx < 3;
            const colSpanClass = isTopRow ? "lg:col-span-2" : "lg:col-span-3";

            return (
              <ProjectCard
                key={idx}
                project={project}
                className={`
                  ${colSpanClass} 
                  h-[350px] lg:h-[40vh] min-h-[300px] 
                `}
                onClick={() => setSelectedProject(project)}
              />
            );
          })}
        </div>
      </div>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </section>
  );
};

export default Projects;
