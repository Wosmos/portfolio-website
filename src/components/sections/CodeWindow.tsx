"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  X,
  Minus,
  Square,
  FileCode,
  Terminal as TerminalIcon,
  Play,
} from "lucide-react";

interface CodeLineProps {
  num: string | number;
  children: React.ReactNode;
  className?: string;
}

const CodeLine = ({ num, children, className = "" }: CodeLineProps) => (
  <div className={`flex font-mono text-sm leading-6 ${className}`}>
    <span className="w-8 text-gray-400 select-none text-right mr-4">{num}</span>
    <span className="flex-1 whitespace-pre">{children}</span>
  </div>
);

const CodeTerminal = () => {
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // ... (rest of the component state and hooks remain the same)

  const tabs = [
    { name: "wasif_profile.tsx", icon: FileCode, modified: false },
    { name: "skills.ts", icon: FileCode, modified: true },
    { name: "experience.json", icon: FileCode, modified: false },
  ];

  useGSAP(
    () => {
      gsap.to(".cursor-blink", {
        opacity: 0,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: "steps(1)",
      });

      gsap.to(containerRef.current, {
        y: -10,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: containerRef },
  );

  const handleClose = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    gsap.to(target, {
      scale: 1.2,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
    });
    gsap.to(containerRef.current, {
      scale: 0.8,
      opacity: 0,
      duration: 0.3,
      ease: "back.in",
      onComplete: () => {
        gsap.to(containerRef.current, { scale: 1, opacity: 1, duration: 0.3 });
      },
    });
  };

  const handleMinimize = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    gsap.to(target, {
      scale: 1.2,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
    });
    setIsMinimized(!isMinimized);
    gsap.to(containerRef.current, {
      scaleY: isMinimized ? 1 : 0.05,
      transformOrigin: "top",
      duration: 0.4,
      ease: "power2.inOut",
    });
  };

  const handleMaximize = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    gsap.to(target, {
      rotate: 180,
      scale: 1.2,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
    });
    setIsMaximized(!isMaximized);
  };

  return (
    <div ref={containerRef} className="relative group">
      <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <div
        className={`relative rounded-lg overflow-hidden bg-[#1e1e1e] border border-[#2d2d30] shadow-2xl transition-all duration-300 ${isMaximized ? "scale-105" : ""}`}
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#323233] border-b border-[#2d2d30]">
          <div className="flex items-center gap-3">
            <div className="flex gap-3">
              <button
                name="close"
                aria-label="Close"
                onClick={handleClose}
                className="w-4 h-4 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-all duration-200 flex items-center justify-center group/btn"
              >
                <X className="w-3 h-3 text-[#4d0000] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              </button>
              <button
                name="minimize"
                aria-label="Minimize"
                onClick={handleMinimize}
                className="w-4 h-4 rounded-full bg-[#febc2e] hover:bg-[#ffb300] transition-all duration-200 flex items-center justify-center group/btn"
              >
                <Minus className="w-3 h-3 text-[#4d3500] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              </button>
              <button
                name="maximize"
                aria-label="Maximize"
                onClick={handleMaximize}
                className="w-4 h-4 rounded-full bg-[#28c840] hover:bg-[#1aab2a] transition-all duration-200 flex items-center justify-center group/btn"
              >
                <Square className="w-2 h-2 text-[#004d00] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              </button>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              Visual Studio Code
            </span>
          </div>
          <div className="text-xs text-gray-400">wasif-portfolio</div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center bg-[#252526] border-b border-[#2d2d30] overflow-x-auto">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <button
                name="tab"
                key={index}
                onClick={() => setActiveTab(index)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-mono border-r border-[#2d2d30] transition-all duration-200 hover:bg-[#2d2d30] ${
                  activeTab === index
                    ? "bg-[#1e1e1e] text-white"
                    : "text-gray-400"
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.name}
                {tab.modified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Editor Content */}
        <div
          className="bg-[#1e1e1e] p-6 text-gray-200 overflow-x-auto overflow-y-hidden"
          style={{ width: "600px", height: "408px" }}
        >
          <div className="min-w-[500px] ">
            {activeTab === 0 && (
              <>
                <CodeLine num="1">
                  <span className="text-[#c586c0]">const</span>{" "}
                  <span className="text-[#4ec9b0]">Developer</span>{" "}
                  <span className="text-white">=</span>{" "}
                  <span className="text-[#ffd700]">{"{"}</span>
                </CodeLine>

                <CodeLine num="2">
                  <span className="ml-4 text-[#9cdcfe]">name:</span>{" "}
                  <span className="text-[#ce9178]">'Wasif Malik'</span>,
                </CodeLine>

                <CodeLine num="3">
                  <span className="ml-4 text-[#9cdcfe]">role:</span>{" "}
                  <span className="text-[#ce9178]">'Cosmic Architect'</span>,
                </CodeLine>

                <CodeLine num="4">
                  <span className="ml-4 text-[#9cdcfe]">location:</span>{" "}
                  <span className="text-[#ce9178]">'Karachi, Pakistan'</span>,
                </CodeLine>

                <CodeLine num="5">
                  <span className="ml-4 text-[#9cdcfe]">stack:</span>{" "}
                  <span className="text-white">[</span>
                  <span className="text-[#ce9178]">'Next.js'</span>,{" "}
                  <span className="text-[#ce9178]">'Flutter'</span>,{" "}
                  <span className="text-[#ce9178]">'AI'</span>
                  <span className="text-white">]</span>,
                </CodeLine>

                <CodeLine num="6">
                  <span className="ml-4 text-[#9cdcfe]">hardWorker:</span>{" "}
                  <span className="text-[#569cd6]">true</span>,
                </CodeLine>

                <CodeLine num="7">
                  <span className="ml-4 text-[#9cdcfe]">problemSolver:</span>{" "}
                  <span className="text-[#ffd700]">()</span>{" "}
                  <span className="text-[#c586c0]">=&gt;</span>{" "}
                  <span className="text-[#ffd700]">{"{"}</span>
                </CodeLine>

                <CodeLine num="8">
                  <span className="ml-8 text-[#c586c0]">return</span>{" "}
                  <span className="text-[#ce9178]">"Elegant Solutions"</span>;
                </CodeLine>

                <CodeLine num="9">
                  <span className="ml-4 text-[#ffd700]">{"}"}</span>,
                </CodeLine>

                <CodeLine num="10">
                  <span className="ml-4 text-[#9cdcfe]">currentFocus:</span>{" "}
                  <span className="text-[#ce9178]">'Building the Future'</span>
                </CodeLine>

                <CodeLine num="11">
                  <span className="text-[#ffd700]">{"}"}</span>;
                </CodeLine>
              </>
            )}

            {activeTab === 1 && (
              <>
                <CodeLine num="1">
                  <span className="text-[#6a9955]">
                    // Technical Skills & Technologies
                  </span>
                </CodeLine>

                <CodeLine num="2">
                  <span className="text-[#c586c0]">type</span>{" "}
                  <span className="text-[#4ec9b0]">TechStack</span>{" "}
                  <span className="text-white">=</span>{" "}
                  <span className="text-[#ffd700]">{"{"}</span>
                </CodeLine>

                <CodeLine num="3">
                  <span className="ml-4 text-[#9cdcfe]">frontend:</span>{" "}
                  <span className="text-[#4ec9b0]">string</span>
                  <span className="text-white">[]</span>;
                </CodeLine>

                <CodeLine num="4">
                  <span className="ml-4 text-[#9cdcfe]">backend:</span>{" "}
                  <span className="text-[#4ec9b0]">string</span>
                  <span className="text-white">[]</span>;
                </CodeLine>

                <CodeLine num="5">
                  <span className="ml-4 text-[#9cdcfe]">mobile:</span>{" "}
                  <span className="text-[#4ec9b0]">string</span>
                  <span className="text-white">[]</span>;
                </CodeLine>

                <CodeLine num="6">
                  <span className="text-[#ffd700]">{"}"}</span>;
                </CodeLine>

                <CodeLine num="7" className="mt-2">
                  <span className="text-[#c586c0]">const</span>{" "}
                  <span className="text-[#4fc1ff]">skills</span>
                  <span className="text-white">:</span>{" "}
                  <span className="text-[#4ec9b0]">TechStack</span>{" "}
                  <span className="text-white">=</span>{" "}
                  <span className="text-[#ffd700]">{"{"}</span>
                </CodeLine>

                <CodeLine num="8">
                  <span className="ml-4 text-[#9cdcfe]">frontend:</span>{" "}
                  <span className="text-white">[</span>
                </CodeLine>

                <CodeLine num="9">
                  <span className="ml-8 text-[#ce9178]">'HTML5'</span>,{" "}
                  <span className="text-[#ce9178]">'CSS3'</span>,{" "}
                  <span className="text-[#ce9178]">'JavaScript'</span>,{" "}
                  <span className="text-[#ce9178]">'TypeScript'</span>,
                </CodeLine>

                <CodeLine num="10">
                  <span className="ml-8 text-[#ce9178]">'React'</span>,{" "}
                  <span className="text-[#ce9178]">'Next.js'</span>,{" "}
                  <span className="text-[#ce9178]">'Redux'</span>,{" "}
                  <span className="text-[#ce9178]">'Tailwind'</span>
                </CodeLine>

                <CodeLine num="11">
                  <span className="ml-4 text-white">]</span>,
                </CodeLine>

                <CodeLine num="12">
                  <span className="ml-4 text-[#9cdcfe]">backend:</span>{" "}
                  <span className="text-white">[</span>
                  <span className="text-[#ce9178]">'Node.js'</span>,{" "}
                  <span className="text-[#ce9178]">'Express'</span>,{" "}
                  <span className="text-[#ce9178]">'MongoDB'</span>,{" "}
                  <span className="text-[#ce9178]">'PostgreSQL'</span>
                  <span className="text-white">]</span>,
                </CodeLine>

                <CodeLine num="13">
                  <span className="ml-4 text-[#9cdcfe]">mobile:</span>{" "}
                  <span className="text-white">[</span>
                  <span className="text-[#ce9178]">'Flutter'</span>,{" "}
                  <span className="text-[#ce9178]">'React Native'</span>
                  <span className="text-white">]</span>
                </CodeLine>

                <CodeLine num="14">
                  <span className="text-[#ffd700]">{"}"}</span>;
                </CodeLine>

                <CodeLine num="15" className="mt-2">
                  <span className="text-[#c586c0]">export default</span>{" "}
                  <span className="text-[#4fc1ff]">skills</span>;
                </CodeLine>
              </>
            )}

            {activeTab === 2 && (
              <>
                <CodeLine num="1">
                  <span className="text-[#ffd700]">{"{"}</span>
                </CodeLine>

                <CodeLine num="2">
                  <span className="ml-4 text-[#9cdcfe]">"experience"</span>
                  <span className="text-white">:</span>{" "}
                  <span className="text-white">[</span>
                </CodeLine>

                <CodeLine num="3">
                  <span className="ml-8 text-[#ffd700]">{"{"}</span>
                </CodeLine>

                <CodeLine num="4">
                  <span className="ml-12 text-[#9cdcfe]">"title"</span>
                  <span className="text-white">:</span>{" "}
                  <span className="text-[#ce9178]">"Full Stack Developer"</span>
                  ,
                </CodeLine>

                <CodeLine num="5">
                  <span className="ml-12 text-[#9cdcfe]">"company"</span>
                  <span className="text-white">:</span>{" "}
                  <span className="text-[#ce9178]">"Avialdo Solutions"</span>,
                </CodeLine>

                <CodeLine num="6">
                  <span className="ml-12 text-[#9cdcfe]">"location"</span>
                  <span className="text-white">:</span>{" "}
                  <span className="text-[#ce9178]">"Karachi"</span>,
                </CodeLine>

                <CodeLine num="7">
                  <span className="ml-12 text-[#9cdcfe]">"period"</span>
                  <span className="text-white">:</span>{" "}
                  <span className="text-[#ce9178]">"Jan 2025 - Present"</span>,
                </CodeLine>

                <CodeLine num="8">
                  <span className="ml-12 text-[#9cdcfe]">"tech"</span>
                  <span className="text-white">:</span>{" "}
                  <span className="text-white">[</span>
                  <span className="text-[#ce9178]">"Next.js"</span>,{" "}
                  <span className="text-[#ce9178]">"PostgreSQL"</span>,{" "}
                  <span className="text-[#ce9178]">"Jira"</span>
                  <span className="text-white">]</span>
                </CodeLine>

                <CodeLine num="9">
                  <span className="ml-8 text-[#ffd700]">{"}"}</span>,
                </CodeLine>

                <CodeLine num="10">
                  <span className="ml-8 text-[#ffd700]">{"{"}</span>
                </CodeLine>

                <CodeLine num="11">
                  <span className="ml-12 text-[#9cdcfe]">"title"</span>
                  <span className="text-white">:</span>{" "}
                  <span className="text-[#ce9178]">
                    "Frontend Developer Intern"
                  </span>
                  ,
                </CodeLine>

                <CodeLine num="12">
                  <span className="ml-12 text-[#9cdcfe]">"company"</span>
                  <span className="text-white">:</span>{" "}
                  <span className="text-[#ce9178]">"LiftUp AI"</span>,
                </CodeLine>

                <CodeLine num="13">
                  <span className="ml-12 text-[#9cdcfe]">"period"</span>
                  <span className="text-white">:</span>{" "}
                  <span className="text-[#ce9178]">"Jan 2024 - Mar 2024"</span>
                </CodeLine>

                <CodeLine num="14">
                  <span className="ml-8 text-[#ffd700]">{"}"}</span>
                </CodeLine>

                <CodeLine num="15">
                  <span className="ml-4 text-white">]</span>
                </CodeLine>

                <CodeLine num="16">
                  <span className="text-[#ffd700]">{"}"}</span>
                </CodeLine>
              </>
            )}
          </div>
        </div>

        {/* Terminal Section */}
        <div className="bg-[#181818] border-t border-[#2d2d30] xl:block hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#2d2d30]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-white">
                <TerminalIcon className="w-3 h-3" />
                TERMINAL
              </div>
              {/* <div className="flex gap-4 text-xs text-gray-500">
                <button className="hover:text-white transition-colors">PROBLEMS</button>
                <button className="hover:text-white transition-colors">OUTPUT</button>
                <button className="hover:text-white transition-colors">DEBUG CONSOLE</button>
              </div> */}
            </div>
            <div className="flex items-center gap-2">
              <Play className="w-3 h-3 text-green-400 cursor-pointer hover:text-green-300 transition-colors" />
            </div>
          </div>

          <div className="px-4 py-3 font-mono text-sm">
            <div className="text-gray-400 mb-1">
              wasif@portfolio:~/projects$
            </div>
            <div className="text-green-400 mb-1">$ npm run build-future</div>
            <div className="text-cyan-400 mb-1">
              &gt; Building amazing experiences...
            </div>
            <div className="text-gray-400 mb-1">✓ Compiled successfully</div>
            <div className="text-purple-400 mb-1">
              ✓ Innovation level: Maximum
            </div>
            <div className="text-yellow-400">
              ⚡ Ready to ship!
              <span className="cursor-blink w-2 h-4 bg-cyan-400 inline-block ml-1 align-middle"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute -top-6 -right-6 w-16 h-16 border border-cyan-500/20 rounded-lg rotate-12 -z-10 animate-pulse"></div>
      <div className="absolute -bottom-8 -left-4 w-12 h-12 bg-purple-600/20 rounded-full blur-md -z-10"></div>
    </div>
  );
};

export default CodeTerminal;
