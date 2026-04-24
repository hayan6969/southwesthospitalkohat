import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TestTube, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatPkrAmount } from "@/utils/currency";
import { ExcelImportButton } from "@/components/ExcelImportButton";

interface LabTest {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  normal_range: string;
  preparation_instructions: string;
  created_at: string;
  updated_at: string;
}

export default function AdminLabs() {
  const [open, setOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    normal_range: "",
    preparation_instructions: ""
  });

  const queryClient = useQueryClient();

  // Fetch lab tests
  const { data: labTests, isLoading } = useQuery({
    queryKey: ['lab-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_tests')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as LabTest[];
    }
  });

  // Create lab test mutation
  const createMutation = useMutation({
    mutationFn: async (data: Omit<LabTest, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('lab_tests')
        .insert([data])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      toast.success("Lab test created successfully");
      setOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to create lab test");
    }
  });

  // Update lab test mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<LabTest> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('lab_tests')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      toast.success("Lab test updated successfully");
      setOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to update lab test");
    }
  });

  // Delete lab test mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lab_tests')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      toast.success("Lab test deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete lab test");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      normal_range: "",
      preparation_instructions: ""
    });
    setEditingTest(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    const testData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: parseFloat(formData.price),
      category: formData.category.trim() || null,
      normal_range: formData.normal_range.trim() || null,
      preparation_instructions: formData.preparation_instructions.trim() || null
    };

    if (editingTest) {
      updateMutation.mutate({ id: editingTest.id, ...testData });
    } else {
      createMutation.mutate(testData);
    }
  };

  const handleEdit = (test: LabTest) => {
    setEditingTest(test);
    setFormData({
      name: test.name,
      description: test.description || "",
      price: test.price.toString(),
      category: test.category || "",
      normal_range: test.normal_range || "",
      preparation_instructions: test.preparation_instructions || ""
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this lab test?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Lab Tests Management</h2>
          <p className="text-gray-600">Manage available lab tests and their pricing</p>
        </div>
        
        <div className="flex items-center gap-2">
        <ExcelImportButton type="lab" onImported={() => queryClient.invalidateQueries({ queryKey: ['lab-tests'] })} />
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Lab Test
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingTest ? "Edit Lab Test" : "Add New Lab Test"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Test Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Complete Blood Count (CBC)"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (PKR) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="e.g., 1500.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Hematology"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="normal_range">Normal Range</Label>
                  <Input
                    id="normal_range"
                    value={formData.normal_range}
                    onChange={(e) => setFormData(prev => ({ ...prev, normal_range: e.target.value }))}
                    placeholder="e.g., 4.5-11.0 x10³/μL"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the test..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preparation_instructions">Preparation Instructions</Label>
                <Textarea
                  id="preparation_instructions"
                  value={formData.preparation_instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, preparation_instructions: e.target.value }))}
                  placeholder="Patient preparation instructions (e.g., fasting required)..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? "Saving..." 
                    : editingTest ? "Update Test" : "Add Test"
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Available Lab Tests ({labTests?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Normal Range</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : labTests && labTests.length > 0 ? (
                  labTests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">{test.name}</TableCell>
                      <TableCell>{test.category || "-"}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatPkrAmount(test.price)}
                      </TableCell>
                      <TableCell className="text-sm">{test.normal_range || "-"}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {test.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(test)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(test.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No lab tests available. Add your first lab test to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}