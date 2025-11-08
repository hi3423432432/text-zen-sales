import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, CheckCircle2, Zap, History, Command, Camera, X, MessageSquarePlus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientManager } from "./ClientManager";
import { PersonaManager } from "./PersonaManager";
import { ConversationHistory } from "./ConversationHistory";

interface ConversationMessage {
  role: 'client' | 'agent';
  content: string;
  timestamp: Date;
}

interface AnalysisResult {
  sentiment: string;
  keyPoints: string[];
  suggestedReplies: {
    professional: string;
    friendly: string;
    confident: string;
  };
  followUpSuggestions?: string[];
  conversationInsights?: string;
}

interface HistoryItem {
  id: string;
  message: string;
  analysis: AnalysisResult;
  timestamp: Date;
  conversation?: ConversationMessage[];
}

const QuickPasteInterface = () => {
  const [clientMessage, setClientMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [copiedReply, setCopiedReply] = useState<string | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("english");
  const [persona, setPersona] = useState<string>("professional");
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [showConversationContext, setShowConversationContext] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [customPersonaInstructions, setCustomPersonaInstructions] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch custom persona instructions when persona changes
  useEffect(() => {
    if (persona.startsWith('custom:')) {
      const personaId = persona.split(':')[1];
      fetchCustomPersonaInstructions(personaId);
    } else {
      setCustomPersonaInstructions(null);
    }
  }, [persona]);

  const fetchCustomPersonaInstructions = async (personaId: string) => {
    const { data, error } = await supabase
      .from("custom_personas")
      .select("system_instructions")
      .eq("id", personaId)
      .single();

    if (!error && data) {
      setCustomPersonaInstructions(data.system_instructions);
    }
  };

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
    if (!clientMessage.trim() && !selectedImage) {
      toast({
        title: "Please enter a message or upload an image",
        description: "Paste a client message or upload a screenshot to analyze",
        variant: "destructive"
      });
      return;
    }

    if (!selectedClientId) {
      toast({
        title: "Please select a client first",
        description: "Choose a client to save conversation history",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      // Save client message to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("conversations").insert({
          user_id: user.id,
          client_id: selectedClientId,
          role: "user",
          content: clientMessage,
          image_url: selectedImage,
        });
      }

      const effectivePersona = persona.startsWith('custom:') ? 'custom' : persona;
      const { data, error } = await supabase.functions.invoke('analyze-message', {
        body: { 
          message: clientMessage,
          image: selectedImage,
          language,
          persona: effectivePersona,
          customPersonaInstructions: customPersonaInstructions,
          conversationHistory: conversation.length > 0 ? conversation : undefined
        }
      });

      if (error) throw error;

      setAnalysis(data);
      
      // Add current message to conversation
      const newMessage: ConversationMessage = {
        role: 'client',
        content: selectedImage ? "📸 Screenshot message" : clientMessage,
        timestamp: new Date()
      };
      setConversation(prev => [...prev, newMessage]);
      
      // Save AI analysis to database
      if (user && data) {
        await supabase.from("conversation_analyses").insert({
          user_id: user.id,
          client_id: selectedClientId,
          sentiment: data.sentiment,
          key_points: data.keyPoints,
          suggested_replies: data.suggestedReplies,
          follow_up_suggestions: data.followUpSuggestions,
          insights: data.conversationInsights,
        });
      }
      
      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        message: selectedImage ? "📸 Screenshot message" : clientMessage,
        analysis: data,
        timestamp: new Date(),
        conversation: [...conversation, newMessage]
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 10)); // Keep last 10

      toast({
        title: "✨ Analysis complete!",
        description: data.followUpSuggestions ? "Reply suggestions with follow-up insights" : "Choose your preferred reply"
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

  const addToConversation = async (reply: string) => {
    const agentMessage: ConversationMessage = {
      role: 'agent',
      content: reply,
      timestamp: new Date()
    };
    setConversation(prev => [...prev, agentMessage]);
    
    // Save agent reply to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user && selectedClientId) {
      await supabase.from("conversations").insert({
        user_id: user.id,
        client_id: selectedClientId,
        role: "agent",
        content: reply,
      });
    }
    
    toast({
      title: "Added to conversation",
      description: "This reply will be used for context in the next analysis"
    });
  };

  const clearConversation = () => {
    setConversation([]);
    toast({
      title: "Conversation cleared",
      description: "Starting fresh with no context"
    });
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
      case 'opportunity': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      toast({
        title: "Image uploaded",
        description: "Ready to analyze the text in the image"
      });
    };
    reader.readAsDataURL(file);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setClientMessage(item.message);
    setAnalysis(item.analysis);
    setConversation(item.conversation || []);
    setShowHistory(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Client and Persona Managers */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <ClientManager 
          selectedClientId={selectedClientId}
          onClientSelect={setSelectedClientId}
        />
        <PersonaManager 
          selectedPersona={persona}
          onPersonaSelect={setPersona}
        />
      </div>

      {/* Conversation History */}
      <div className="mb-6">
        <ConversationHistory clientId={selectedClientId} />
      </div>

      {/* Header with controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quick Paste Analysis</h1>
            <p className="text-sm text-muted-foreground">
              <Command className="mr-1 inline h-3 w-3" />
              Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">Ctrl+Enter</kbd> to analyze
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-analyze"
                checked={autoAnalyze}
                onCheckedChange={setAutoAnalyze}
              />
              <Label htmlFor="auto-analyze" className="text-sm">
                <Zap className="mr-1 inline h-4 w-4 text-primary" />
                Auto-analyze
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

        {/* Language Settings */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="language-select" className="text-sm font-medium">Language:</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language-select" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="cantonese">粵語 (Cantonese)</SelectItem>
                <SelectItem value="chinese_traditional">繁體中文</SelectItem>
                <SelectItem value="chinese_simplified">简体中文</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {conversation.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConversationContext(!showConversationContext)}
              >
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Conversation ({conversation.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Conversation Context Panel */}
        {showConversationContext && conversation.length > 0 && (
          <Card className="p-4 bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Conversation Context
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {conversation.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`text-xs p-2 rounded ${
                    msg.role === 'client' 
                      ? 'bg-primary/10 text-foreground border-l-2 border-primary' 
                      : 'bg-success/10 text-foreground border-l-2 border-success'
                  }`}
                >
                  <div className="font-semibold mb-1">
                    {msg.role === 'client' ? '👤 Client' : '🤝 You'}
                  </div>
                  <div className="line-clamp-2">{msg.content}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
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
            
            {selectedImage && (
              <div className="relative mb-3 rounded-lg border bg-muted/30 p-2">
                <img 
                  src={selectedImage} 
                  alt="Screenshot to analyze" 
                  className="max-h-48 w-full rounded object-contain"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute right-3 top-3"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Textarea
              ref={textareaRef}
              placeholder="Paste message here or upload a screenshot... (Ctrl+Shift+V to focus)"
              value={clientMessage}
              onChange={(e) => setClientMessage(e.target.value)}
              onPaste={handlePaste}
              className="mb-3 min-h-[200px] focus-visible:ring-primary"
            />
            
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isAnalyzing}
                className="flex-1"
              >
                <Camera className="mr-2 h-4 w-4" />
                Upload Screenshot
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </Button>
            </div>
          </Card>

          {/* Sentiment & Key Points */}
          {analysis && (
            <div className="space-y-4">
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

              {analysis.conversationInsights && (
                <Card className="animate-in fade-in slide-in-from-left-4 p-4 bg-primary/5 border-primary/20">
                  <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Conversation Insights
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis.conversationInsights}
                  </p>
                </Card>
              )}

              {analysis.followUpSuggestions && analysis.followUpSuggestions.length > 0 && (
                <Card className="animate-in fade-in slide-in-from-left-4 p-4 bg-success/5 border-success/20">
                  <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquarePlus className="h-4 w-4 text-success" />
                    Follow-up Strategies
                  </h3>
                  <ul className="space-y-2">
                    {analysis.followUpSuggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addToConversation(reply)}
                        disabled={conversation.length >= 20}
                      >
                        <MessageSquarePlus className="mr-2 h-4 w-4" />
                        Add to Thread
                      </Button>
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
