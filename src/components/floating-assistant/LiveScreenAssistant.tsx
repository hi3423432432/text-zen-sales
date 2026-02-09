import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  MonitorPlay, 
  MonitorOff, 
  Copy, 
  CheckCircle2, 
  Bot,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Wand2,
  Minimize2,
  X,
  GripHorizontal,
  Eye,
  Loader2,
  Camera,
  Upload
} from "lucide-react";
import { useDraggable } from "./useDraggable";
import { getScreenCapture } from "./ScreenCapture";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface LiveSuggestion {
  content: string;
  strategy: string;
}

interface LiveAnalysis {
  needsResponse: boolean;
  clientStatus: string;
  emotion: '积极' | '中性' | '犹豫' | '不满';
  stage: '开场' | '探需' | '解疑' | '成交' | '售后';
  lastClientMessage?: string;
  objections: string[];
  suggestions: LiveSuggestion[];
  insights: string;
}

interface LiveScreenAssistantProps {
  onClose?: () => void;
  customInstructions?: string | null;
  latestInfo?: string | null;
}

export function LiveScreenAssistant({ onClose, customInstructions, latestInfo }: LiveScreenAssistantProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<LiveAnalysis | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [manualInstruction, setManualInstruction] = useState("");
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const analysisQueueRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const { position, isDragging, handleMouseDown, elementRef } = useDraggable({
    x: typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 400) : 10,
    y: 80
  });

  const screenCapture = getScreenCapture();

  // Process screenshot with AI
  const processScreenshot = useCallback(async (screenshot: string, instruction?: string) => {
    if (isProcessingRef.current && !instruction) {
      // Queue the latest screenshot if we're still processing
      analysisQueueRef.current = screenshot;
      return;
    }

    isProcessingRef.current = true;
    if (instruction) {
      setIsGenerating(true);
    } else {
      setIsAnalyzing(true);
    }

    try {
      const { data, error } = await supabase.functions.invoke('live-screen-analysis', {
        body: {
          screenshot,
          customInstructions,
          latestInfo,
          manualInstruction: instruction
        }
      });

      if (error) throw error;

      setAnalysis(data);
      setAnalysisCount(prev => prev + 1);

      // If there's a new message that needs response, notify
      if (data.needsResponse && data.lastClientMessage) {
        toast({
          title: "📩 新客户消息",
          description: data.lastClientMessage.substring(0, 50) + (data.lastClientMessage.length > 50 ? '...' : '')
        });
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast({
          title: "分析频率过高",
          description: "请稍等片刻再试",
          variant: "destructive"
        });
      }
    } finally {
      isProcessingRef.current = false;
      setIsAnalyzing(false);
      setIsGenerating(false);

      // Process queued screenshot if any
      if (analysisQueueRef.current && !instruction) {
        const queuedScreenshot = analysisQueueRef.current;
        analysisQueueRef.current = null;
        // Delay to prevent rate limiting
        setTimeout(() => {
          processScreenshot(queuedScreenshot);
        }, 1000);
      }
    }
  }, [customInstructions, latestInfo, toast]);

  // Start countdown then begin streaming
  const startWithCountdown = useCallback(async () => {
    setCountdown(3);
    
    await new Promise<void>((resolve) => {
      let count = 3;
      const timer = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
        } else {
          clearInterval(timer);
          setCountdown(null);
          resolve();
        }
      }, 1000);
    });

    if (isMobile) {
      // On mobile, switch to manual screenshot upload mode
      setIsStreaming(true);
      toast({
        title: "📸 截图模式已启动",
        description: "请截图WhatsApp对话，然后点击上传按钮"
      });
    } else {
      const success = await screenCapture.start(
        (imageData) => {
          setLastScreenshot(imageData);
          processScreenshot(imageData);
        },
        4000
      );

      if (success) {
        setIsStreaming(true);
        toast({
          title: "👁️ 屏幕监控已启动",
          description: "AI 正在实时观看您的屏幕"
        });
      } else {
        toast({
          title: "无法启动屏幕共享",
          description: "请允许屏幕共享权限",
          variant: "destructive"
        });
      }
    }
  }, [isMobile, screenCapture, processScreenshot, toast]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (!isMobile) {
      screenCapture.stop();
    }
    setIsStreaming(false);
    setLastScreenshot(null);
    toast({
      title: "🛑 监控已停止",
      description: "AI 助手已停止"
    });
  }, [isMobile, screenCapture, toast]);

  // Handle mobile screenshot upload
  const handleScreenshotUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setLastScreenshot(imageData);
      processScreenshot(imageData);
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be uploaded again
    e.target.value = '';
  }, [processScreenshot]);

  // Handle manual instruction
  const handleGenerateReply = useCallback(async () => {
    if (!manualInstruction.trim() || !lastScreenshot) return;
    
    await processScreenshot(lastScreenshot, manualInstruction);
    setManualInstruction("");
  }, [manualInstruction, lastScreenshot, processScreenshot]);

  // Copy to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "✅ 已复制",
      description: "可以直接粘贴到 WhatsApp"
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (screenCapture.isActive()) {
        screenCapture.stop();
      }
    };
  }, []);

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case '积极': return 'bg-success/20 text-success border-success/30';
      case '犹豫': return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
      case '不满': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case '开场': return 'bg-blue-500/20 text-blue-600';
      case '探需': return 'bg-purple-500/20 text-purple-600';
      case '解疑': return 'bg-orange-500/20 text-orange-600';
      case '成交': return 'bg-success/20 text-success';
      case '售后': return 'bg-primary/20 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Minimized floating ball
  if (isMinimized) {
    return (
      <div
        ref={elementRef}
        style={{ left: position.x, top: position.y }}
        className="fixed z-50"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg text-primary-foreground",
            isStreaming 
              ? "bg-success hover:bg-success/90 animate-pulse" 
              : "bg-primary hover:bg-primary/90"
          )}
        >
          {isStreaming ? <Eye className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      style={{ 
        left: position.x, 
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
      className="fixed z-50 select-none"
    >
      <Card className="w-[360px] shadow-2xl border-primary/20 overflow-hidden flex flex-col max-h-[85vh] relative">
        {/* Header */}
        <div 
          data-drag-handle
          className={cn(
            "flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing text-primary-foreground",
            isStreaming ? "bg-success" : "bg-primary"
          )}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="h-4 w-4 opacity-70" />
            {isStreaming ? <Eye className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            <span className="font-medium text-sm">
              {isStreaming ? "实时监控中" : "AI 直播助手"}
            </span>
            {isStreaming && (
              <Badge variant="outline" className="text-xs bg-white/20 border-white/30 text-white">
                {analysisCount} 次分析
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-6 w-6 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-6xl font-bold text-primary animate-pulse">
              {countdown}
            </div>
          </div>
        )}

        {/* Screen Control */}
        <div className="p-3 border-b border-border bg-muted/30">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleScreenshotUpload}
          />
          
          {isStreaming ? (
            <div className="space-y-2">
              <Button
                onClick={stopStreaming}
                className="w-full bg-destructive hover:bg-destructive/90"
              >
                <MonitorOff className="h-4 w-4 mr-2" />
                停止监控
              </Button>
              
              {isMobile && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      分析中...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      上传WhatsApp截图
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <>
              <Button
                onClick={startWithCountdown}
                disabled={countdown !== null}
                className="w-full bg-success hover:bg-success/90"
              >
                <MonitorPlay className="h-4 w-4 mr-2" />
                {isMobile ? "开始截图模式" : "开始屏幕监控"}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center mt-2">
                {isMobile 
                  ? "启动后上传WhatsApp截图，AI 将分析并推荐回复"
                  : "点击开始，AI 将实时观看您的屏幕并推荐回复"
                }
              </p>
            </>
          )}
        </div>

        {/* Analysis Results */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-3">
            {isAnalyzing && !analysis && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">正在分析屏幕...</p>
              </div>
            )}

            {!isStreaming && !analysis && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Eye className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm text-center">启动屏幕监控后</p>
                <p className="text-xs mt-1">AI 将实时分析对话并推荐回复</p>
              </div>
            )}

            {analysis && (
              <>
                {/* Status Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isAnalyzing && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                    <Badge variant="outline" className={cn("text-xs", getEmotionColor(analysis.emotion))}>
                      {analysis.emotion}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", getStageColor(analysis.stage))}>
                      {analysis.stage}
                    </Badge>
                  </div>
                  {analysis.needsResponse && (
                    <Badge className="bg-primary/20 text-primary text-xs animate-pulse">
                      待回复
                    </Badge>
                  )}
                </div>

                {/* Client Status */}
                <div className="bg-secondary/50 rounded-lg p-2.5">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-foreground">{analysis.clientStatus}</p>
                  </div>
                </div>

                {/* Last Client Message */}
                {analysis.lastClientMessage && (
                  <div className="bg-muted/50 rounded-lg p-2.5 border-l-2 border-primary">
                    <p className="text-xs text-muted-foreground mb-1">客户消息：</p>
                    <p className="text-sm text-foreground">{analysis.lastClientMessage}</p>
                  </div>
                )}

                {/* Objections */}
                {analysis.objections.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {analysis.objections.map((obj, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                        {obj}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {analysis.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">推荐回复</span>
                    </div>
                    
                    {analysis.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-2.5 bg-card hover:shadow-md transition-all"
                      >
                        <p className="text-sm text-foreground leading-relaxed mb-2">
                          {suggestion.content}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground italic">
                            {suggestion.strategy}
                          </span>
                          <Button
                            size="sm"
                            variant={copiedId === `${index}` ? "outline" : "default"}
                            onClick={() => copyToClipboard(suggestion.content, `${index}`)}
                            className="h-6 text-xs"
                          >
                            {copiedId === `${index}` ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                已复制
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                使用
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Insights */}
                {analysis.insights && (
                  <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">{analysis.insights}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Manual Instruction */}
        {isStreaming && (
          <div className="p-3 border-t border-border bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-foreground">手动指令</span>
            </div>
            
            <Textarea
              value={manualInstruction}
              onChange={(e) => setManualInstruction(e.target.value)}
              placeholder="输入策略指令，如：强调售后服务..."
              className="text-xs min-h-[50px] mb-2 resize-none"
              disabled={isGenerating}
            />
            
            <Button
              size="sm"
              onClick={handleGenerateReply}
              disabled={!manualInstruction.trim() || isGenerating || !lastScreenshot}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3 mr-1" />
                  生成回复
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
