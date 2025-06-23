import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { useMedicines, useCreateMedicine, useUpdateMedicine, useDeleteMedicine } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pill, Plus, Edit, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPkrCurrency } from "@/utils/currency";

type Medicine = {
  id?: string;
  name: string;
  formula?: string;
  company_name?: string;
  batch_number?: string;
  manufacturing_date?: string;
  expiry_date: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock_level?: number;
  description?: string;
};

export default function PharmacyMedicines() {
  const { data: medicines, isLoading } = useMedicines();
  const createMedicine = useCreateMedicine();
  const updateMedicine = useUpdateMedicine();
  const deleteMedicine = useDeleteMedicine();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Medicine>({
    name: "",
    formula: "",
    company_name: "",
    batch_number: "",
    manufacturing_date: "",
    expiry_date: "",
    purchase_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    minimum_stock_level: 10,
    description: ""
  });

  const resetForm = () => {
    setFormData({
      name: "",
      formula: "",
      company_name: "",
      batch_number: "",
      manufacturing_date: "",
      expiry_date: "",
      purchase_price: 0,
      selling_price: 0,
      stock_quantity: 0,
      minimum_stock_level: 10,
      description: ""
    });
    setEditingMedicine(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingMedicine) {
        await updateMedicine.mutateAsync({ id: editingMedicine.id!, ...formData });
        toast({ title: "Medicine updated successfully" });
      } else {
        await createMedicine.mutateAsync(formData);
        toast({ title: "Medicine added successfully" });
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to save medicine",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (medicine: any) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name,
      formula: medicine.formula || "",
      company_name: medicine.company_name || "",
      batch_number: medicine.batch_number || "",
      manufacturing_date: medicine.manufacturing_date || "",
      expiry_date: medicine.expiry_date,
      purchase_price: medicine.purchase_price,
      selling_price: medicine.selling_price,
      stock_quantity: medicine.stock_quantity,
      minimum_stock_level: medicine.minimum_stock_level || 10,
      description: medicine.description || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this medicine?")) {
      try {
        await deleteMedicine.mutateAsync(id);
        toast({ title: "Medicine deleted successfully" });
      } catch (error) {
        toast({ 
          title: "Error", 
          description: "Failed to delete medicine",
          variant: "destructive"
        });
      }
    }
  };

  const filteredMedicines = medicines?.filter(medicine =>
    medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medicine Management</h1>
            <p className="text-gray-600 mt-1">Add, edit, and manage medicine inventory</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Medicine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMedicine ? "Edit Medicine" : "Add New Medicine"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Medicine Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="formula">Formula</Label>
                    <Input
                      id="formula"
                      value={formData.formula}
                      onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="batch_number">Batch Number</Label>
                    <Input
                      id="batch_number"
                      value={formData.batch_number}
                      onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="manufacturing_date">Manufacturing Date</Label>
                    <Input
                      id="manufacturing_date"
                      type="date"
                      value={formData.manufacturing_date}
                      onChange={(e) => setFormData({ ...formData, manufacturing_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry_date">Expiry Date *</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchase_price">Purchase Price (USD) *</Label>
                    <Input
                      id="purchase_price"
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="selling_price">Selling Price (USD) *</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="minimum_stock_level">Minimum Stock Level</Label>
                    <Input
                      id="minimum_stock_level"
                      type="number"
                      value={formData.minimum_stock_level}
                      onChange={(e) => setFormData({ ...formData, minimum_stock_level: parseInt(e.target.value) })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMedicine.isPending || updateMedicine.isPending}>
                    {editingMedicine ? "Update" : "Add"} Medicine
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Pill className="w-5 h-5" />
                Medicine Inventory
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Purchase Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredMedicines && filteredMedicines.length > 0 ? (
                  filteredMedicines.map((medicine) => (
                    <TableRow key={medicine.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{medicine.name}</div>
                          {medicine.formula && (
                            <div className="text-sm text-gray-500">{medicine.formula}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{medicine.company_name || '-'}</TableCell>
                      <TableCell>{medicine.batch_number || '-'}</TableCell>
                      <TableCell>
                        <div className={`${
                          new Date(medicine.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            ? 'text-red-600 font-medium'
                            : 'text-gray-900'
                        }`}>
                          {new Date(medicine.expiry_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{formatPkrCurrency(medicine.purchase_price)}</TableCell>
                      <TableCell>{formatPkrCurrency(medicine.selling_price)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          medicine.stock_quantity <= (medicine.minimum_stock_level || 10)
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {medicine.stock_quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(medicine)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(medicine.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                      No medicines found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
