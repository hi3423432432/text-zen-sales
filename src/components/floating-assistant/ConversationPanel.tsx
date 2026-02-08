import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, User, MessageCircle } from "lucide-react";
import { ChatMessage } from "./types";
import { cn } from "@/lib/utils";

interface ConversationPanelProps {
  messages: ChatMessage[];
  onMessagesUpdate: (messages: ChatMessage[]) => void;
  onAnalyzeRequest: () => void;
  isAnalyzing: boolean;
}

export function ConversationPanel({ 
  messages, 
  onMessagesUpdate, 
  onAnalyzeRequest,
  isAnalyzing 
}: ConversationPanelProps) {
  const [pasteInput, setPasteInput] = useState("");
  const [showPasteArea, setShowPasteArea] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const parseConversation = (text: string): ChatMessage[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsed: ChatMessage[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Try to detect patterns like "客户：xxx" or "我：xxx" or "[Name]: xxx"
      const patterns = [
        /^(客户|Customer|Client)[：:]\s*(.+)/i,
        /^(我|Me|I)[：:]\s*(.+)/i,
        /^\[(.*?)\][：:]\s*(.+)/,
      ];
      
      let matched = false;
      for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
          const [, sender, content] = match;
          const isClient = /客户|customer|client/i.test(sender) || 
                          (!/我|me|^i$/i.test(sender) && sender !== '我');
          parsed.push({
            id: `${Date.now()}-${Math.random()}`,
            role: isClient ? 'client' : 'me',
            content: content.trim(),
            timestamp: new Date(),
            senderName: isClient ? sender : undefined
          });
          matched = true;
          break;
        }
      }
      
      // If no pattern matched, treat as client message
      if (!matched && trimmed.length > 0) {
        parsed.push({
          id: `${Date.now()}-${Math.random()}`,
          role: 'client',
          content: trimmed,
          timestamp: new Date()
        });
      }
    }
    
    return parsed;
  };

  const handlePaste = () => {
    if (!pasteInput.trim()) return;
    
    const newMessages = parseConversation(pasteInput);
    if (newMessages.length > 0) {
      onMessagesUpdate([...messages, ...newMessages]);
      setPasteInput("");
      setShowPasteArea(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">实时对话</span>
          <span className="text-xs text-muted-foreground">({messages.length}条)</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPasteArea(!showPasteArea)}
            className="h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            更新对话
          </Button>
        </div>
      </div>

      {showPasteArea && (
        <div className="p-2 border-b border-border bg-secondary/30">
          <Textarea
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            placeholder="粘贴 WhatsApp 对话内容...&#10;格式示例：&#10;客户：这个有点超我预算了&#10;我：完全理解，预算确实很重要"
            className="text-sm min-h-[80px] mb-2"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePaste} className="flex-1">
              导入对话
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                setPasteInput("");
                setShowPasteArea(false);
              }}
            >
              取消
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 p-2">
        <div ref={scrollRef} className="space-y-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm text-center">暂无对话记录</p>
              <p className="text-xs mt-1">点击"更新对话"粘贴WhatsApp聊天内容</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2 p-2 rounded-lg text-sm",
                  msg.role === 'client' 
                    ? "bg-muted/50 mr-4" 
                    : "bg-primary/10 ml-4"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs",
                  msg.role === 'client' 
                    ? "bg-muted-foreground/20 text-muted-foreground" 
                    : "bg-primary/20 text-primary"
                )}>
                  {msg.role === 'client' ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <span>我</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-0.5">
                    {msg.role === 'client' ? (msg.senderName || '客户') : '我'}
                  </div>
                  <p className="text-foreground break-words">{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {messages.length > 0 && (
        <div className="p-2 border-t border-border">
          <Button 
            onClick={onAnalyzeRequest} 
            disabled={isAnalyzing}
            className="w-full"
            size="sm"
          >
            {isAnalyzing ? "分析中..." : "🧠 AI 分析对话"}
          </Button>
        </div>
      )}
    </div>
  );
}
