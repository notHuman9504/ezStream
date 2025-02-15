"use client"

import { motion } from "framer-motion"
import { Github, Linkedin, Mail, Globe, Phone } from "lucide-react"
import Link from "next/link"

export default function About() {
  const socialLinks = [
    {
      icon: <Github className="w-5 h-5" />,
      href: "https://github.com/notHuman9504",
      label: "GitHub"
    },
    {
      icon: <Linkedin className="w-5 h-5" />,
      href: "https://www.linkedin.com/in/jaimin-khunt-a77aa8269/",
      label: "LinkedIn"
    },
    {
      icon: <Mail className="w-5 h-5" />,
      href: "mailto:khuntjaimin1@gmail.com",
      label: "Email"
    },
    {
      icon: <Globe className="w-5 h-5" />,
      href: "https://myportfolio-three-pi.vercel.app/",
      label: "Portfolio"
    }
  ]

  const skills = [
    {
      category: "Programming Languages",
      items: ["C++", "Python", "Java", "JavaScript", "TypeScript"]
    },
    {
      category: "Backend Development",
      items: ["Node.js", "Express.js", "Zod", "Next Auth", "JWT", "RESTful APIs"]
    },
    {
      category: "Frontend Development",
      items: ["Next.js", "React", "TailwindCSS", "HTML5", "CSS3", "Bootstrap", "Material-UI", "Recoil"]
    },
    {
      category: "Database Management",
      items: ["MongoDB", "MySQL"]
    }
  ]

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Jaimin Khunt</h1>
            <div className="flex justify-center gap-4 mb-6">
              {socialLinks.map((link) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                  title={link.label}
                >
                  {link.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Education Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12 bg-white/5 p-6 rounded-xl"
          >
            <h2 className="text-2xl font-bold mb-4">Education</h2>
            <div>
              <h3 className="text-xl font-semibold">Charotar University of Science and Technology</h3>
              <p className="text-zinc-400">Bachelor of Technology in Information Technology</p>
              <p className="text-zinc-400">August 2022 - May 2026</p>
              <p className="text-green-400 mt-2">CGPA: 9.16</p>
            </div>
          </motion.section>

          {/* Skills Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12 bg-white/5 p-6 rounded-xl"
          >
            <h2 className="text-2xl font-bold mb-6">Skills</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {skills.map((skillGroup) => (
                <div key={skillGroup.category}>
                  <h3 className="text-lg font-semibold mb-2">{skillGroup.category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {skillGroup.items.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-white/10 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Achievements Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 p-6 rounded-xl"
          >
            <h2 className="text-2xl font-bold mb-6">Achievements</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2 flex items-center justify-between">
                  LeetCode
                  <Link
                    href="https://leetcode.com/u/nothuman9504/"
                    target="_blank"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View Profile →
                  </Link>
                </h3>
                <ul className="list-disc list-inside text-zinc-400">
                  <li>Solved 350+ Data Structures and Algorithms problems</li>
                  <li>Achieved max rating of 1682</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 flex items-center justify-between">
                  CodeChef
                  <Link
                    href="https://www.codechef.com/users/nothuman9504"
                    target="_blank"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View Profile →
                  </Link>
                </h3>
                <ul className="list-disc list-inside text-zinc-400">
                  <li>5-star rating (2019)</li>
                  <li>Global Rank 5 in CodeChef Starters 128 Div 2</li>
                  <li>Global Rank 69 in Starters 130 Div 2</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 flex items-center justify-between">
                  Codeforces
                  <Link
                    href="https://codeforces.com/profile/notHuman9504"
                    target="_blank"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View Profile →
                  </Link>
                </h3>
                <ul className="list-disc list-inside text-zinc-400">
                  <li>Expert rating (1623)</li>
                  <li>Global Rank 699 in Round 935 Div 3</li>
                  <li>Global Rank 1217 in Round 939 Div 2</li>
                </ul>
              </div>
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  )
} 