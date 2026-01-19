import { Github, Linkedin, Instagram, Hash } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { siteData } from '@/data/siteData'; // adjust path if needed

const Footer = () => {
  const {
    footer: { tagline, copyright },
    social,
    services,
  } = siteData;

  const quickLinks = [
    { label: 'About', href: '#about' },
    { label: 'Projects', href: '#projects' },
    { label: 'Experience', href: '#experience' },
    { label: 'Blog', href: '#blog' },
    { label: 'Contact', href: '#contact' },
  ];

  const socialLinks = [
    { Icon: Github, href: social.github },
    { Icon: Linkedin, href: social.linkedin },
    { Icon: Instagram, href: social.instagram },
    { Icon: Hash, href: social.hashnode },
  ];

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
            <p className="text-gray-400 text-sm leading-relaxed">{tagline}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">Quick Links</h4>
            <div className="space-y-2">
              {quickLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-gray-400 hover:text-indigo-400 transition-colors text-sm"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-bold mb-4">Services</h4>
            <div className="space-y-2 text-sm text-gray-400">
              {services.map((service, idx) => (
                <div key={idx}>{service}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm flex items-center gap-1">
            {copyright}
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map(({ Icon, href }, idx) => (
              <a
                key={idx}
                href={href.trim()} // or fix trailing spaces in data.ts
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-indigo-400 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;