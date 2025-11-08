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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Plus, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface CustomPersona {
  id: string;
  name: string;
  description?: string;
  system_instructions: string;
}

interface PersonaManagerProps {
  selectedPersona: string;
  onPersonaSelect: (persona: string) => void;
}

const defaultPersonas = [
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise Sales" },
  { value: "smb", label: "SMB/Startup" },
  { value: "support", label: "Customer Support" },
  { value: "luxury", label: "Luxury/Premium" },
];

export function PersonaManager({ selectedPersona, onPersonaSelect }: PersonaManagerProps) {
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    system_instructions: "",
  });

  useEffect(() => {
    fetchCustomPersonas();
  }, []);

  const fetchCustomPersonas = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("custom_personas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch custom personas");
      return;
    }

    setCustomPersonas(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    const { error } = await supabase.from("custom_personas").insert({
      user_id: user.id,
      ...formData,
    });

    if (error) {
      toast.error("Failed to create persona");
      return;
    }

    toast.success("Custom persona created successfully");
    setIsOpen(false);
    setFormData({ name: "", description: "", system_instructions: "" });
    fetchCustomPersonas();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            <CardTitle>Expertise Role</CardTitle>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Custom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Custom Persona</DialogTitle>
                <DialogDescription>
                  Define a custom expertise role with specific instructions for AI responses.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Role Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Real Estate Agent, Lawyer, English Tutor"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of this role"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="system_instructions">AI Instructions *</Label>
                  <Textarea
                    id="system_instructions"
                    placeholder="Describe how AI should behave in this role. E.g., 'Focus on property features, market trends, and neighborhood amenities. Use professional real estate terminology.'"
                    value={formData.system_instructions}
                    onChange={(e) => setFormData({ ...formData, system_instructions: e.target.value })}
                    rows={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Create Persona</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Choose your expertise role for AI responses</CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={selectedPersona} onValueChange={onPersonaSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select persona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default" disabled>
              Default Personas
            </SelectItem>
            {defaultPersonas.map((persona) => (
              <SelectItem key={persona.value} value={persona.value}>
                {persona.label}
              </SelectItem>
            ))}
            {customPersonas.length > 0 && (
              <>
                <SelectItem value="custom" disabled>
                  Custom Personas
                </SelectItem>
                {customPersonas.map((persona) => (
                  <SelectItem key={persona.id} value={`custom:${persona.id}`}>
                    {persona.name}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
