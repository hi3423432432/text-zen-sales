import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { MessageSquare, Maximize2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "./ui/dialog";

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  image_url?: string;
}

interface ConversationHistoryProps {
  clientId: string | null;
}

export function ConversationHistory({ clientId }: ConversationHistoryProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  useEffect(() => {
    if (!clientId) {
      setMessages([]);
      return;
    }

    fetchConversations();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`conversations:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const fetchConversations = async () => {
    if (!clientId) return;

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  if (!clientId) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>Conversation History</CardTitle>
          </div>
          <CardDescription>Select a client to view conversation history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No client selected
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle>Conversation History</CardTitle>
        </div>
        <CardDescription>All messages with this client</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No conversation history yet
            </p>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.role === "agent"
                      ? "bg-primary/10 ml-auto max-w-[85%]"
                      : "bg-muted max-w-[85%]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold">
                      {message.role === "agent" ? "You" : "Client"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {message.image_url && (
                    <ImagePreview imageUrl={message.image_url} />
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ImagePreview({ imageUrl }: { imageUrl: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="mb-2 relative group cursor-pointer">
          <img
            src={imageUrl}
            alt="Message attachment"
            className="rounded max-w-full max-h-48 object-contain border border-border"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
            <Maximize2 className="h-8 w-8 text-white" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-2">
        <img
          src={imageUrl}
          alt="Message attachment full size"
          className="w-full h-auto object-contain max-h-[85vh]"
        />
      </DialogContent>
    </Dialog>
  );
}
