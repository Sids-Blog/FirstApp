import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/data-context";
import { Transaction } from "@/lib/supabase";
import { useTransactions } from "@/lib/transaction-context";
import { Calendar, DollarSign, Euro, IndianRupee, PoundSterling, Search, Trash2, TrendingDown, TrendingUp, X, Filter, ChevronDown, ChevronUp, Edit, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const getCurrencySymbol = (currency: string) => {
  switch (currency) {
    case 'INR': return '₹';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return '$';
  }
};

  const sortTransactions = (transactions: Transaction[], field: keyof Transaction, direction: 'asc' | 'desc' | null) => {
    // If direction is null, return default sorting (by date descending)
    if (direction === null) {
      return [...transactions].sort((a, b) => {
        const aDate = new Date(a.date).getTime();
        const bDate = new Date(b.date).getTime();
        return bDate - aDate; // Descending by date
      });
    }

    return [...transactions].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];

      // Handle date sorting
      if (field === 'date') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      // Handle amount sorting
      if (field === 'amount') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      // Handle string sorting (case insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

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
  const { expenseCategories: availableExpenseCategories, incomeCategories: availableIncomeCategories, paymentMethods } = useData();
  const { toast } = useToast();
  
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [incomeSearch, setIncomeSearch] = useState("");
  const [incomeSources, setIncomeSources] = useState<string[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [expenseDate, setExpenseDate] = useState("");
  const [expensePaymentMethods, setExpensePaymentMethods] = useState<string[]>([]);
  const [incomeDate, setIncomeDate] = useState("");
  const [incomePaymentMethods, setIncomePaymentMethods] = useState<string[]>([]);
  const [showExpenseFilters, setShowExpenseFilters] = useState(false);
  const [showIncomeFilters, setShowIncomeFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("expenses");
  const [expenseSortField, setExpenseSortField] = useState<keyof Transaction>('date');
  const [expenseSortDirection, setExpenseSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const [incomeSortField, setIncomeSortField] = useState<keyof Transaction>('date');
  const [incomeSortDirection, setIncomeSortDirection] = useState<'asc' | 'desc' | null>('desc');

  // Filter transactions into expenses and income
  const filteredExpenses = useMemo(() => {
    const filtered = transactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        const matchesSearch = !expenseSearch || 
          t.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
          t.category.toLowerCase().includes(expenseSearch.toLowerCase());
        const matchesCategory = expenseCategories.length === 0 || expenseCategories.includes(t.category);
        const matchesDate = !expenseDate || t.date === expenseDate;
        const matchesPayment = expensePaymentMethods.length === 0 || (t.payment_method && expensePaymentMethods.includes(t.payment_method));
        return matchesSearch && matchesCategory && matchesDate && matchesPayment;
      });
    
    return sortTransactions(filtered, expenseSortField, expenseSortDirection);
  }, [transactions, expenseSearch, expenseCategories, expenseDate, expensePaymentMethods, expenseSortField, expenseSortDirection]);

  const filteredIncome = useMemo(() => {
    const filtered = transactions
      .filter(t => t.type === 'income')
      .filter(t => {
        const matchesSearch = !incomeSearch || 
          t.description.toLowerCase().includes(incomeSearch.toLowerCase()) ||
          t.category.toLowerCase().includes(incomeSearch.toLowerCase());
        const matchesSource = incomeSources.length === 0 || incomeSources.includes(t.category);
        const matchesDate = !incomeDate || t.date === incomeDate;
        const matchesPayment = incomePaymentMethods.length === 0 || (t.payment_method && incomePaymentMethods.includes(t.payment_method));
        return matchesSearch && matchesSource && matchesDate && matchesPayment;
      });
    
    return sortTransactions(filtered, incomeSortField, incomeSortDirection);
  }, [transactions, incomeSearch, incomeSources, incomeDate, incomePaymentMethods, incomeSortField, incomeSortDirection]);

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

  const handleSort = (field: keyof Transaction, isExpenseTab: boolean) => {
    if (isExpenseTab) {
      if (expenseSortField === field) {
        // Cycle through: asc -> desc -> null (default)
        if (expenseSortDirection === 'asc') {
          setExpenseSortDirection('desc');
        } else if (expenseSortDirection === 'desc') {
          setExpenseSortDirection(null);
        } else {
          setExpenseSortDirection('asc');
        }
      } else {
        // New field, start with ascending
        setExpenseSortField(field);
        setExpenseSortDirection('asc');
      }
    } else {
      if (incomeSortField === field) {
        // Cycle through: asc -> desc -> null (default)
        if (incomeSortDirection === 'asc') {
          setIncomeSortDirection('desc');
        } else if (incomeSortDirection === 'desc') {
          setIncomeSortDirection(null);
        } else {
          setIncomeSortDirection('asc');
        }
      } else {
        // New field, start with ascending
        setIncomeSortField(field);
        setIncomeSortDirection('asc');
      }
    }
  };

  const getSortIcon = (field: keyof Transaction, isExpenseTab: boolean) => {
    const currentField = isExpenseTab ? expenseSortField : incomeSortField;
    const currentDirection = isExpenseTab ? expenseSortDirection : incomeSortDirection;
    
    if (currentField !== field || currentDirection === null) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return currentDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

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

  function downloadPDF(expenses: Transaction[], income: Transaction[], filename: string) {
    const doc = new jsPDF();
    // Expenses Table
    doc.setFontSize(14);
    doc.text('Expenses', 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [["Date", "Amount", "Currency", "Category", "Description", "Payment Method"]],
      body: expenses.map(t => [
        t.date,
        t.amount,
        t.currency,
        t.category,
        t.description || "",
        t.payment_method || ""
      ]),
    });
    // Income Table
    let finalY = 30;
    doc.setFontSize(14);
    doc.text('Income', 14, finalY);
    autoTable(doc, {
      startY: finalY + 4,
      head: [["Date", "Amount", "Currency", "Category", "Description", "Payment Method"]],
      body: income.map(t => [
        t.date,
        t.amount,
        t.currency,
        t.category,
        t.description || "",
        t.payment_method || ""
      ]),
    });
    doc.save(filename);
  }

    return (
    <div className="space-y-6">
      {/* Download Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
        <Button variant="outline" onClick={() => downloadCSVCombined(filteredExpenses, filteredIncome, "transactions.csv")} className="text-sm">
          Download All Transactions CSV
        </Button>
        <Button variant="outline" onClick={() => downloadPDF(filteredExpenses, filteredIncome, "transactions.pdf")} className="text-sm">
          Download as PDF
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Expenses ({filteredExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Income ({filteredIncome.length})
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-red-600">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Expenses ({filteredExpenses.length})
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExpenseFilters(!showExpenseFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {showExpenseFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardTitle>
              <CardDescription>Track your spending</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Expense Filters */}
              {showExpenseFilters && (
                <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
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
                    <Label>Filter by Category</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {availableExpenseCategories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`expense-cat-${category}`}
                            checked={expenseCategories.includes(category)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setExpenseCategories([...expenseCategories, category]);
                              } else {
                                setExpenseCategories(expenseCategories.filter(c => c !== category));
                              }
                            }}
                          />
                          <Label htmlFor={`expense-cat-${category}`} className="text-sm cursor-pointer">
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {expenseCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {expenseCategories.map((category) => (
                          <div key={category} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {category}
                            <button
                              onClick={() => setExpenseCategories(expenseCategories.filter(c => c !== category))}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                    <Label>Filter by Payment Method</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {paymentMethods.map((method) => (
                        <div key={method} className="flex items-center space-x-2">
                          <Checkbox
                            id={`expense-payment-${method}`}
                            checked={expensePaymentMethods.includes(method)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setExpensePaymentMethods([...expensePaymentMethods, method]);
                              } else {
                                setExpensePaymentMethods(expensePaymentMethods.filter(m => m !== method));
                              }
                            }}
                          />
                          <Label htmlFor={`expense-payment-${method}`} className="text-sm cursor-pointer">
                            {method}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {expensePaymentMethods.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {expensePaymentMethods.map((method) => (
                          <div key={method} className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            {method}
                            <button
                              onClick={() => setExpensePaymentMethods(expensePaymentMethods.filter(m => m !== method))}
                              className="text-green-600 hover:text-green-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setExpenseSearch("");
                      setExpenseCategories([]);
                      setExpenseDate("");
                      setExpensePaymentMethods([]);
                    }}>Clear All Filters</Button>
                  </div>
                </div>
              )}

              {/* Expense Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th 
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('date', true)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="hidden sm:inline">Date</span>
                            <span className="sm:hidden">Date</span>
                            {getSortIcon('date', true)}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('amount', true)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="hidden sm:inline">Amount</span>
                            <span className="sm:hidden">Amt</span>
                            {getSortIcon('amount', true)}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('category', true)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="hidden sm:inline">Category</span>
                            <span className="sm:hidden">Cat</span>
                            {getSortIcon('category', true)}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('payment_method', true)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="hidden sm:inline">Payment</span>
                            <span className="sm:hidden">Pay</span>
                            {getSortIcon('payment_method', true)}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('description', true)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="hidden sm:inline">Comments</span>
                            <span className="sm:hidden">Notes</span>
                            {getSortIcon('description', true)}
                          </div>
                        </th>
                        {/* Settled column */}
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700">Settled</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                            <TrendingDown className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-lg font-medium">No expenses found</p>
                            <p className="text-sm">Add your first expense to get started!</p>
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEditTransaction(transaction)}>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{transaction.date}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-red-600">
                              {getCurrencySymbol(transaction.currency)}{transaction.amount.toFixed(2)}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{transaction.category}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">{transaction.payment_method || "-"}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 max-w-[120px] sm:max-w-[150px] truncate" title={transaction.description || ""}>
                              {transaction.description ? (transaction.description.length > 20 ? `${transaction.description.substring(0, 20)}...` : transaction.description) : "-"}
                            </td>
                            {/* Settled cell */}
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                              {transaction.fullySettled === false ? (
                                <span className="inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">No</span>
                              ) : (
                                <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs">Yes</span>
                              )}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleEditTransaction(transaction); }}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(transaction.id!); }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-emerald-600">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Income ({filteredIncome.length})
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIncomeFilters(!showIncomeFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {showIncomeFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardTitle>
              <CardDescription>Track your earnings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Income Filters */}
              {showIncomeFilters && (
                <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
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
                    <Label>Filter by Source</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {availableIncomeCategories.map((source) => (
                        <div key={source} className="flex items-center space-x-2">
                          <Checkbox
                            id={`income-source-${source}`}
                            checked={incomeSources.includes(source)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setIncomeSources([...incomeSources, source]);
                              } else {
                                setIncomeSources(incomeSources.filter(s => s !== source));
                              }
                            }}
                          />
                          <Label htmlFor={`income-source-${source}`} className="text-sm cursor-pointer">
                            {source}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {incomeSources.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {incomeSources.map((source) => (
                          <div key={source} className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs">
                            {source}
                            <button
                              onClick={() => setIncomeSources(incomeSources.filter(s => s !== source))}
                              className="text-emerald-600 hover:text-emerald-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                      setIncomeSources([]);
                      setIncomeDate("");
                    }}>Clear All Filters</Button>
                  </div>
                </div>
              )}

              {/* Income Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th 
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('date', false)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="hidden sm:inline">Date</span>
                            <span className="sm:hidden">Date</span>
                            {getSortIcon('date', false)}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('amount', false)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="hidden sm:inline">Amount</span>
                            <span className="sm:hidden">Amt</span>
                            {getSortIcon('amount', false)}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('category', false)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="hidden sm:inline">Source</span>
                            <span className="sm:hidden">Src</span>
                            {getSortIcon('category', false)}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('description', false)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="hidden sm:inline">Comments</span>
                            <span className="sm:hidden">Notes</span>
                            {getSortIcon('description', false)}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredIncome.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-lg font-medium">No income found</p>
                            <p className="text-sm">Add your first income to get started!</p>
                          </td>
                        </tr>
                      ) : (
                        filteredIncome.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEditTransaction(transaction)}>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{transaction.date}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-emerald-600">
                              {getCurrencySymbol(transaction.currency)}{transaction.amount.toFixed(2)}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{transaction.category}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 max-w-[120px] sm:max-w-[150px] truncate" title={transaction.description || ""}>
                              {transaction.description ? (transaction.description.length > 20 ? `${transaction.description.substring(0, 20)}...` : transaction.description) : "-"}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleEditTransaction(transaction); }}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(transaction.id!); }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Edit Transaction</DialogTitle>
            <button
              type="button"
              aria-label="Close"
              className="ml-auto text-gray-400 hover:text-gray-700 focus:outline-none"
              onClick={() => {
                setEditModalOpen(false);
                setEditingTransaction(null);
              }}
            >
              <X className="h-5 w-5" />
            </button>
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
                    {(isExpense ? availableExpenseCategories : availableIncomeCategories).map((cat) => (
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
              {/* Fully Settled Checkbox for expenses */}
              {isExpense && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="edit-fully-settled"
                    type="checkbox"
                    checked={editForm.fullySettled ?? true}
                    onChange={e => handleEditFormChange('fullySettled', e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="edit-fully-settled" className="text-sm cursor-pointer">
                    Fully settled (Uncheck if Recovery needs to be done)
                  </Label>
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
