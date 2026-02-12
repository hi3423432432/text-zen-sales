import { useState, lazy, Suspense } from "react";
import Hero from "@/components/Hero";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Bot, Eye, Loader2 } from "lucide-react";

// Lazy load heavy components
const QuickPasteInterface = lazy(() => import("@/components/QuickPasteInterface"));
const FloatingSalesAssistant = lazy(() => import("@/components/floating-assistant/FloatingSalesAssistant").then(m => ({ default: m.FloatingSalesAssistant })));
const LiveScreenAssistant = lazy(() => import("@/components/floating-assistant/LiveScreenAssistant").then(m => ({ default: m.LiveScreenAssistant })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const Index = () => {
  const [showApp, setShowApp] = useState(false);
  const [showFloatingAssistant, setShowFloatingAssistant] = useState(false);
  const [showLiveAssistant, setShowLiveAssistant] = useState(false);

  if (showApp) {
    return (
      <>
        <Header />
        <Suspense fallback={<LoadingFallback />}>
          <QuickPasteInterface />
        </Suspense>
        
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
          <Suspense fallback={null}>
            <FloatingSalesAssistant onClose={() => setShowFloatingAssistant(false)} />
          </Suspense>
        )}
        
        {showLiveAssistant && (
          <Suspense fallback={null}>
            <LiveScreenAssistant onClose={() => setShowLiveAssistant(false)} />
          </Suspense>
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
