import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Zap, Globe, Users, Cpu } from 'lucide-react';

const features = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Instant Streaming",
    description: "Start streaming in seconds with zero setup required. Just connect and go live."
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Multi-Platform",
    description: "Stream simultaneously to YouTube, Twitch, and other platforms with a single click."
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Collaborative Streaming",
    description: "Join rooms, collaborate with others, and create engaging multi-host streams together."
  },
  {
    icon: <Cpu className="w-6 h-6" />,
    title: "Browser-Based",
    description: "No downloads needed. Stream directly from your browser with low latency."
  }
];

const FeatureSection = () => {
  // For one-time animations
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // For repeating animations
  const [repeatRef, repeatInView] = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });

  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  // Repeating animation for subtitle
  const subtitleVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  // Repeating bounce animation for icons
  const iconVariants = {
    hidden: { y: 0 },
    visible: {
      y: [0, -10, 0],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut"
      }
    }
  };

  return (
    <section className="w-full min-h-screen flex items-center justify-center bg-white overflow-hidden snap-section">
      <motion.div
        ref={ref}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={containerVariants}
        className="container mx-auto px-4"
      >
        <div className="text-center mb-16">
          <motion.h2 
            variants={titleVariants}
            className="text-3xl md:text-4xl font-bold text-black mb-4"
          >
            Why Choose ezStream?
          </motion.h2>
          <motion.p 
            ref={repeatRef}
            initial="hidden"
            animate={repeatInView ? "visible" : "hidden"}
            variants={subtitleVariants}
            className="text-zinc-600 max-w-2xl mx-auto"
          >
            Experience the future of streaming with our cutting-edge platform
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.2 }
              }}
              className="p-6 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 shadow-lg transition-all duration-300"
            >
              <motion.div 
                ref={repeatRef}
                initial="hidden"
                animate={repeatInView ? "visible" : "hidden"}
                variants={iconVariants}
                className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4 text-white"
              >
                {feature.icon}
              </motion.div>
              <motion.h3 
                variants={itemVariants}
                className="text-xl font-semibold text-black mb-2"
              >
                {feature.title}
              </motion.h3>
              <motion.p 
                variants={itemVariants}
                className="text-zinc-600"
              >
                {feature.description}
              </motion.p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default FeatureSection;