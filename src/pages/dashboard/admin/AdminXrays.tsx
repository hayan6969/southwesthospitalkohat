import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { formatPkrAmount } from "@/utils/currency";
import { ExcelImportButton } from "@/components/ExcelImportButton";

interface XrayTest {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  preparation_instructions: string;
  created_at: string;
  updated_at: string;
}

export default function AdminXrays() {
  const [open, setOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<XrayTest | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    preparation_instructions: ""
  });
  const [tests, setTests] = useState<XrayTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('xray_tests')
        .select('*')
        .order('name');

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching X-ray tests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch X-ray tests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast({
        title: "Error",
        description: "Name and price are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const testData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        preparation_instructions: formData.preparation_instructions
      };

      if (editingTest) {
        const { error } = await supabase
          .from('xray_tests')
          .update(testData)
          .eq('id', editingTest.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "X-ray test updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('xray_tests')
          .insert([testData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "X-ray test created successfully",
        });
      }

      setOpen(false);
      resetForm();
      fetchTests();
    } catch (error) {
      console.error('Error saving X-ray test:', error);
      toast({
        title: "Error",
        description: "Failed to save X-ray test",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (test: XrayTest) => {
    setEditingTest(test);
    setFormData({
      name: test.name,
      description: test.description || "",
      price: test.price.toString(),
      category: test.category || "",
      preparation_instructions: test.preparation_instructions || ""
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this X-ray test?')) return;

    try {
      const { error } = await supabase
        .from('xray_tests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "X-ray test deleted successfully",
      });
      fetchTests();
    } catch (error) {
      console.error('Error deleting X-ray test:', error);
      toast({
        title: "Error",
        description: "Failed to delete X-ray test",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      preparation_instructions: ""
    });
    setEditingTest(null);
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">X-ray Test Management</h2>
          <p className="text-muted-foreground">Manage X-ray tests and pricing</p>
        </div>
        
        <div className="flex items-center gap-2">
        <ExcelImportButton type="radiology" onImported={fetchTests} />
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add X-ray Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTest ? 'Edit X-ray Test' : 'Add New X-ray Test'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Test Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter test name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter test description"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="price">Price (PKR)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Enter price"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Enter category (e.g., Chest, Abdomen)"
                />
              </div>
              
              <div>
                <Label htmlFor="preparation">Preparation Instructions</Label>
                <Textarea
                  id="preparation"
                  value={formData.preparation_instructions}
                  onChange={(e) => setFormData({ ...formData, preparation_instructions: e.target.value })}
                  placeholder="Enter preparation instructions"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingTest ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>X-ray Tests ({tests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{test.name}</TableCell>
                  <TableCell>
                    {test.category && (
                      <Badge variant="secondary">{test.category}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatPkrAmount(test.price)}</TableCell>
                  <TableCell>
                    {test.description ? (
                      <span className="text-sm text-muted-foreground">
                        {test.description.length > 50 
                          ? `${test.description.substring(0, 50)}...`
                          : test.description
                        }
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No description</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(test)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(test.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {tests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No X-ray tests found. Add your first test to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}