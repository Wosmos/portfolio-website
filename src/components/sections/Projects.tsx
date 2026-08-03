'use client';

import { useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  Github, ExternalLink, ArrowRight, ArrowUpRight,
  Shield, GraduationCap, Wifi, PenTool, FileText,
  Brain, Film, Layers, Globe, Video, Code2, BookOpen, Bug
} from 'lucide-react';
import { siteData } from '@/data/siteData';

gsap.registerPlugin(ScrollTrigger);

const HIGHLIGHTED_IDS = ['zcrypt', 'learnity', 'docxo', 'tellow', 'devtoolshq'];

const projectMeta: Record<string, { icon: typeof Shield; iconBg: string; iconColor: string; glow: string; gradientFrom: string; gradientTo: string; category: string }> = {
  zcrypt:        { icon: Shield,        iconBg: 'bg-cyan-500/20',    iconColor: 'text-cyan-400',    glow: 'cyan',    gradientFrom: 'from-cyan-500/20',    gradientTo: 'to-emerald-500/10', category: 'Security' },
  learnity:      { icon: GraduationCap, iconBg: 'bg-amber-500/20',   iconColor: 'text-amber-400',   glow: 'amber',   gradientFrom: 'from-amber-500/20',   gradientTo: 'to-orange-500/10',  category: 'EdTech' },
  docxo:         { icon: PenTool,       iconBg: 'bg-blue-500/20',    iconColor: 'text-blue-400',    glow: 'blue',    gradientFrom: 'from-blue-500/20',    gradientTo: 'to-indigo-500/10',  category: 'Collaboration' },
  tellow:        { icon: Video,         iconBg: 'bg-indigo-500/20',  iconColor: 'text-indigo-400',  glow: 'indigo',  gradientFrom: 'from-indigo-500/20',  gradientTo: 'to-purple-500/10',  category: 'Mobile App' },
  devtoolshq:    { icon: Code2,         iconBg: 'bg-sky-500/20',     iconColor: 'text-sky-400',     glow: 'sky',     gradientFrom: 'from-sky-500/20',     gradientTo: 'to-blue-500/10',    category: 'Developer Tools' },
  netlink:       { icon: Wifi,          iconBg: 'bg-green-500/20',   iconColor: 'text-green-400',   glow: 'green',   gradientFrom: 'from-green-500/20',   gradientTo: 'to-emerald-500/10', category: 'Backend' },
  resumeright:   { icon: FileText,      iconBg: 'bg-orange-500/20',  iconColor: 'text-orange-400',  glow: 'orange',  gradientFrom: 'from-orange-500/20',  gradientTo: 'to-yellow-500/10',  category: 'AI' },
  scrappo:       { icon: Bug,           iconBg: 'bg-lime-500/20',    iconColor: 'text-lime-400',    glow: 'lime',    gradientFrom: 'from-lime-500/20',    gradientTo: 'to-green-500/10',   category: 'Backend' },
  wizmo:         { icon: Brain,         iconBg: 'bg-violet-500/20',  iconColor: 'text-violet-400',  glow: 'violet',  gradientFrom: 'from-violet-500/20',  gradientTo: 'to-purple-500/10',  category: 'AI' },
  wovies:        { icon: Film,          iconBg: 'bg-red-500/20',     iconColor: 'text-red-400',     glow: 'red',     gradientFrom: 'from-red-500/20',     gradientTo: 'to-pink-500/10',    category: 'Web' },
  'django-blogs':{ icon: BookOpen,      iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400', glow: 'emerald', gradientFrom: 'from-emerald-500/20', gradientTo: 'to-green-500/10',   category: 'Backend' },
  miniprojects:  { icon: Layers,        iconBg: 'bg-teal-500/20',    iconColor: 'text-teal-400',    glow: 'teal',    gradientFrom: 'from-teal-500/20',    gradientTo: 'to-cyan-500/10',    category: 'Web' },
  nextsoft:      { icon: Globe,         iconBg: 'bg-purple-500/20',  iconColor: 'text-purple-400',  glow: 'purple',  gradientFrom: 'from-purple-500/20',  gradientTo: 'to-pink-500/10',    category: 'Web' },
};

/* ──────────────────────────────────────────────────────────── */

const Projects = () => {
  const containerRef = useRef(null);
  const otherProjects = siteData.projects.filter(p => !HIGHLIGHTED_IDS.includes(p.id));

  const zcrypt     = siteData.projects.find(p => p.id === 'zcrypt')!;
  const learnity   = siteData.projects.find(p => p.id === 'learnity')!;
  const docxo      = siteData.projects.find(p => p.id === 'docxo')!;
  const tellow     = siteData.projects.find(p => p.id === 'tellow')!;
  const devtoolshq = siteData.projects.find(p => p.id === 'devtoolshq')!;

  useGSAP(() => {
    const cards = gsap.utils.toArray('.project-card') as HTMLElement[];
    gsap.set(cards, { opacity: 1, y: 0 });
    cards.forEach((card, index) => {
      gsap.fromTo(card,
        { opacity: 0, y: 50 },
        {
          scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none none', once: true },
          opacity: 1, y: 0, duration: 0.7, delay: index * 0.06, ease: 'power3.out',
        }
      );
    });
  }, { scope: containerRef });

  /* ── Link helpers ── */
  const LinkPill = ({ href, children, accent = false }: { href: string; children: React.ReactNode; accent?: boolean }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${
         accent
           ? 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
           : 'bg-white/5 text-gray-300 hover:bg-white/10'
       }`}>
      {children}
    </a>
  );

  return (
    <section id="projects" className="py-24 px-6 bg-black/20 backdrop-blur-sm" ref={containerRef}>
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-16 text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-4 cosmic-glow" style={{ fontFamily: 'var(--font-display)' }}>
            SELECTED WORK
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mt-3">Products I&apos;ve designed and built — from first commit to production</p>
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto mt-4" />
        </div>

        {/* ════════════════════════════════════════════════════════
            BENTO GRID — Asymmetric, image-forward, unique layouts
            ════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[minmax(220px,auto)]">

          {/* ─────────── ZCRYPT · Spans 2 cols + 2 rows on lg ─────────── */}
          <article className="project-card lg:col-span-2 lg:row-span-2 rounded-3xl overflow-hidden group relative min-h-[360px] lg:min-h-0"
            style={{ '--card-glow': 'rgba(0, 212, 255, 0.4)' } as React.CSSProperties}>
            {/* Full-bleed screenshot */}
            <div className="absolute inset-0">
              <Image src="/projectsThumbnails/zcrypt.png" alt="Zcrypt" fill className="object-cover object-top transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 66vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/30 to-transparent" />
            </div>

            {/* Content overlay */}
            <div className="relative z-10 h-full flex flex-col justify-between p-7 lg:p-9">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-500/20 backdrop-blur-sm rounded-xl border border-cyan-500/20">
                    <Shield className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 tracking-widest bg-cyan-500/10 backdrop-blur-sm px-3 py-1 rounded-full border border-cyan-500/15">SECURITY</span>
                </div>
                <div className="flex gap-2">
                  {zcrypt.live && (
                    <LinkPill href={zcrypt.live} accent>
                      <ExternalLink className="w-3.5 h-3.5" /> Live
                    </LinkPill>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-4xl lg:text-5xl font-bold mb-3 tracking-tight">Zcrypt</h3>
                <p className="text-gray-300 text-sm leading-relaxed max-w-lg mb-5">
                  Zero-knowledge encrypted cloud storage — files are encrypted on your device with AES-256-GCM before upload, so not even the server can read them. One Go backend serving web, desktop, and terminal clients.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {zcrypt.technologies.map(t => (
                    <span key={t} className="px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full text-xs text-white/80">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </article>

          {/* ─────────── LEARNITY · Right column top ─────────── */}
          <article className="project-card rounded-3xl overflow-hidden group relative min-h-[280px]"
            style={{ '--card-glow': 'rgba(245, 158, 11, 0.4)' } as React.CSSProperties}>
            {/* Screenshot bg */}
            <div className="absolute inset-0">
              <Image src="/projectsThumbnails/learnity.png" alt="Learnity" fill className="object-cover object-top transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/30" />
            </div>

            <div className="relative z-10 h-full flex flex-col justify-between p-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-amber-400 tracking-widest bg-amber-500/10 backdrop-blur-sm px-3 py-1 rounded-full border border-amber-500/15">EDTECH</span>
                <div className="flex gap-1.5">
                  {learnity.github && <LinkPill href={learnity.github}><Github className="w-3.5 h-3.5" /></LinkPill>}
                  {learnity.live && <LinkPill href={learnity.live}><ExternalLink className="w-3.5 h-3.5" /></LinkPill>}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-2">Learnity</h3>
                <p className="text-gray-400 text-xs leading-relaxed mb-3">Online tutoring with a custom gamification engine — XP, streaks, and real-time HD video sessions. Solo-built FYP.</p>
                <div className="flex gap-1.5 flex-wrap">
                  {learnity.technologies.slice(0, 3).map(t => (
                    <span key={t} className="px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] text-white/70">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </article>

          {/* ─────────── DOCXO · Right column bottom ─────────── */}
          <article className="project-card rounded-3xl overflow-hidden group relative min-h-[280px]"
            style={{ '--card-glow': 'rgba(59, 130, 246, 0.4)' } as React.CSSProperties}>
            <div className="absolute inset-0">
              <Image src="/projectsThumbnails/docxo.png" alt="DocXO" fill className="object-cover object-top transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/30" />
            </div>

            <div className="relative z-10 h-full flex flex-col justify-between p-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-blue-400 tracking-widest bg-blue-500/10 backdrop-blur-sm px-3 py-1 rounded-full border border-blue-500/15">COLLABORATION</span>
                <div className="flex gap-1.5">
                  {docxo.github && <LinkPill href={docxo.github}><Github className="w-3.5 h-3.5" /></LinkPill>}
                  {docxo.live && <LinkPill href={docxo.live}><ExternalLink className="w-3.5 h-3.5" /></LinkPill>}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-2">DocXO</h3>
                <p className="text-gray-400 text-xs leading-relaxed mb-3">Real-time collaborative docs — inline comments, version history, and live multi-user editing.</p>
                <div className="flex gap-1.5 flex-wrap">
                  {docxo.technologies.map(t => (
                    <span key={t} className="px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] text-white/70">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </article>

          {/* ─────────── TELLOW · Bottom left (no screenshot — gradient card) ─────────── */}
          <article className="project-card rounded-3xl overflow-hidden group relative min-h-[260px]"
            style={{ '--card-glow': 'rgba(129, 140, 248, 0.4)' } as React.CSSProperties}>
            {/* Gradient + pattern background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-[#0f0f23] to-purple-950">
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/15 rounded-full blur-[80px] group-hover:blur-[60px] group-hover:bg-indigo-500/25 transition-all duration-700" />
            </div>

            <div className="relative z-10 h-full flex flex-col justify-between p-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-indigo-400 tracking-widest bg-indigo-500/10 backdrop-blur-sm px-3 py-1 rounded-full border border-indigo-500/15">MOBILE APP</span>
                {tellow.github && <LinkPill href={tellow.github}><Github className="w-3.5 h-3.5" /></LinkPill>}
              </div>

              <div className="flex items-end justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">Tellow</h3>
                  <p className="text-gray-400 text-xs leading-relaxed mb-3">Cross-platform video calling — HD calls, multi-participant rooms, auth, and push notifications.</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {tellow.technologies.slice(0, 3).map(t => (
                      <span key={t} className="px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] text-white/70">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shrink-0 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-500">
                  <Video className="w-8 h-8 text-indigo-400" />
                </div>
              </div>
            </div>
          </article>

          {/* ─────────── DEVTOOLSHQ · Bottom wide — spans 2 cols ─────────── */}
          <article className="project-card md:col-span-2 rounded-3xl overflow-hidden group relative min-h-[260px]"
            style={{ '--card-glow': 'rgba(14, 165, 233, 0.4)' } as React.CSSProperties}>
            <div className="absolute inset-0">
              <Image src="/projectsThumbnails/devtoolshq.png" alt="DevToolsHQ" fill className="object-cover object-top transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 66vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/25" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
            </div>

            <div className="relative z-10 h-full flex flex-col justify-between p-7 lg:p-9">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-sky-400 tracking-widest bg-sky-500/10 backdrop-blur-sm px-3 py-1 rounded-full border border-sky-500/15">DEVELOPER TOOLS</span>
                <div className="flex gap-2">
                  {devtoolshq.github && <LinkPill href={devtoolshq.github}><Github className="w-3.5 h-3.5" /></LinkPill>}
                  {devtoolshq.live && <LinkPill href={devtoolshq.live} accent><ExternalLink className="w-3.5 h-3.5" /> Live</LinkPill>}
                </div>
              </div>

              <div className="max-w-md">
                <h3 className="text-3xl lg:text-4xl font-bold mb-3 tracking-tight">DevToolsHQ</h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">Unified developer dashboard — formatters, testers, and generators in one optimized workspace.</p>
                <div className="flex gap-2 flex-wrap">
                  {devtoolshq.technologies.map(t => (
                    <span key={t} className="px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full text-xs text-white/80">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* ══════════════════════════════════════════════════════
            MORE PROJECTS
            ══════════════════════════════════════════════════════ */}
        <div className="mt-32 mb-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-3 cosmic-glow" style={{ fontFamily: 'var(--font-display)' }}>
            MORE PROJECTS
          </h2>
          <p className="text-gray-500 text-sm">Other things I&apos;ve built and shipped</p>
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-purple-400 to-transparent mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {otherProjects.map((project) => {
            const meta = projectMeta[project.id] || { icon: Layers, iconBg: 'bg-gray-500/20', iconColor: 'text-gray-400', glow: 'gray', gradientFrom: 'from-gray-500/20', gradientTo: 'to-gray-500/10', category: 'Web' };
            const Icon = meta.icon;
            return (
              <article
                key={project.id}
                className="project-card glass-cosmic rounded-2xl overflow-hidden group hover:bg-white/[0.04] transition-all duration-300 relative"
              >
                {/* Thumbnail */}
                {project.image && (
                  <div className="relative w-full h-32 overflow-hidden">
                    <Image src={project.image} alt={`${project.title} preview`} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f23] via-[#0f0f23]/50 to-transparent" />
                  </div>
                )}

                <div className={`absolute -top-8 -right-8 w-24 h-24 bg-${meta.glow}-500/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                <div className="relative z-10 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 ${meta.iconBg} rounded-xl`}>
                      <Icon className={`w-5 h-5 ${meta.iconColor}`} />
                    </div>
                    <div className="flex gap-1.5">
                      {project.github && (
                        <a href={project.github} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                          <Github className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {project.live && (
                        <a href={project.live} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <h3 className="text-base font-bold mb-1.5">{project.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">{project.description}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {project.technologies.map((tech) => (
                      <span key={tech} className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[10px] text-gray-400">{tech}</span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ── GitHub CTA ── */}
        <div className="text-center mt-16">
          <a href="https://github.com/Wosmos" target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:scale-105 transition-all hover:shadow-2xl hover:shadow-indigo-500/25">
            <Github className="w-5 h-5" />
            View All on GitHub
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Projects;
