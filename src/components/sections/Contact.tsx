'use client';

import { useState, useRef } from 'react';
import { Zap, Mail, Phone, MapPin, Clock, Github, Linkedin, Instagram, Hash, Send, Check, Loader2, AlertCircle } from 'lucide-react';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

const Contact = () => {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      setStatus('success');
      formRef.current?.reset();
      
      // Reset to idle after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
      
      // Reset to idle after 5 seconds
      setTimeout(() => {
        setStatus('idle');
        setErrorMessage('');
      }, 5000);
    }
  };

  return (
    <section id="contact" className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto">
            <div className="glass-cosmic rounded-3xl p-8 md:p-12 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl"></div>

                <div className="relative z-10">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4 cosmic-glow">Let&apos;s Build Something</h2>
                        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                            Ready to bring your ideas to life? Whether it&apos;s a cutting-edge web application, mobile app, or AI integration, 
                            I&apos;m here to help transform your vision into reality.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Contact Info */}
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Zap className="w-6 h-6 text-yellow-400" />
                                    Quick Connect
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 glass-cosmic rounded-lg hover:bg-white/5 transition-colors">
                                        <div className="p-3 bg-indigo-500/20 rounded-full">
                                            <Mail className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-400">Email</div>
                                            <div className="font-medium">m.wasifmalik17@gmail.com</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 glass-cosmic rounded-lg hover:bg-white/5 transition-colors">
                                        <div className="p-3 bg-green-500/20 rounded-full">
                                            <Phone className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-400">Phone</div>
                                            <div className="font-medium">+92 306 224 8224</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 glass-cosmic rounded-lg hover:bg-white/5 transition-colors">
                                        <div className="p-3 bg-purple-500/20 rounded-full">
                                            <MapPin className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-400">Location</div>
                                            <div className="font-medium">Karachi, Pakistan</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 glass-cosmic rounded-lg hover:bg-white/5 transition-colors">
                                        <div className="p-3 bg-cyan-500/20 rounded-full">
                                            <Clock className="w-5 h-5 text-cyan-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-400">Timezone</div>
                                            <div className="font-medium">UTC+5 (PKT)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Social Links */}
                            <div>
                                <h4 className="text-lg font-bold mb-4">Connect on Social</h4>
                                <div className="flex gap-4">
                                    <a href="https://github.com/Wosmos" target="_blank" rel="noopener noreferrer" className="p-3 glass-cosmic rounded-full hover:bg-indigo-500/20 transition-all hover:scale-110">
                                        <Github className="w-5 h-5" />
                                    </a>
                                    <a href="https://www.linkedin.com/in/wasif-m-79205a1bb/" target="_blank" rel="noopener noreferrer" className="p-3 glass-cosmic rounded-full hover:bg-blue-500/20 transition-all hover:scale-110">
                                        <Linkedin className="w-5 h-5" />
                                    </a>
                                    <a href="https://www.instagram.com/wosmo_tech/" target="_blank" rel="noopener noreferrer" className="p-3 glass-cosmic rounded-full hover:bg-pink-500/20 transition-all hover:scale-110">
                                        <Instagram className="w-5 h-5" />
                                    </a>
                                    <a href="https://hashnode.com/@Wosmo" target="_blank" rel="noopener noreferrer" className="p-3 glass-cosmic rounded-full hover:bg-green-500/20 transition-all hover:scale-110">
                                        <Hash className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <form ref={formRef} className="space-y-6" onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                                    <input type="text" name="name" required className="w-full bg-black/30 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-indigo-500 transition-colors text-white placeholder-gray-500" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                                    <input type="email" name="email" required className="w-full bg-black/30 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-indigo-500 transition-colors text-white placeholder-gray-500" placeholder="john@example.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                                <input type="text" name="subject" required className="w-full bg-black/30 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-indigo-500 transition-colors text-white placeholder-gray-500" placeholder="Project Discussion" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                                <textarea name="message" rows={5} required className="w-full bg-black/30 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-indigo-500 transition-colors text-white placeholder-gray-500 resize-none" placeholder="Tell me about your project..."></textarea>
                            </div>
                            {/* Error Message */}
                            {status === 'error' && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {errorMessage}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={status === 'loading'}
                                className={`w-full text-white font-bold py-4 rounded-lg transition-all shadow-lg hover:scale-105 transform disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                    status === 'success' 
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/25' 
                                        : status === 'error'
                                        ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/25'
                                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-indigo-500/25 hover:shadow-purple-500/25'
                                }`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    {status === 'loading' && (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Sending...
                                        </>
                                    )}
                                    {status === 'success' && (
                                        <>
                                            <Check className="w-5 h-5" />
                                            Message Sent!
                                        </>
                                    )}
                                    {status === 'error' && (
                                        <>
                                            <AlertCircle className="w-5 h-5" />
                                            Failed to Send
                                        </>
                                    )}
                                    {status === 'idle' && (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Send Message
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>
                    </div>

                    {/* Call to Action */}
                    <div className="mt-12 text-center">
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full text-green-400">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                            </span>
                            Available for new projects
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
};

export default Contact;
