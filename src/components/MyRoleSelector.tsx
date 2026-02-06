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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
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
  ChevronDown,
  FileText,
  Save,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CustomPersona {
  id: string;
  name: string;
  description?: string;
  system_instructions: string;
  latest_info?: string;
}

interface MyRoleSelectorProps {
  selectedPersona: string;
  onPersonaSelect: (persona: string) => void;
  onInstructionsChange: (instructions: string | null, latestInfo?: string | null) => void;
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

export function MyRoleSelector({ selectedPersona, onPersonaSelect, onInstructionsChange }: MyRoleSelectorProps) {
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [editingLatestInfo, setEditingLatestInfo] = useState<string | null>(null);
  const [latestInfoDraft, setLatestInfoDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    system_instructions: "",
    latest_info: "",
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
        onInstructionsChange(customPersona.system_instructions, customPersona.latest_info);
      }
    } else {
      onInstructionsChange(null, null);
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
    setFormData({ name: "", description: "", system_instructions: "", latest_info: "" });
    fetchCustomPersonas();
  };

  const handleUpdateLatestInfo = async (personaId: string) => {
    setIsSaving(true);
    
    const { error } = await supabase
      .from("custom_personas")
      .update({ latest_info: latestInfoDraft, updated_at: new Date().toISOString() })
      .eq("id", personaId);

    if (error) {
      toast.error("Failed to update latest info");
      setIsSaving(false);
      return;
    }

    toast.success("Latest info updated!");
    setEditingLatestInfo(null);
    setLatestInfoDraft("");
    setIsSaving(false);
    fetchCustomPersonas();
  };

  const handleDeletePersona = async (personaId: string) => {
    const { error } = await supabase
      .from("custom_personas")
      .delete()
      .eq("id", personaId);

    if (error) {
      toast.error("Failed to delete role");
      return;
    }

    toast.success("Role deleted");
    if (selectedPersona === `custom:${personaId}`) {
      onPersonaSelect("professional");
    }
    fetchCustomPersonas();
  };

  const startEditingLatestInfo = (persona: CustomPersona) => {
    setEditingLatestInfo(persona.id);
    setLatestInfoDraft(persona.latest_info || "");
  };

  const getCurrentRole = () => {
    if (selectedPersona.startsWith('custom:')) {
      const personaId = selectedPersona.split(':')[1];
      const customPersona = customPersonas.find(p => p.id === personaId);
      return customPersona ? { 
        label: customPersona.name, 
        description: customPersona.description || "Custom role",
        icon: User,
        color: "bg-primary",
        latestInfo: customPersona.latest_info
      } : null;
    }
    return defaultRoles.find(r => r.value === selectedPersona);
  };

  const currentRole = getCurrentRole();
  const selectedCustomPersona = selectedPersona.startsWith('custom:') 
    ? customPersonas.find(p => p.id === selectedPersona.split(':')[1])
    : null;

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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                    rows={4}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="latest_info" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Latest Info / Policies (Optional)
                  </Label>
                  <Textarea
                    id="latest_info"
                    placeholder="Add current promotions, pricing updates, policy changes, or any time-sensitive information the AI should know about. Example: 'Current promotion: 10% off for first-time buyers until March 31. New policy: Free consultation for properties above $500K.'"
                    value={formData.latest_info}
                    onChange={(e) => setFormData({ ...formData, latest_info: e.target.value })}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can update this anytime with new promotions or policies
                  </p>
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
          <div className="space-y-2">
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

            {/* Latest Info for Selected Custom Persona */}
            {selectedCustomPersona && (
              <Collapsible open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      Latest Info / Policies
                      {selectedCustomPersona.latest_info && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Has updates
                        </Badge>
                      )}
                    </span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", isInfoOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  {editingLatestInfo === selectedCustomPersona.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={latestInfoDraft}
                        onChange={(e) => setLatestInfoDraft(e.target.value)}
                        placeholder="Add latest promotions, policies, or time-sensitive info..."
                        rows={4}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateLatestInfo(selectedCustomPersona.id)}
                          disabled={isSaving}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingLatestInfo(null);
                            setLatestInfoDraft("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCustomPersona.latest_info ? (
                        <div className="p-3 rounded-lg bg-muted/50 border text-sm whitespace-pre-wrap">
                          {selectedCustomPersona.latest_info}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No latest info added yet
                        </p>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startEditingLatestInfo(selectedCustomPersona)}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {selectedCustomPersona.latest_info ? "Update Info" : "Add Info"}
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
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
                  <div
                    key={persona.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                      "hover:border-primary/50 hover:bg-primary/5",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : "border-border bg-card"
                    )}
                  >
                    <button
                      onClick={() => onPersonaSelect(`custom:${persona.id}`)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
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
                        {persona.latest_info && (
                          <Badge variant="outline" className="text-[10px] mt-1">
                            <FileText className="h-2 w-2 mr-1" />
                            Has policies
                          </Badge>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePersona(persona.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}