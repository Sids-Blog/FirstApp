import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/lib/data-context";
import { Briefcase, CreditCard, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";

const DropdownManager = () => {
  const {
    expenseCategories,
    paymentMethods,
    incomeCategories,
    addExpenseCategory,
    removeExpenseCategory,
    addPaymentMethod,
    removePaymentMethod,
    addIncomeCategory,
    removeIncomeCategory
  } = useData();

  const [newCategory, setNewCategory] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [newIncomeSource, setNewIncomeSource] = useState("");

  const handleAddExpenseCategory = () => {
    addExpenseCategory(newCategory);
    setNewCategory("");
  };

  const handleAddPaymentMethod = () => {
    addPaymentMethod(newPaymentMethod);
    setNewPaymentMethod("");
  };

  const handleAddIncomeSource = () => {
    addIncomeCategory(newIncomeSource);
    setNewIncomeSource("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Categories & Options</CardTitle>
          <CardDescription>
            Add or remove categories and options for your expense and income forms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="expense-categories" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="expense-categories" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Expense Categories
              </TabsTrigger>
              <TabsTrigger value="payment-methods" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Methods
              </TabsTrigger>
              <TabsTrigger value="income-sources" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Income Sources
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expense-categories" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add new expense category..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddExpenseCategory()}
                />
                <Button onClick={handleAddExpenseCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {expenseCategories.map((category) => (
                  <Badge key={category} variant="secondary" className="flex items-center gap-2">
                    {category}
                    <button
                      onClick={() => removeExpenseCategory(category)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="payment-methods" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add new payment method..."
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPaymentMethod()}
                />
                <Button onClick={handleAddPaymentMethod}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((method) => (
                  <Badge key={method} variant="secondary" className="flex items-center gap-2">
                    {method}
                    <button
                      onClick={() => removePaymentMethod(method)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="income-sources" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add new income source..."
                  value={newIncomeSource}
                  onChange={(e) => setNewIncomeSource(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddIncomeSource()}
                />
                <Button onClick={handleAddIncomeSource}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {incomeCategories.map((source) => (
                  <Badge key={source} variant="secondary" className="flex items-center gap-2">
                    {source}
                    <button
                      onClick={() => removeIncomeCategory(source)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DropdownManager;
