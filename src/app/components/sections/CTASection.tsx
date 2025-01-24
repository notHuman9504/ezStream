import { ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const CTASection = () => (
  <section className="w-full py-12 md:py-24 lg:py-32 bg-white text-black h-screen flex justify-center items-center">
    <div className="container px-4 md:px-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Ready to Start Streaming?</h2>
          <p className="mx-auto max-w-[600px] text-gray-600 md:text-xl">
            Join ezStream today and start broadcasting to your audience in minutes.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-2">
          <form className="flex space-x-2">
            <Input
              className="max-w-lg flex-1 bg-gray-100 text-black border-gray-200"
              placeholder="Enter your email"
              type="email"
            />
            <Button type="submit" className="bg-black text-white hover:bg-black/90">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-gray-500">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  </section>
)

export default CTASection;