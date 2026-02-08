import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2 } from "lucide-react";

interface InstructionPanelProps {
  onGenerateReply: (instruction: string) => void;
  isGenerating: boolean;
  disabled: boolean;
}

export function InstructionPanel({ onGenerateReply, isGenerating, disabled }: InstructionPanelProps) {
  const [instruction, setInstruction] = useState("");

  const handleSubmit = () => {
    if (!instruction.trim() || isGenerating) return;
    onGenerateReply(instruction.trim());
    setInstruction("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-3 border-t border-border bg-muted/20">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">手动指令</span>
      </div>
      
      <Textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入你的策略指令，例如：&#10;• 用友好语气解释运费&#10;• 询问他的预算&#10;• 强调我们的售后服务..."
        className="text-sm min-h-[60px] mb-2 resize-none"
        disabled={disabled || isGenerating}
      />
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Ctrl+Enter 发送
        </span>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!instruction.trim() || isGenerating || disabled}
          className="bg-primary hover:bg-primary/90"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin mr-1">⏳</span>
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
      
      {disabled && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          请先导入对话记录
        </p>
      )}
    </div>
  );
}
