
import { useState, useEffect } from "react";
import { useCreateDepartment, useUpdateDepartment } from "@/hooks/useDatabase";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface DepartmentDialogProps {
  department?: { id: string; name: string; description: string | null } | null;
  trigger?: React.ReactNode;
  onClose?: () => void;
}

export function DepartmentDialog({ department, trigger, onClose }: DepartmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const { logCreate } = useAuditLogger();
  const { user } = useAuth();

  const isEditing = !!department;

  useEffect(() => {
    if (department && open) {
      setName(department.name);
      setDescription(department.description || "");
    }
  }, [department, open]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      if (!isEditing) {
        setName("");
        setDescription("");
      }
      onClose?.();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Department name is required");
      return;
    }

    try {
      if (isEditing) {
        await updateDepartment.mutateAsync({
          id: department.id,
          name: name.trim(),
          description: description.trim() || null
        });
        toast.success("Department updated successfully");
      } else {
        await createDepartment.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined
        });
        await logCreate("Department", `Department "${name.trim()}" was created`, user?.id);
        toast.success("Department created successfully");
      }
      
      handleOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? "Failed to update department" : "Failed to create department");
      console.error("Error:", error);
    }
  };

  const isPending = createDepartment.isPending || updateDepartment.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Department
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Department" : "Create New Department"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Department Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cardiology, Emergency"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Department description..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Department" : "Create Department")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
