// components/ProjectsSection.tsx
import React from 'react';

interface ProjectCardProps {
  title: string;
  description: string;
  imageUrl: string;
  tags?: string[];
  user?: string;
  isFeatured?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  description,
  imageUrl,
  tags,
  user,
  isFeatured = false,
}) => {
  return (
    <div className={`bg-gray-800/70 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-700/50 hover:border-pink-500/30 ${isFeatured ? 'ring-1 ring-pink-500/30' : ''}`}>
      <div className="relative">
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-40 object-cover"
        />
        {isFeatured && (
          <div className="absolute top-3 right-3 bg-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            Featured
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-white text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-300 text-sm mb-3 line-clamp-2">{description}</p>
        
        {tags && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag, index) => (
              <span 
                key={index} 
                className="bg-gray-700/50 text-gray-300 text-xs px-2 py-1 rounded-full border border-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {user ? (
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-xs">By {user}</p>
            <div className="text-pink-400 text-sm hover:text-pink-300 transition-colors cursor-pointer">
              View Project →
            </div>
          </div>
        ) : (
          <div className="text-pink-400 text-sm hover:text-pink-300 transition-colors cursor-pointer text-right">
            View Project →
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectsSection: React.FC = () => {
  // Dummy data for demonstration
  const workspaceProjects = [
    {
      title: "Blog Generator v3.0",
      description: "AI-powered blog post creation with SEO optimization.",
      imageUrl: "https://via.placeholder.com/300x180/1a202c/ffffff?text=Blog+Gen",
      tags: ["AI", "Blog", "SEO"],
    },
    {
      title: "CRM Dashboard",
      description: "Customer relationship management dashboard.",
      imageUrl: "https://via.placeholder.com/300x180/2d3748/ffffff?text=CRM+Dash",
      tags: ["Dashboard", "CRM"],
    },
    {
      title: "E-commerce Storefront",
      description: "Modern e-commerce platform with Stripe integration.",
      imageUrl: "https://via.placeholder.com/300x180/4a5568/ffffff?text=E-commerce",
      tags: ["E-commerce", "Stripe"],
    },
    {
      title: "Portfolio Website",
      description: "Personal portfolio website with animations.",
      imageUrl: "https://via.placeholder.com/300x180/718096/ffffff?text=Portfolio",
      tags: ["Portfolio", "Web"],
    },
  ];

  const communityProjects = [
    {
      title: "Fitness Tracker App",
      description: "Track your workouts and progress.",
      imageUrl: "https://via.placeholder.com/300x180/556270/ffffff?text=Fitness",
      user: "Jane Doe",
      isFeatured: true,
    },
    {
      title: "Recipe Finder",
      description: "Discover new recipes based on ingredients.",
      imageUrl: "https://via.placeholder.com/300x180/4ECDC4/ffffff?text=Recipes",
      user: "John Smith",
    },
    {
      title: "Travel Planner",
      description: "Plan your next adventure with AI assistance.",
      imageUrl: "https://via.placeholder.com/300x180/C7F464/ffffff?text=Travel",
      user: "Alice Brown",
    },
    {
      title: "Language Learning Game",
      description: "Gamified approach to learning new languages.",
      imageUrl: "https://via.placeholder.com/300x180/FF6B6B/ffffff?text=Language",
      user: "Bob Johnson",
    },
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        {/* Suprabhat's Workspace */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">Suprabhat's Workspace</h2>
            <button className="text-pink-400 hover:text-pink-300 text-sm font-medium flex items-center gap-1 transition-colors">
              View All <span>→</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {workspaceProjects.map((project, index) => (
              <ProjectCard key={index} {...project} />
            ))}
          </div>
        </div>

        {/* From the Community */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">From the Community</h2>
            <button className="text-pink-400 hover:text-pink-300 text-sm font-medium flex items-center gap-1 transition-colors">
              View All <span>→</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {communityProjects.map((project, index) => (
              <ProjectCard key={index} {...project} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;