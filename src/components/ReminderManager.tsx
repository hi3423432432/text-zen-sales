import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Plus, Bell, Check, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Reminder {
  id: string;
  client_id: string;
  title: string;
  notes?: string;
  due_date: string;
  completed: boolean;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
}

interface ReminderManagerProps {
  selectedClientId: string | null;
}

export function ReminderManager({ selectedClientId }: ReminderManagerProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    title: "",
    notes: "",
    due_date: "",
  });

  useEffect(() => {
    fetchClients();
    fetchReminders();
  }, [selectedClientId]);

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .eq("user_id", user.id);
    
    if (data) setClients(data);
  };

  const fetchReminders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    if (selectedClientId) {
      query = query.eq("client_id", selectedClientId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to fetch reminders");
      return;
    }

    setReminders(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    const { error } = await supabase.from("reminders").insert({
      user_id: user.id,
      ...formData,
    });

    if (error) {
      toast.error("Failed to create reminder");
      return;
    }

    toast.success("Reminder created successfully");
    setIsOpen(false);
    setFormData({ client_id: "", title: "", notes: "", due_date: "" });
    fetchReminders();
  };

  const toggleComplete = async (reminder: Reminder) => {
    const { error } = await supabase
      .from("reminders")
      .update({ completed: !reminder.completed })
      .eq("id", reminder.id);

    if (error) {
      toast.error("Failed to update reminder");
      return;
    }

    toast.success(reminder.completed ? "Reminder marked incomplete" : "Reminder completed!");
    fetchReminders();
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete reminder");
      return;
    }

    toast.success("Reminder deleted");
    fetchReminders();
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || "Unknown";
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && !reminders.find(r => r.due_date === dueDate)?.completed;
  };

  const upcomingReminders = reminders.filter(r => !r.completed && new Date(r.due_date) >= new Date());
  const overdueReminders = reminders.filter(r => !r.completed && new Date(r.due_date) < new Date());
  const completedReminders = reminders.filter(r => r.completed);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Follow-up Reminders</CardTitle>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Reminder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Follow-up Reminder</DialogTitle>
                <DialogDescription>
                  Set a reminder to follow up with a client at the right time.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="client">Client *</Label>
                  <select
                    id="client"
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Follow up on proposal"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional details..."
                  />
                </div>
                <Button type="submit" className="w-full">Create Reminder</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          {overdueReminders.length > 0 && (
            <span className="text-destructive font-medium">
              {overdueReminders.length} overdue
            </span>
          )}
          {upcomingReminders.length > 0 && overdueReminders.length > 0 && " • "}
          {upcomingReminders.length > 0 && (
            <span>{upcomingReminders.length} upcoming</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {overdueReminders.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-destructive mb-2">Overdue</h3>
            <div className="space-y-2">
              {overdueReminders.map(reminder => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  clientName={getClientName(reminder.client_id)}
                  onToggle={toggleComplete}
                  onDelete={deleteReminder}
                  isOverdue={true}
                />
              ))}
            </div>
          </div>
        )}

        {upcomingReminders.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Upcoming</h3>
            <div className="space-y-2">
              {upcomingReminders.map(reminder => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  clientName={getClientName(reminder.client_id)}
                  onToggle={toggleComplete}
                  onDelete={deleteReminder}
                />
              ))}
            </div>
          </div>
        )}

        {completedReminders.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Completed</h3>
            <div className="space-y-2">
              {completedReminders.map(reminder => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  clientName={getClientName(reminder.client_id)}
                  onToggle={toggleComplete}
                  onDelete={deleteReminder}
                />
              ))}
            </div>
          </div>
        )}

        {reminders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No reminders yet. Add one to stay on top of follow-ups.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReminderCard({
  reminder,
  clientName,
  onToggle,
  onDelete,
  isOverdue = false,
}: {
  reminder: Reminder;
  clientName: string;
  onToggle: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  isOverdue?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
      reminder.completed ? 'bg-muted/50 opacity-60' : isOverdue ? 'bg-destructive/10 border-destructive/50' : 'bg-card'
    }`}>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 mt-0.5"
        onClick={() => onToggle(reminder)}
      >
        {reminder.completed ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <div className="h-4 w-4 rounded border-2 border-muted-foreground" />
        )}
      </Button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${reminder.completed ? 'line-through' : ''}`}>
          {reminder.title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{clientName}</p>
        <div className="flex items-center gap-2 mt-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <p className={`text-xs ${isOverdue && !reminder.completed ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            {format(new Date(reminder.due_date), 'PPp')}
          </p>
        </div>
        {reminder.notes && (
          <p className="text-xs text-muted-foreground mt-1">{reminder.notes}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(reminder.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}