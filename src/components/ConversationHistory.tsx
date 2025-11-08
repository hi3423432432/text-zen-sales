import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle>Conversation History</CardTitle>
        </div>
        <CardDescription>All messages with this client</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No conversation history yet
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.role === "agent"
                      ? "bg-primary/10 ml-auto max-w-[80%]"
                      : "bg-muted max-w-[80%]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {message.role === "agent" ? "You" : "Client"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {message.image_url && (
                    <img
                      src={message.image_url}
                      alt="Message attachment"
                      className="rounded mb-2 max-w-full"
                    />
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
