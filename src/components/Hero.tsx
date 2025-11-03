import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles, TrendingUp } from "lucide-react";

interface HeroProps {
  onTryDemo: () => void;
}

const Hero = ({ onTryDemo }: HeroProps) => {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-success/5" />
      
      <div className="container relative mx-auto px-4 py-20 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
            <Sparkles className="h-4 w-4" />
            AI-Powered Sales Assistant
          </div>

          {/* Main heading */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Never Miss the Perfect Reply to Your Clients
          </h1>

          {/* Subtitle */}
          <p className="mb-12 text-lg text-muted-foreground sm:text-xl lg:text-2xl">
            Empower your sales team with AI-driven message analysis and instant reply suggestions. 
            Boost confidence, save time, and close more deals.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button 
              size="lg" 
              onClick={onTryDemo}
              className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg transition-all hover:shadow-xl"
            >
              Try Demo
              <MessageSquare className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              Learn More
            </Button>
          </div>

          {/* Features grid */}
          <div className="mt-20 grid gap-8 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 shadow-md transition-all hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                Instant Analysis
              </h3>
              <p className="text-sm text-muted-foreground">
                AI analyzes client sentiment and key points in real-time
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-md transition-all hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <Sparkles className="h-6 w-6 text-success" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                Smart Suggestions
              </h3>
              <p className="text-sm text-muted-foreground">
                Get 3 reply options tailored to different communication styles
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-md transition-all hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                Boost Confidence
              </h3>
              <p className="text-sm text-muted-foreground">
                Perfect for those unsure about the best tone or approach
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
