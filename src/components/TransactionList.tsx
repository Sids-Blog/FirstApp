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

const TransactionItem = ({ transaction, onDelete }: { transaction: Transaction; onDelete: (id: string) => void }) => {
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
    <div className={`p-4 border rounded-lg ${transaction.type === 'expense' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
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
          onClick={() => onDelete(transaction.id)}
          className="text-gray-400 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const TransactionList = () => {
  const { transactions, removeTransaction } = useTransactions();
  const { expenseCategories, incomeCategories } = useData();
  const { toast } = useToast();
  
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("all");
  const [incomeSearch, setIncomeSearch] = useState("");
  const [incomeSource, setIncomeSource] = useState("all");

  // Filter transactions into expenses and income
  const filteredExpenses = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        const matchesSearch = !expenseSearch || 
          t.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
          t.category.toLowerCase().includes(expenseSearch.toLowerCase());
        const matchesCategory = expenseCategory === "all" || t.category === expenseCategory;
        return matchesSearch && matchesCategory;
      });
  }, [transactions, expenseSearch, expenseCategory]);

  const filteredIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income')
      .filter(t => {
        const matchesSearch = !incomeSearch || 
          t.description.toLowerCase().includes(incomeSearch.toLowerCase()) ||
          t.category.toLowerCase().includes(incomeSearch.toLowerCase());
        const matchesSource = incomeSource === "all" || t.payment_method === incomeSource;
        return matchesSearch && matchesSource;
      });
  }, [transactions, incomeSearch, incomeSource]);

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
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
              </div>
            </div>

            {/* Expense List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
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
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                    </div>
                  </div>

            {/* Income List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
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
                  />
                ))
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default TransactionList;
