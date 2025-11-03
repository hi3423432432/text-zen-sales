import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, CheckCircle2, Zap, History, Command } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AnalysisResult {
  sentiment: string;
  keyPoints: string[];
  suggestedReplies: {
    professional: string;
    friendly: string;
    confident: string;
  };
}

interface HistoryItem {
  id: string;
  message: string;
  analysis: AnalysisResult;
  timestamp: Date;
}

const QuickPasteInterface = () => {
  const [clientMessage, setClientMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [copiedReply, setCopiedReply] = useState<string | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to analyze
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAnalyze();
      }
      // Ctrl/Cmd + Shift + V to focus textarea
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'v') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [clientMessage]);

  const handleAnalyze = async () => {
    if (!clientMessage.trim()) {
      toast({
        title: "Please enter a message",
        description: "Paste a client message to analyze",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-message', {
        body: { message: clientMessage }
      });

      if (error) throw error;

      setAnalysis(data);
      
      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        message: clientMessage,
        analysis: data,
        timestamp: new Date()
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 10)); // Keep last 10

      toast({
        title: "✨ Analysis complete!",
        description: "Choose your preferred reply"
      });
    } catch (error) {
      console.error('Error analyzing message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to analyze message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (autoAnalyze) {
      // Small delay to let the paste complete
      setTimeout(() => {
        handleAnalyze();
      }, 100);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReply(type);
    toast({
      title: "Copied!",
      description: "Reply copied to clipboard"
    });
    setTimeout(() => setCopiedReply(null), 2000);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'bg-success text-success-foreground';
      case 'negative': return 'bg-destructive text-destructive-foreground';
      case 'urgent': return 'bg-orange-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setClientMessage(item.message);
    setAnalysis(item.analysis);
    setShowHistory(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header with controls */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quick Paste Analysis</h1>
          <p className="text-sm text-muted-foreground">
            <Command className="mr-1 inline h-3 w-3" />
            Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">Ctrl+Enter</kbd> to analyze
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-analyze"
              checked={autoAnalyze}
              onCheckedChange={setAutoAnalyze}
            />
            <Label htmlFor="auto-analyze" className="text-sm">
              <Zap className="mr-1 inline h-4 w-4 text-primary" />
              Auto-analyze on paste
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="mr-2 h-4 w-4" />
            History ({history.length})
          </Button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <Card className="mb-6 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Recent Analyses</h3>
          <div className="space-y-2">
            {history.map(item => (
              <button
                key={item.id}
                onClick={() => loadFromHistory(item)}
                className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 flex-1 text-sm text-card-foreground">
                    {item.message}
                  </p>
                  <Badge className={getSentimentColor(item.analysis.sentiment)}>
                    {item.analysis.sentiment}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </p>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Input */}
        <div className="space-y-4">
          <Card className="p-4">
            <Label className="mb-2 block text-sm font-medium text-foreground">
              Client Message from WhatsApp
            </Label>
            <Textarea
              ref={textareaRef}
              placeholder="Paste message here... (it will auto-focus when you press Ctrl+Shift+V)"
              value={clientMessage}
              onChange={(e) => setClientMessage(e.target.value)}
              onPaste={handlePaste}
              className="mb-3 min-h-[200px] focus-visible:ring-primary"
            />
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze Message'}
            </Button>
          </Card>

          {/* Sentiment & Key Points */}
          {analysis && (
            <Card className="animate-in fade-in slide-in-from-left-4 p-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Sentiment:</span>
                <Badge className={getSentimentColor(analysis.sentiment)}>
                  {analysis.sentiment.toUpperCase()}
                </Badge>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Key Points:</h3>
                <ul className="space-y-2">
                  {analysis.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Suggested Replies */}
        <div>
          {analysis ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-semibold text-foreground">
                Suggested Replies
              </h3>
              {Object.entries(analysis.suggestedReplies).map(([tone, reply]) => (
                <Card key={tone} className="p-4 transition-all hover:shadow-md">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="outline" className="capitalize text-sm font-medium">
                      {tone}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(reply, tone)}
                      className="bg-primary hover:bg-primary-hover text-primary-foreground"
                    >
                      {copiedReply === tone ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{reply}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 p-8">
              <div className="text-center">
                <Zap className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Paste a client message to see suggested replies
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickPasteInterface;
