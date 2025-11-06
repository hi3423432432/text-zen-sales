import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capture the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Installation not available",
        description: "Please use your browser's menu to install this app, or you may have already installed it.",
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      toast({
        title: "App installed!",
        description: "You can now access the app from your home screen.",
      });
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Install AI Sales Assistant</CardTitle>
          <CardDescription className="text-base">
            Add this app to your home screen for quick access and offline use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">App Already Installed!</h3>
              <p className="text-muted-foreground">
                You can access this app from your home screen.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Features:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Works offline - analyze messages even without internet
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Fast loading - instant access from your home screen
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Full-screen experience - just like a native app
                    </span>
                  </li>
                </ul>
              </div>

              {deferredPrompt && (
                <Button
                  onClick={handleInstall}
                  className="w-full"
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Install App
                </Button>
              )}

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold">Manual Installation:</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground mb-1">iPhone/iPad:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Tap the Share button (square with arrow)</li>
                      <li>Scroll and tap "Add to Home Screen"</li>
                      <li>Tap "Add" to confirm</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">Android:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Tap the menu (⋮) in your browser</li>
                      <li>Tap "Add to Home Screen" or "Install app"</li>
                      <li>Tap "Install" to confirm</li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
