'use client';

interface ExperienceCardProps {
  title: string;
  company: string;
  location: string;
  period: string;
  description: string;
  technologies: string[];
  dotColor: string;
  periodColor: string;
  index: number;
}

const ExperienceCard = ({
  title,
  company,
  location,
  period,
  description,
  technologies,
  dotColor,
  periodColor,
  index
}: ExperienceCardProps) => {
  return (
    <div className="relative pl-20 group experience-item">
      <div 
        className={`absolute left-6 top-6 w-4 h-4 rounded-full shadow-lg group-hover:scale-150 transition-transform `}
        style={{ 
          backgroundColor: dotColor,
          boxShadow: `0 10px 25px ${dotColor}50`
        }}
      />
      <div className="glass-cosmic p-8 rounded-2xl hover:bg-white/5 transition-all duration-300 transform hover:-translate-y-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">{title}</h3>
            <p className="text-indigo-400 font-medium">{company} • {location}</p>
          </div>
          <span 
            className={`text-sm font-mono px-3 py-1 rounded-full mt-2 md:mt-0`}
            style={{ 
              color: periodColor,
              backgroundColor: `${periodColor}1A`
            }}
          >
            {period}
          </span>
        </div>
        <p className="text-gray-300 leading-relaxed mb-4">
          {description}
        </p>
        <div className="flex flex-wrap gap-2">
          {technologies.map((tech, techIndex) => {
            const colors = [
              { bg: 'bg-indigo-500/20', text: 'text-indigo-300' },
              { bg: 'bg-purple-500/20', text: 'text-purple-300' },
              { bg: 'bg-cyan-500/20', text: 'text-cyan-300' },
              { bg: 'bg-green-500/20', text: 'text-green-300' },
              { bg: 'bg-blue-500/20', text: 'text-blue-300' },
              { bg: 'bg-pink-500/20', text: 'text-pink-300' },
              { bg: 'bg-orange-500/20', text: 'text-orange-300' },
              { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
            ];
            const colorIndex = techIndex % colors.length;
            return (
              <span 
                key={techIndex} 
                className={`px-3 py-1 ${colors[colorIndex].bg} ${colors[colorIndex].text} rounded-full text-sm`}
              >
                {tech}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExperienceCard;