import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { Plus, Receipt, TrendingDown, Calendar as CalendarIcon, Edit, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { AllExpensesDialog } from "@/components/dialogs/AllExpensesDialog";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  created_at: string;
  created_by: string;
  proof_url?: string;
}

export default function FinanceExpenses() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logCreate, logDelete } = useAuditLogger();

  // Fetch expenses from database
  const { data: allExpenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    }
  });

  // Filter expenses by date if selected
  const expenses = filterDate
    ? allExpenses?.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        return expenseDate.toDateString() === filterDate.toDateString();
      })
    : allExpenses;

  const uploadProofFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `expense-${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('finance-proofs')
      .upload(fileName, file);
    if (error) {
      console.error('Proof upload error:', error);
      return null;
    }
    const { data: urlData } = supabase.storage.from('finance-proofs').getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const addExpenseMutation = useMutation({
    mutationFn: async (expenseData: {
      category: string;
      description: string;
      amount: number;
      expense_date: string;
    }) => {
      let proofUrl: string | null = null;
      if (proofFile) {
        setUploadingProof(true);
        proofUrl = await uploadProofFile(proofFile);
        setUploadingProof(false);
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          ...expenseData,
          created_by: user?.id,
          proof_url: proofUrl
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsAddDialogOpen(false);
      setFormData({ category: "", description: "", amount: "" });
      setSelectedDate(new Date());
      setProofFile(null);
      
      logCreate(
        'Expense', 
        `Created expense: ${data.category} - ${data.description} (${formatPkrAmount(data.amount)})`,
        user?.id
      );
      
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
    },
    onError: (error) => {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expense: Expense) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id);
      
      if (error) throw error;
      return expense; // Return the expense data for logging
    },
    onSuccess: (deletedExpense) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      
      // Log expense deletion
      logDelete(
        'Expense', 
        `Deleted expense: ${deletedExpense.category} - ${deletedExpense.description} (${formatPkrAmount(deletedExpense.amount)})`,
        user?.id
      );
      
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }
    if (!proofFile) {
      toast({
        title: "Error",
        description: "Please attach a receipt/proof",
        variant: "destructive",
      });
      return;
    }
    
    addExpenseMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
      expense_date: format(selectedDate, 'yyyy-MM-dd')
    });
  };

  const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyExpenses = expenses?.filter(exp => {
    const expenseDate = new Date(exp.expense_date);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  }).reduce((sum, expense) => sum + expense.amount, 0) || 0;

  const expensesByCategory = allExpenses?.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>) || {};

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Expense Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPkrAmount(totalExpenses)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrAmount(monthlyExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(expensesByCategory).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Categories Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Expense Breakdown by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(expensesByCategory).map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="font-medium">{category}</span>
                <span className="text-lg">{formatPkrAmount(amount)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Recent Expenses
          </CardTitle>
          <div className="flex gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-48 justify-start text-left font-normal",
                    !filterDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, "PPP") : <span>Filter by date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <AllExpensesDialog />
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto z-[9999]">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                      <SelectItem value="Staff Salaries">Staff Salaries</SelectItem>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Administrative">Administrative</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter expense description"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (PKR)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Receipt / Proof <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      {proofFile ? proofFile.name : 'Attach Receipt'}
                    </Button>
                    {proofFile && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setProofFile(null)} className="text-destructive text-xs">Remove</Button>
                    )}
                  </div>
                  {!proofFile && <p className="text-xs text-destructive mt-1">Proof attachment is required</p>}
                </div>
                <Button type="submit" className="w-full" disabled={addExpenseMutation.isPending || uploadingProof}>
                  {uploadingProof ? "Uploading proof..." : addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses?.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <Badge variant="outline">{expense.category}</Badge>
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell className="font-medium text-red-600">
                    -{formatPkrAmount(expense.amount)}
                  </TableCell>
                  <TableCell>{format(new Date(expense.expense_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {expense.proof_url ? (
                      <a href={expense.proof_url} target="_blank" rel="noopener noreferrer">
                        <Badge variant="secondary" className="flex items-center gap-1 cursor-pointer hover:bg-primary/10">
                          <ImageIcon className="w-3 h-3" /> View
                        </Badge>
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteExpenseMutation.mutate(expense)}
                      disabled={deleteExpenseMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}