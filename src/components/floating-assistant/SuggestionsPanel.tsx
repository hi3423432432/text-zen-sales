import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, Sparkles, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { SuggestionItem, ClientAnalysis } from "./types";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SuggestionsPanelProps {
  suggestions: SuggestionItem[];
  analysis: ClientAnalysis | null;
  isLoading: boolean;
}

export function SuggestionsPanel({ suggestions, analysis, isLoading }: SuggestionsPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "✅ 已复制到剪贴板",
      description: "可以直接粘贴到 WhatsApp"
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

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
      case '开场': return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
      case '探需': return 'bg-purple-500/20 text-purple-600 border-purple-500/30';
      case '解疑': return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
      case '成交': return 'bg-success/20 text-success border-success/30';
      case '售后': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
        <p className="text-sm text-muted-foreground">AI 正在分析对话...</p>
        <p className="text-xs text-muted-foreground mt-1">正在识别客户状态和生成建议</p>
      </div>
    );
  }

  if (!analysis && suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <Sparkles className="h-10 w-10 mb-3 opacity-50" />
        <p className="text-sm text-center">AI 建议将显示在这里</p>
        <p className="text-xs mt-1 text-center">导入对话后点击"AI分析"开始</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Client Analysis Section */}
        {analysis && (
          <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">客户分析</span>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className={cn("text-xs", getEmotionColor(analysis.emotion))}>
                情绪: {analysis.emotion}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", getStageColor(analysis.stage))}>
                阶段: {analysis.stage}
              </Badge>
            </div>
            
            {analysis.status && (
              <div className="flex items-start gap-2 mt-2">
                <AlertCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{analysis.status}</p>
              </div>
            )}
            
            {analysis.objections.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">已提异议:</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.objections.map((obj, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                      {obj}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggestions Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">推荐回复</span>
          </div>
          
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={cn(
                "border rounded-lg p-3 transition-all hover:shadow-md",
                suggestion.isCustom 
                  ? "bg-primary/5 border-primary/30" 
                  : "bg-card border-border"
              )}
            >
              {suggestion.isCustom && (
                <Badge className="mb-2 bg-primary/20 text-primary text-xs">
                  ✨ 根据您的指令生成
                </Badge>
              )}
              
              <p className="text-sm text-foreground leading-relaxed mb-2">
                {suggestion.content}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground italic">
                  策略: {suggestion.strategy}
                </span>
                <Button
                  size="sm"
                  variant={copiedId === suggestion.id ? "outline" : "default"}
                  onClick={() => copyToClipboard(suggestion.content, suggestion.id)}
                  className="h-7 text-xs"
                >
                  {copiedId === suggestion.id ? (
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
      </div>
    </ScrollArea>
  );
}
