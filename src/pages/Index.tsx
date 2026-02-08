import { useState } from "react";
import Hero from "@/components/Hero";
import QuickPasteInterface from "@/components/QuickPasteInterface";
import Header from "@/components/Header";
import { FloatingSalesAssistant } from "@/components/floating-assistant";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

const Index = () => {
  const [showApp, setShowApp] = useState(false);
  const [showFloatingAssistant, setShowFloatingAssistant] = useState(false);

  if (showApp) {
    return (
      <>
        <Header />
        <QuickPasteInterface />
        
        {/* Floating Assistant Toggle */}
        {!showFloatingAssistant && (
          <Button
            onClick={() => setShowFloatingAssistant(true)}
            className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
          >
            <Bot className="h-6 w-6" />
          </Button>
        )}
        
        {showFloatingAssistant && (
          <FloatingSalesAssistant onClose={() => setShowFloatingAssistant(false)} />
        )}
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
