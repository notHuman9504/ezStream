import { Globe, Zap, Users } from "lucide-react"
import { LucideIcon } from "lucide-react"

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => (
  <div className="flex flex-col items-center text-center">
    <Icon className="h-12 w-12 text-black mb-4" />
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400">{description}</p>
  </div>
)

const features = [
  {
    icon: Globe,
    title: "Browser-Based",
    description: "Stream directly from your browser, no downloads required."
  },
  {
    icon: Zap,
    title: "Low Latency",
    description: "Enjoy minimal delay between you and your audience."
  },
  {
    icon: Users,
    title: "Multi-Platform",
    description: "Stream to YouTube, Twitch, and other platforms simultaneously."
  }
]

const FeatureSection = () => (
  <section id="features" className="w-full h-screen flex justify-center items-center py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
    <div className="container px-4 md:px-6">
      <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </div>
  </section>
)
    
export default FeatureSection;