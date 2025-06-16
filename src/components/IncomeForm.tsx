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
import { DollarSign, Euro, IndianRupee, PoundSterling, TrendingUp } from "lucide-react";
import { useState } from "react";

const IncomeForm = () => {
  const { currency } = useCurrency();
  const { incomeCategories } = useData();
  const { addTransaction, isLoading } = useTransactions();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
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
    
    if (!amount || !source || !date) {
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
        type: 'income',
        amount: parseFloat(amount),
        category: source,
        description,
        currency,
        payment_method: source, // For income, we use source as payment method
      });

      // Reset form
      setAmount("");
      setSource("");
      setDescription("");
      setDate(new Date().toISOString().split('T')[0]);
      
      toast({
        title: "Income Added",
        description: `Successfully added ${getCurrencySymbol()}${parseFloat(amount).toFixed(2)} income`,
      });
    } catch (error) {
      console.error('Error adding income:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add income. Please try again.",
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
          <TrendingUp className="h-5 w-5 text-green-600" />
          Add Income
        </CardTitle>
            <CardDescription>Record a new income transaction</CardDescription>
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
              <Label htmlFor="source">Income Source</Label>
            <Select value={source} onValueChange={setSource} disabled={isFormDisabled}>
                <SelectTrigger>
                  <SelectValue placeholder="Select income source" />
                </SelectTrigger>
                <SelectContent>
                {incomeCategories.map((src) => (
                  <SelectItem key={src} value={src}>
                    {src}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
              id="description"
              placeholder="What was this income for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isFormDisabled}
                rows={3}
              />
            </div>

          <Button type="submit" className="w-full" disabled={isFormDisabled}>
            {isSubmitting ? 'Adding Income...' : 'Add Income'}
          </Button>
          </form>
        </CardContent>
      </Card>
  );
};

export default IncomeForm;
