import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
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
  User, 
  Plus, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  Home, 
  Scale, 
  HeartPulse,
  Sparkles,
  Check,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CustomPersona {
  id: string;
  name: string;
  description?: string;
  system_instructions: string;
}

interface MyRoleSelectorProps {
  selectedPersona: string;
  onPersonaSelect: (persona: string) => void;
  onInstructionsChange: (instructions: string | null) => void;
}

const defaultRoles = [
  { 
    value: "professional", 
    label: "Sales Professional", 
    icon: Briefcase,
    description: "General B2B sales approach",
    color: "bg-blue-500"
  },
  { 
    value: "enterprise", 
    label: "Enterprise Sales", 
    icon: Building2,
    description: "Focus on ROI & stakeholders",
    color: "bg-purple-500"
  },
  { 
    value: "smb", 
    label: "SMB/Startup", 
    icon: Sparkles,
    description: "Quick wins & growth focus",
    color: "bg-green-500"
  },
  { 
    value: "support", 
    label: "Customer Support", 
    icon: HeartPulse,
    description: "Empathy & problem-solving",
    color: "bg-pink-500"
  },
  { 
    value: "luxury", 
    label: "Luxury Sales", 
    icon: Scale,
    description: "Exclusivity & prestige",
    color: "bg-amber-500"
  },
];

const customRoleIcons = [
  { value: "home", icon: Home, label: "Real Estate" },
  { value: "scale", icon: Scale, label: "Legal" },
  { value: "graduation", icon: GraduationCap, label: "Education" },
  { value: "heart", icon: HeartPulse, label: "Healthcare" },
  { value: "briefcase", icon: Briefcase, label: "Business" },
];

export function MyRoleSelector({ selectedPersona, onPersonaSelect, onInstructionsChange }: MyRoleSelectorProps) {
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

  // Update instructions when persona changes
  useEffect(() => {
    if (selectedPersona.startsWith('custom:')) {
      const personaId = selectedPersona.split(':')[1];
      const customPersona = customPersonas.find(p => p.id === personaId);
      if (customPersona) {
        onInstructionsChange(customPersona.system_instructions);
      }
    } else {
      onInstructionsChange(null);
    }
  }, [selectedPersona, customPersonas, onInstructionsChange]);

  const fetchCustomPersonas = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("custom_personas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch custom roles");
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
      toast.error("Failed to create role");
      return;
    }

    toast.success("Custom role created!");
    setIsOpen(false);
    setFormData({ name: "", description: "", system_instructions: "" });
    fetchCustomPersonas();
  };

  const getCurrentRole = () => {
    if (selectedPersona.startsWith('custom:')) {
      const personaId = selectedPersona.split(':')[1];
      const customPersona = customPersonas.find(p => p.id === personaId);
      return customPersona ? { 
        label: customPersona.name, 
        description: customPersona.description || "Custom role",
        icon: User,
        color: "bg-primary"
      } : null;
    }
    return defaultRoles.find(r => r.value === selectedPersona);
  };

  const currentRole = getCurrentRole();

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">I am a...</CardTitle>
              <p className="text-xs text-muted-foreground">Select your role for AI context</p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Custom</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Custom Role</DialogTitle>
                <DialogDescription>
                  Define your professional role so AI understands your perspective.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Role Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Real Estate Agent, Financial Advisor"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Short Description</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Luxury property specialist"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="system_instructions">
                    How should AI respond as you? *
                  </Label>
                  <Textarea
                    id="system_instructions"
                    placeholder="Describe your expertise, communication style, and what makes your approach unique. Example: 'I'm a real estate agent specializing in luxury condos. I focus on lifestyle benefits, investment value, and premium amenities.'"
                    value={formData.system_instructions}
                    onChange={(e) => setFormData({ ...formData, system_instructions: e.target.value })}
                    rows={5}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Create Role</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Selection Display */}
        {currentRole && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className={cn("p-2 rounded-full text-white", currentRole.color)}>
              <currentRole.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{currentRole.label}</p>
              <p className="text-xs text-muted-foreground">{currentRole.description}</p>
            </div>
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              <Check className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        )}

        {/* Role Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {defaultRoles.map((role) => {
            const isSelected = selectedPersona === role.value;
            const Icon = role.icon;
            return (
              <button
                key={role.value}
                onClick={() => onPersonaSelect(role.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  "hover:border-primary/50 hover:bg-primary/5",
                  isSelected 
                    ? "border-primary bg-primary/10" 
                    : "border-border bg-card"
                )}
              >
                <div className={cn(
                  "p-2 rounded-full transition-colors",
                  isSelected ? role.color + " text-white" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={cn(
                  "text-xs font-medium text-center leading-tight",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}>
                  {role.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Roles */}
        {customPersonas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              My Custom Roles
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {customPersonas.map((persona) => {
                const isSelected = selectedPersona === `custom:${persona.id}`;
                return (
                  <button
                    key={persona.id}
                    onClick={() => onPersonaSelect(`custom:${persona.id}`)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                      "hover:border-primary/50 hover:bg-primary/5",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : "border-border bg-card"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-full transition-colors flex-shrink-0",
                      isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    )}>
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isSelected ? "text-primary" : "text-foreground"
                      )}>
                        {persona.name}
                      </p>
                      {persona.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {persona.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
