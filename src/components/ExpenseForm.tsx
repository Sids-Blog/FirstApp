import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/lib/currency-context";
import { useData } from "@/lib/data-context";
import { useTransactions } from "@/lib/transaction-context";
import { DollarSign, Euro, IndianRupee, PoundSterling, TrendingDown } from "lucide-react";
import { useState } from "react";

const ExpenseForm = () => {
  const { currency } = useCurrency();
  const { expenseCategories, paymentMethods } = useData();
  const { addTransaction, isLoading } = useTransactions();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCurrencyIcon = () => {
    switch (currency) {
      case 'INR': return <IndianRupee className="h-4 w-4" />;
      case 'EUR': return <Euro className="h-4 w-4" />;
      case 'GBP': return <PoundSterling className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getCurrencySymbol = () => {
    switch (currency) {
      case 'INR': return '₹';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '$';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !category || !paymentMethod || !date) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await addTransaction({
        date,
        type: 'expense',
        amount: parseFloat(amount),
        category,
        description,
        currency,
        payment_method: paymentMethod,
      });

      // Reset form
      setAmount("");
      setCategory("");
      setDescription("");
      setPaymentMethod("");
      setDate(new Date().toISOString().split('T')[0]);
      
      toast({
        title: "Expense Added",
        description: `Successfully added ${getCurrencySymbol()}${parseFloat(amount).toFixed(2)} expense`,
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add expense. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = isSubmitting || isLoading;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-600" />
          Add Expense
        </CardTitle>
            <CardDescription>Record a new expense transaction</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                {getCurrencyIcon()}
                Amount ({getCurrencySymbol()})
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isFormDisabled}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isFormDisabled}
                required
              />
              </div>
            </div>

          <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isFormDisabled}>
                <SelectTrigger>
                <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          <div className="space-y-2">
            <Label htmlFor="payment">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isFormDisabled}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
              id="description"
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isFormDisabled}
                rows={3}
              />
            </div>

          <Button type="submit" className="w-full" disabled={isFormDisabled}>
            {isSubmitting ? 'Adding Expense...' : 'Add Expense'}
          </Button>
          </form>
        </CardContent>
      </Card>
  );
};

export default ExpenseForm;
