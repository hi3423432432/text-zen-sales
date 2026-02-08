import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  MessageSquare, 
  Minimize2, 
  X, 
  GripHorizontal,
  Bot
} from "lucide-react";
import { ConversationPanel } from "./ConversationPanel";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { InstructionPanel } from "./InstructionPanel";
import { useDraggable } from "./useDraggable";
import { ChatMessage, SuggestionItem, ClientAnalysis } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FloatingSalesAssistantProps {
  onClose?: () => void;
}

export function FloatingSalesAssistant({ onClose }: FloatingSalesAssistantProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [analysis, setAnalysis] = useState<ClientAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  
  const { position, isDragging, handleMouseDown, elementRef } = useDraggable({
    x: window.innerWidth - 420,
    y: 100
  });

  const formatConversationForAI = useCallback(() => {
    return messages.map(msg => 
      `${msg.role === 'client' ? '客户' : '我'}：${msg.content}`
    ).join('\n');
  }, [messages]);

  const handleAnalyze = useCallback(async () => {
    if (messages.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const conversationText = formatConversationForAI();
      
      const { data, error } = await supabase.functions.invoke('analyze-message', {
        body: {
          message: conversationText,
          language: 'chinese_simplified',
          persona: 'professional',
          customPersonaInstructions: `你是一个资深销售专家，精通心理学、谈判和客户关系管理。
分析这段WhatsApp销售对话并提供：
1. 客户分析：情绪（积极/中性/犹豫/不满）、对话阶段（开场/探需/解疑/成交/售后）、潜在需求、已提异议
2. 1-3条最佳回复建议，每条附带策略说明
建议需符合销售最佳实践：积极倾听、提供价值、引导而非强硬推销。`,
          isSalesAnalysis: true
        }
      });

      if (error) throw error;

      // Parse the response for sales-specific analysis
      const clientAnalysis: ClientAnalysis = {
        emotion: data.sentiment?.includes('positive') ? '积极' : 
                 data.sentiment?.includes('negative') ? '不满' :
                 data.sentiment?.includes('hesitant') ? '犹豫' : '中性',
        stage: detectStage(conversationText),
        potentialNeeds: data.keyPoints || [],
        objections: detectObjections(conversationText),
        status: data.conversationInsights || ''
      };

      setAnalysis(clientAnalysis);

      // Format suggestions
      const newSuggestions: SuggestionItem[] = [];
      if (data.suggestedReplies) {
        Object.entries(data.suggestedReplies).forEach(([key, value], index) => {
          if (value) {
            newSuggestions.push({
              id: `${Date.now()}-${index}`,
              content: value as string,
              strategy: key === 'professional' ? '专业建议' : 
                       key === 'friendly' ? '友好沟通' : '自信推动'
            });
          }
        });
      }

      setSuggestions(newSuggestions);

      toast({
        title: "✨ 分析完成",
        description: `识别到${clientAnalysis.objections.length}个异议，生成${newSuggestions.length}条建议`
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "分析失败",
        description: "请稍后重试",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [messages, formatConversationForAI, toast]);

  const handleGenerateReply = useCallback(async (instruction: string) => {
    if (messages.length === 0) return;
    
    setIsGenerating(true);
    try {
      const conversationText = formatConversationForAI();
      
      const { data, error } = await supabase.functions.invoke('analyze-message', {
        body: {
          message: `对话记录：\n${conversationText}\n\n用户指令：${instruction}`,
          language: 'chinese_simplified',
          persona: 'custom',
          customPersonaInstructions: `你是一个资深销售专家。根据用户的具体指令，结合完整对话历史，生成一条定制化的回复建议。
用户指令是最高优先级，必须严格遵循。
回复要自然、符合对话语境，能有效推进销售进程。`
        }
      });

      if (error) throw error;

      // Add custom suggestion at the top
      const customSuggestion: SuggestionItem = {
        id: `custom-${Date.now()}`,
        content: data.suggestedReplies?.professional || data.suggestedReplies?.friendly || '',
        strategy: `根据指令: ${instruction}`,
        isCustom: true
      };

      setSuggestions(prev => [customSuggestion, ...prev.filter(s => !s.isCustom)]);

      toast({
        title: "✨ 已生成定制回复",
        description: "新建议已显示在顶部"
      });
    } catch (error) {
      console.error('Generate error:', error);
      toast({
        title: "生成失败",
        description: "请稍后重试",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [messages, formatConversationForAI, toast]);

  // Helper functions
  function detectStage(text: string): ClientAnalysis['stage'] {
    const lowerText = text.toLowerCase();
    if (/价格|预算|多少钱|费用/.test(lowerText)) return '解疑';
    if (/下单|付款|购买|成交/.test(lowerText)) return '成交';
    if (/售后|退换|问题|维修/.test(lowerText)) return '售后';
    if (/需要|想要|寻找|了解/.test(lowerText)) return '探需';
    return '开场';
  }

  function detectObjections(text: string): string[] {
    const objections: string[] = [];
    if (/贵|价格高|预算/.test(text)) objections.push('价格异议');
    if (/考虑|再看看|不急/.test(text)) objections.push('犹豫不决');
    if (/别家|其他|竞品/.test(text)) objections.push('比较竞品');
    if (/不需要|不想|算了/.test(text)) objections.push('拒绝意向');
    return objections;
  }

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
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground animate-pulse"
        >
          <Bot className="h-6 w-6" />
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
      <Card className="w-[380px] h-[600px] shadow-2xl border-primary/20 overflow-hidden flex flex-col">
        {/* Header - Drag Handle */}
        <div 
          data-drag-handle
          className="flex items-center justify-between px-3 py-2 bg-primary text-primary-foreground cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="h-4 w-4 opacity-70" />
            <Bot className="h-4 w-4" />
            <span className="font-medium text-sm">AI 销售助手</span>
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

        {/* Area A: Conversation Panel */}
        <div className="h-[180px] border-b border-border">
          <ConversationPanel
            messages={messages}
            onMessagesUpdate={setMessages}
            onAnalyzeRequest={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        </div>

        {/* Area B: Suggestions Panel */}
        <div className="flex-1 min-h-0">
          <SuggestionsPanel
            suggestions={suggestions}
            analysis={analysis}
            isLoading={isAnalyzing}
          />
        </div>

        {/* Area C: Instruction Panel */}
        <InstructionPanel
          onGenerateReply={handleGenerateReply}
          isGenerating={isGenerating}
          disabled={messages.length === 0}
        />
      </Card>
    </div>
  );
}
