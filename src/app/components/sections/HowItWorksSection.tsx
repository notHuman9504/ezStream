  interface StepCardProps {
    number: number;
    title: string;
    description: string;
  }

  const StepCard = ({ number, title, description }: StepCardProps) => (
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center text-xl font-bold mb-4">
        {number}
      </div>
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  )

  const steps = [
    {
      number: 1,
      title: "Sign Up",
      description: "Create your ezStream account in seconds."
    },
    {
      number: 2,
      title: "Connect Platforms",
      description: "Link your YouTube, Twitch, or other streaming accounts."
    },
    {
      number: 3,
      title: "Start Streaming",
      description: "Click 'Go Live' and start broadcasting to your audience."
    }
  ]

  const HowItWorksSection = () => (
    <section id="how-it-works" className="w-full h-screen flex justify-center items-center py-12 md:py-24 lg:py-32 bg-black">
      <div className="container px-4 md:px-6">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12 text-white">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <StepCard key={step.number} {...step} />
          ))}
        </div>
      </div>
    </section>
  )

  export default HowItWorksSection;