import { useState } from "react";
import Hero from "@/components/Hero";
import QuickPasteInterface from "@/components/QuickPasteInterface";

const Index = () => {
  const [showApp, setShowApp] = useState(false);

  if (showApp) {
    return <QuickPasteInterface />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Hero onTryDemo={() => setShowApp(true)} />
    </div>
  );
};

export default Index;
