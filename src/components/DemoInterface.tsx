import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  sentiment: string;
  keyPoints: string[];
  suggestedReplies: {
    professional: string;
    friendly: string;
    confident: string;
  };
}

const DemoInterface = () => {
  const [clientMessage, setClientMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [copiedReply, setCopiedReply] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!clientMessage.trim()) {
      toast({
        title: "Please enter a message",
        description: "Type a client message to analyze",
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
      toast({
        title: "Analysis complete!",
        description: "Here are your suggested replies"
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

  return (
    <section className="border-t bg-secondary/30 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">
            Try It Now
          </h2>

          {/* Input Area */}
          <Card className="mb-6 p-6">
            <label className="mb-2 block text-sm font-medium text-foreground">
              Client Message
            </label>
            <Textarea
              placeholder="Paste your client's message here... (e.g., 'Hi, I'm interested in your product but the price seems a bit high. Can we discuss this?')"
              value={clientMessage}
              onChange={(e) => setClientMessage(e.target.value)}
              className="mb-4 min-h-[120px]"
            />
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground sm:w-auto"
            >
              {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze Message'}
            </Button>
          </Card>

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              {/* Sentiment & Key Points */}
              <Card className="p-6">
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

              {/* Suggested Replies */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-foreground">
                  Suggested Replies
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {Object.entries(analysis.suggestedReplies).map(([tone, reply]) => (
                    <Card key={tone} className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">
                          {tone}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(reply, tone)}
                          className="h-8 w-8 p-0"
                        >
                          {copiedReply === tone ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{reply}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DemoInterface;
