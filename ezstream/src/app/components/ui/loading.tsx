"use client"

import { motion } from "framer-motion"

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
}

const dotVariants = {
  initial: { y: 0 },
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 0.8,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut",
    },
  },
}

export default function AnimatedLoader() {
  return (
    <div className="fixed bottom-0 inset-0 flex items-center justify-center bg-black">
      <motion.div className="flex space-x-2" variants={containerVariants} initial="initial" animate="animate">
        {[0, 1, 2, 3].map((index) => (
          <motion.div key={index} className="w-4 h-4 bg-white rounded-full" variants={dotVariants} />
        ))}
      </motion.div>
    </div>
  )
}