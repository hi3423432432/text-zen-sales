import { useState } from "react";
import Hero from "@/components/Hero";
import QuickPasteInterface from "@/components/QuickPasteInterface";
import Header from "@/components/Header";
import { FloatingSalesAssistant, LiveScreenAssistant } from "@/components/floating-assistant";
import { Button } from "@/components/ui/button";
import { Bot, Eye } from "lucide-react";

const Index = () => {
  const [showApp, setShowApp] = useState(false);
  const [showFloatingAssistant, setShowFloatingAssistant] = useState(false);
  const [showLiveAssistant, setShowLiveAssistant] = useState(false);

  if (showApp) {
    return (
      <>
        <Header />
        <QuickPasteInterface />
        
        {/* Floating Assistant Toggle Buttons */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
          {!showLiveAssistant && (
            <Button
              onClick={() => setShowLiveAssistant(true)}
              className="h-14 w-14 rounded-full shadow-lg bg-success hover:bg-success/90"
              title="实时屏幕助手"
            >
              <Eye className="h-6 w-6" />
            </Button>
          )}
          {!showFloatingAssistant && (
            <Button
              onClick={() => setShowFloatingAssistant(true)}
              className="h-14 w-14 rounded-full shadow-lg"
              title="快速粘贴助手"
            >
              <Bot className="h-6 w-6" />
            </Button>
          )}
        </div>
        
        {showFloatingAssistant && (
          <FloatingSalesAssistant onClose={() => setShowFloatingAssistant(false)} />
        )}
        
        {showLiveAssistant && (
          <LiveScreenAssistant onClose={() => setShowLiveAssistant(false)} />
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
