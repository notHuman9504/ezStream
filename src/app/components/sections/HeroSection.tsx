'use client'

import { Button } from "@/components/ui/button"
import { setLoading } from "@/redux/loading/loadingSlice";
import { motion } from "framer-motion"
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
}

const letterVariants = {
  initial: { y: 0 },
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      repeatDelay: 3, // Add a 3-second delay between each animation cycle
      ease: "easeInOut",
    },
  },
}

const HeroSection = () => {
  const letters = "Stream".split("")
  const router = useRouter();
  const dispatch = useDispatch();

  return (
    <section className="w-full h-screen flex justify-center items-center md:py-24 lg:py-32 xl:py-48 bg-black text-white">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="space-y-2">
            <motion.h1
              className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none"
              variants={containerVariants}
              initial="initial"
              animate="animate"
            >
              {letters.map((letter, index) => (
                <motion.span
                  key={index}
                  variants={letterVariants}
                  className="inline-block tracking-[0.01em]"
                >
                  {letter}
                </motion.span>
              ))}{" "}
              Directly from Your Browser
            </motion.h1>  
            <p className="mx-auto max-w-[700px] text-gray-400 md:text-xl">
              ezStream lets you broadcast to YouTube, Twitch, and more without any additional software. Start
              streaming in seconds!
            </p>
          </div>
          <div className="space-x-4">
            <Button className="bg-white text-black hover:bg-white/90" onClick={() =>{
              dispatch(setLoading('exit'))
              setTimeout(() => {
                router.push('/stream')
              }, 1500)
              
              }}>Get Started</Button>
            <Button variant="outline" className="border-white bg-black text-white hover:bg-white/10 hover:text-white">Learn More</Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
