import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ArrowRight } from 'lucide-react';

const steps = [
  {
    number: "01",
    title: "Sign Up",
    description: "Create your account in seconds with just your email"
  },
  {
    number: "02",
    title: "Configure Stream",
    description: "Choose your platforms and customize your stream settings"
  },
  {
    number: "03",
    title: "Go Live",
    description: "Start streaming to multiple platforms with one click"
  }
];

const HowItWorksSection = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="w-full py-20 bg-black">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 50 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4"
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start Streaming in Minutes
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Three simple steps to go live on multiple platforms
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300"
            >
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-zinc-400">
                {step.description}
              </p>
              {index < steps.length - 1 && (
                <ArrowRight className="absolute -right-4 top-1/2 transform -translate-y-1/2 text-zinc-700 hidden md:block" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default HowItWorksSection;