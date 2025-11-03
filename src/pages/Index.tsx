import { useState } from "react";
import Hero from "@/components/Hero";
import DemoInterface from "@/components/DemoInterface";

const Index = () => {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Hero onTryDemo={() => setShowDemo(true)} />
      {showDemo && <DemoInterface />}
    </div>
  );
};

export default Index;
