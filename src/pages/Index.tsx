import { useState } from "react";
import Hero from "@/components/Hero";
import QuickPasteInterface from "@/components/QuickPasteInterface";
import Header from "@/components/Header";

const Index = () => {
  const [showApp, setShowApp] = useState(false);

  if (showApp) {
    return (
      <>
        <Header />
        <QuickPasteInterface />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero onTryDemo={() => setShowApp(true)} />
    </div>
  );
};

export default Index;
