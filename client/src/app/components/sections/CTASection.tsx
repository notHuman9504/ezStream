import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ArrowRight } from 'lucide-react';
import myRouter from '@/lib/route';

const CTASection = () => {
  const redirect = myRouter();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="w-full py-20 bg-white">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 50 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Ready to Transform Your Streaming Experience?
          </h2>
          <p className="text-xl text-zinc-600 mb-8">
            Join thousands of content creators who trust ezStream for their multi-platform streaming needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => redirect('/signup')}
              className="px-8 py-4 rounded-lg bg-black text-white font-semibold hover:bg-black/90 transition-all duration-300"
            >
              Get Started Free
              <ArrowRight className="inline-block ml-2 w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => redirect('/stream')}
              className="px-8 py-4 rounded-lg bg-zinc-200 text-black font-semibold hover:bg-zinc-300 transition-all duration-300"
            >
              Try Demo
            </motion.button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;