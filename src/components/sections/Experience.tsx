"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { siteData } from "../../data/siteData";

const { experience: experiences } = siteData;

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

interface ExperienceData {
  title: string;
  company: string;
  location: string;
  period: string;
  description: string;
  technologies: string[];
  dotColor: string;
  gradient: string;
}

const Experience = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray(".experience-card");
      const dots = gsap.utils.toArray(".timeline-dot");

      // 1. Animate the vertical line drawing downwards based on scroll
      gsap.fromTo(
        lineRef.current,
        { scaleY: 0, transformOrigin: "top" },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 60%",
            end: "bottom 80%",
            scrub: 1, // Smooth scrubbing effect
          },
        },
      );

      // 2. Animate Cards with 3D effect and Stagger
      cards.forEach((card: any) => {
        // Elements inside the card to stagger
        const content = card.querySelectorAll(".stagger-item");

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            end: "bottom 60%",
            toggleActions: "play none none reverse",
          },
        });

        // Card Container entrance
        tl.fromTo(
          card,
          {
            opacity: 0,
            y: 50,
            rotationX: -10,
            scale: 0.95,
            filter: "blur(10px)",
          },
          {
            opacity: 1,
            y: 0,
            rotationX: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.8,
            ease: "power3.out",
          },
        )
          // Internal elements stagger
          .from(
            content,
            {
              y: 20,
              opacity: 0,
              duration: 0.5,
              stagger: 0.1,
              ease: "power2.out",
            },
            "-=0.4",
          );
      });

      // 3. Animate Dots activating
      dots.forEach((dot: any) => {
        gsap.fromTo(
          dot,
          {
            scale: 0,
            backgroundColor: "transparent",
            border: "2px solid #333",
          },
          {
            scale: 1,
            backgroundColor: dot.dataset.color,
            borderColor: dot.dataset.color,
            duration: 0.4,
            scrollTrigger: {
              trigger: dot,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });
    },
    { scope: containerRef },
  );

  return (
    <section
      id="experience"
      ref={containerRef}
      className="py-24 px-4 md:px-6 relative overflow-hidden "
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2
            className="text-5xl md:text-6xl font-bold mb-4 cosmic-glow"
            style={{ fontFamily: "var(--font-display)" }}
          >
            EXPERIENCE
          </h2>
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto"></div>
        </div>

        <div className="relative">
          {/* Static Background Line */}
          <div className="absolute left-[19px] md:left-1/2 top-0 bottom-0 w-0.5 bg-slate-800 -translate-x-1/2"></div>

          {/* Animated Filling Line (The "Snake") */}
          <div
            ref={lineRef}
            className="absolute left-[19px] md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400 via-purple-500 to-indigo-500 -translate-x-1/2 shadow-[0_0_15px_rgba(168,85,247,0.8)] z-0"
          ></div>

          <div className="space-y-16 md:space-y-24">
            {experiences.map((exp, index) => (
              <div
                key={index}
                className={`relative flex flex-col md:flex-row items-start ${index % 2 === 0 ? "md:flex-row-reverse" : ""} group`}
              >
                {/* The Dot (Center Axis) */}
                <div className="absolute left-[19px] md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full z-20 flex items-center justify-center">
                  {/* The animated inner dot */}
                  <div
                    className="timeline-dot w-4 h-4 rounded-full shadow-[0_0_15px_currentColor]"
                    data-color={exp.dotColor}
                    style={{ color: exp.dotColor }}
                  ></div>
                  {/* Pulse effect behind dot */}
                  <div className="absolute w-8 h-8 rounded-full border border-slate-700 animate-ping opacity-20"></div>
                </div>

                {/* Spacer for Desktop Layout */}
                <div className="hidden md:block md:w-1/2" />

                {/* The Card */}
                <div className="ml-12 md:ml-0 md:w-1/2 md:px-12 experience-card perspective-1000">
                  <div className="relative p-1 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 group-hover:from-slate-700 group-hover:to-slate-800 transition-all duration-500 border border-slate-800 hover:border-slate-600 shadow-xl overflow-hidden">
                    {/* Hover Glow Effect */}
                    <div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-r ${exp.gradient} blur-xl`}
                    />

                    <div className="relative bg-slate-950/80 backdrop-blur-xl p-6 md:p-8 rounded-xl h-full">
                      {/* Date Tag */}
                      <div className="stagger-item inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 mb-4 shadow-inner">
                        <span
                          className={`w-2 h-2 rounded-full bg-gradient-to-r ${exp.gradient}`}
                        ></span>
                        {exp.period}
                      </div>

                      {/* Content */}
                      <h3 className="stagger-item text-2xl font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                        {exp.title}
                      </h3>
                      <div className="stagger-item text-slate-400 font-medium mb-4 flex items-center gap-2">
                        <span>{exp.company}</span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                        <span className="text-sm text-slate-500">
                          {exp.location}
                        </span>
                      </div>

                      <p className="stagger-item text-slate-300 leading-relaxed mb-6 text-sm md:text-base">
                        {exp.description}
                      </p>

                      {/* Tech Stack */}
                      <div className="flex flex-wrap gap-2">
                        {exp.technologies.map((tech, i) => (
                          <span
                            key={i}
                            className="stagger-item px-3 py-1 text-xs font-medium rounded-md bg-slate-900/50 border border-slate-800 text-slate-400 group-hover:border-slate-700 group-hover:text-slate-200 transition-all duration-300 hover:scale-105"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Experience;
