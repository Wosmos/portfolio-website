'use client';

import { useEffect, useRef } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { siteData } from '@/data/siteData';

interface ResumeModalProps {
  open: boolean;
  onClose: () => void;
}

const ResumeModal = ({ open, onClose }: ResumeModalProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-cosmic-surface border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-modal-in">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        <div className="flex items-start justify-between p-6 pb-2">
          <div>
            <h3 id="resume-modal-title" className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              DOWNLOAD RESUME
            </h3>
            {/* <p className="text-sm text-gray-400 mt-1">Pick the version that fits the role you have in mind.</p> */}
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 pt-4 space-y-3 safe-area-bottom">
          {siteData.resumes.map((resume) => (
            <a
              key={resume.id}
              href={resume.file}
              download
              onClick={onClose}
              className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all"
            >
              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{resume.label}</span>
                  {resume.recommended && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                      RECOMMENDED
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{resume.description}</p>
              </div>
              <Download className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResumeModal;
