import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/data-context";
import { Transaction } from "@/lib/supabase";
import { useTransactions } from "@/lib/transaction-context";
import { Calendar, DollarSign, Euro, IndianRupee, PoundSterling, Search, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";

const TransactionItem = ({ transaction, onDelete, onEdit }: { transaction: Transaction; onDelete: (id: string) => void; onEdit: (transaction: Transaction) => void }) => {
  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'INR': return <IndianRupee className="h-4 w-4" />;
      case 'EUR': return <Euro className="h-4 w-4" />;
      case 'GBP': return <PoundSterling className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'INR': return '₹';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '$';
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${transaction.type === 'expense' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`} onClick={() => onEdit(transaction)} style={{ cursor: 'pointer' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {transaction.type === 'expense' ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            )}
            <span className={`font-medium ${transaction.type === 'expense' ? 'text-red-800' : 'text-emerald-800'}`}>
              {transaction.category}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            {getCurrencyIcon(transaction.currency)}
            <span className={`text-lg font-semibold ${transaction.type === 'expense' ? 'text-red-700' : 'text-emerald-700'}`}>
              {getCurrencySymbol(transaction.currency)}{transaction.amount.toFixed(2)}
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
            <Calendar className="h-3 w-3" />
            {transaction.date}
          </div>
          
          {transaction.description && (
            <p className="text-sm text-gray-600 mb-1">{transaction.description}</p>
          )}
          
          <p className="text-xs text-gray-500">
            {transaction.payment_method}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={e => { e.stopPropagation(); onDelete(transaction.id); }}
          className="text-gray-400 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const TransactionList = () => {
  const { transactions, removeTransaction, updateTransaction } = useTransactions();
  const { expenseCategories, incomeCategories, paymentMethods } = useData();
  const { toast } = useToast();
  
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("all");
  const [incomeSearch, setIncomeSearch] = useState("");
  const [incomeSource, setIncomeSource] = useState("all");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [expenseDate, setExpenseDate] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState("all");
  const [incomeDate, setIncomeDate] = useState("");
  const [incomePaymentMethod, setIncomePaymentMethod] = useState("all");

  // Filter transactions into expenses and income
  const filteredExpenses = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        const matchesSearch = !expenseSearch || 
          t.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
          t.category.toLowerCase().includes(expenseSearch.toLowerCase());
        const matchesCategory = expenseCategory === "all" || t.category === expenseCategory;
        const matchesDate = !expenseDate || t.date === expenseDate;
        const matchesPayment = expensePaymentMethod === "all" || t.payment_method === expensePaymentMethod;
        return matchesSearch && matchesCategory && matchesDate && matchesPayment;
      });
  }, [transactions, expenseSearch, expenseCategory, expenseDate, expensePaymentMethod]);

  const filteredIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income')
      .filter(t => {
        const matchesSearch = !incomeSearch || 
          t.description.toLowerCase().includes(incomeSearch.toLowerCase()) ||
          t.category.toLowerCase().includes(incomeSearch.toLowerCase());
        const matchesSource = incomeSource === "all" || t.category === incomeSource;
        const matchesDate = !incomeDate || t.date === incomeDate;
        const matchesPayment = incomePaymentMethod === "all" || t.payment_method === incomePaymentMethod;
        return matchesSearch && matchesSource && matchesDate && matchesPayment;
      });
  }, [transactions, incomeSearch, incomeSource, incomeDate, incomePaymentMethod]);

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        await removeTransaction(id);
        toast({
          title: "Transaction Deleted",
          description: "Transaction has been successfully removed",
        });
      } catch (error) {
        console.error('Error deleting transaction:', error);
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: "Failed to delete transaction. Please try again.",
        });
      }
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm(transaction);
    setEditModalOpen(true);
  };

  const handleEditFormChange = (field: keyof Transaction, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;
    try {
      await updateTransaction(editingTransaction.id!, editForm);
      toast({ title: "Transaction Updated", description: "Transaction has been updated successfully." });
      setEditModalOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Update Failed", description: "Failed to update transaction. Please try again." });
    }
  };

  const isExpense = editForm.type === 'expense';

  function downloadCSVCombined(expenses: Transaction[], income: Transaction[], filename: string) {
    const all = [...expenses, ...income];
    const csvRows = [
      [
        "Date",
        "Type",
        "Amount",
        "Currency",
        "Category",
        "Description",
        "Payment Method"
      ],
      ...all.map(t => [
        t.date,
        t.type,
        t.amount,
        t.currency,
        t.category,
        t.description || "",
        t.payment_method || ""
      ])
    ];
    const csvContent = csvRows.map(row => row.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Section */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingDown className="h-5 w-5" />
              Expenses ({filteredExpenses.length})
          </CardTitle>
            <CardDescription>Track your spending</CardDescription>
        </CardHeader>
          <CardContent className="space-y-4">
            {/* Expense Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search expenses..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div>
                <Label htmlFor="expense-category">Filter by Category</Label>
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expense-date">Filter by Date</Label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="expense-payment">Filter by Payment Method</Label>
                <Select value={expensePaymentMethod} onValueChange={setExpensePaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="All payment methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payment methods</SelectItem>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => {
                  setExpenseSearch("");
                  setExpenseCategory("all");
                  setExpenseDate("");
                  setExpensePaymentMethod("all");
                }}>Clear All Filters</Button>
              </div>
            </div>

            {/* Expense List */}
            <div className="space-y-3 h-96 overflow-y-auto">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingDown className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No expenses found</p>
                  <p className="text-sm">Add your first expense to get started!</p>
                </div>
              ) : (
                filteredExpenses.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onDelete={handleDeleteTransaction}
                    onEdit={handleEditTransaction}
                  />
                ))
              )}
          </div>
        </CardContent>
      </Card>

        {/* Income Section */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
              Income ({filteredIncome.length})
            </CardTitle>
            <CardDescription>Track your earnings</CardDescription>
        </CardHeader>
          <CardContent className="space-y-4">
            {/* Income Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search income..."
                  value={incomeSearch}
                  onChange={(e) => setIncomeSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div>
                <Label htmlFor="income-source">Filter by Source</Label>
                <Select value={incomeSource} onValueChange={setIncomeSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {incomeCategories.map((source) => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="income-date">Filter by Date</Label>
                <Input
                  type="date"
                  value={incomeDate}
                  onChange={e => setIncomeDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => {
                  setIncomeSearch("");
                  setIncomeSource("all");
                  setIncomeDate("");
                }}>Clear All Filters</Button>
              </div>
            </div>

            {/* Income List */}
            <div className="space-y-3 h-96 overflow-y-auto">
              {filteredIncome.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No income found</p>
                  <p className="text-sm">Add your first income to get started!</p>
                </div>
              ) : (
                filteredIncome.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onDelete={handleDeleteTransaction}
                    onEdit={handleEditTransaction}
                  />
                ))
            )}
          </div>
        </CardContent>
      </Card>
      </div>
      <div className="flex justify-end gap-4 mt-8">
        <Button variant="outline" onClick={() => downloadCSVCombined(filteredExpenses, filteredIncome, "transactions.csv")}>Download All Transactions CSV</Button>
      </div>
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSaveEdit(); }}>
              <div>
                <Label>Date</Label>
                <Input type="date" value={editForm.date || ''} onChange={e => handleEditFormChange('date', e.target.value)} />
              </div>
              <div>
                <Label>Type</Label>
                <Select disabled={true} value={editForm.type || ''} onValueChange={val => handleEditFormChange('type', val)}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input type="number" value={editForm.amount || ''} onChange={e => handleEditFormChange('amount', parseFloat(e.target.value))} />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={editForm.currency || ''} onChange={e => handleEditFormChange('currency', e.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={editForm.category || ''} onValueChange={val => handleEditFormChange('category', val)}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {(isExpense ? expenseCategories : incomeCategories).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={editForm.description || ''} onChange={e => handleEditFormChange('description', e.target.value)} />
              </div>
              {isExpense && (
                <div>
                  <Label>Payment Method</Label>
                  <Select value={editForm.payment_method || ''} onValueChange={val => handleEditFormChange('payment_method', val)}>
                    <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionList;
