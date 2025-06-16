import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

interface DataContextType {
  expenseCategories: string[];
  incomeCategories: string[];
  paymentMethods: string[];
  addExpenseCategory: (category: string) => Promise<void>;
  removeExpenseCategory: (category: string) => Promise<void>;
  addIncomeCategory: (category: string) => Promise<void>;
  removeIncomeCategory: (category: string) => Promise<void>;
  addPaymentMethod: (method: string) => Promise<void>;
  removePaymentMethod: (method: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data from Supabase on mount
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');

      if (categoriesError) throw categoriesError;

      // Load payment methods
      const { data: paymentMethodsData, error: paymentMethodsError } = await supabase
        .from('payment_methods')
        .select('*');

      if (paymentMethodsError) throw paymentMethodsError;

      // Separate expense and income categories
      const expenseCategories = categoriesData?.filter(c => c.type === 'expense').map(c => c.name) || [];
      const incomeCategories = categoriesData?.filter(c => c.type === 'income').map(c => c.name) || [];
      const paymentMethods = paymentMethodsData?.map(p => p.name) || [];

      setExpenseCategories(expenseCategories);
      setIncomeCategories(incomeCategories);
      setPaymentMethods(paymentMethods);

      console.log(`Loaded ${expenseCategories.length} expense categories, ${incomeCategories.length} income categories, ${paymentMethods.length} payment methods`);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const addExpenseCategory = async (category: string) => {
    if (!category.trim() || expenseCategories.includes(category)) return;

    try {
      const { error: supabaseError } = await supabase
        .from('categories')
        .insert([{ name: category, type: 'expense' }]);

      if (supabaseError) throw supabaseError;

      setExpenseCategories(prev => [...prev, category]);
      console.log('Expense category added to Supabase');
    } catch (error) {
      console.error('Error adding expense category:', error);
      setError(error instanceof Error ? error.message : 'Failed to add expense category');
    }
  };

  const removeExpenseCategory = async (category: string) => {
    try {
      const { error: supabaseError } = await supabase
        .from('categories')
        .delete()
        .eq('name', category)
        .eq('type', 'expense');

      if (supabaseError) throw supabaseError;

      setExpenseCategories(prev => prev.filter(c => c !== category));
      console.log('Expense category removed from Supabase');
    } catch (error) {
      console.error('Error removing expense category:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove expense category');
    }
  };

  const addIncomeCategory = async (category: string) => {
    if (!category.trim() || incomeCategories.includes(category)) return;

    try {
      const { error: supabaseError } = await supabase
        .from('categories')
        .insert([{ name: category, type: 'income' }]);

      if (supabaseError) throw supabaseError;

      setIncomeCategories(prev => [...prev, category]);
      console.log('Income category added to Supabase');
    } catch (error) {
      console.error('Error adding income category:', error);
      setError(error instanceof Error ? error.message : 'Failed to add income category');
    }
  };

  const removeIncomeCategory = async (category: string) => {
    try {
      const { error: supabaseError } = await supabase
        .from('categories')
        .delete()
        .eq('name', category)
        .eq('type', 'income');

      if (supabaseError) throw supabaseError;

      setIncomeCategories(prev => prev.filter(c => c !== category));
      console.log('Income category removed from Supabase');
    } catch (error) {
      console.error('Error removing income category:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove income category');
    }
  };

  const addPaymentMethod = async (method: string) => {
    if (!method.trim() || paymentMethods.includes(method)) return;

    try {
      const { error: supabaseError } = await supabase
        .from('payment_methods')
        .insert([{ name: method }]);

      if (supabaseError) throw supabaseError;

      setPaymentMethods(prev => [...prev, method]);
      console.log('Payment method added to Supabase');
    } catch (error) {
      console.error('Error adding payment method:', error);
      setError(error instanceof Error ? error.message : 'Failed to add payment method');
    }
  };

  const removePaymentMethod = async (method: string) => {
    try {
      const { error: supabaseError } = await supabase
        .from('payment_methods')
        .delete()
        .eq('name', method);

      if (supabaseError) throw supabaseError;

      setPaymentMethods(prev => prev.filter(m => m !== method));
      console.log('Payment method removed from Supabase');
    } catch (error) {
      console.error('Error removing payment method:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove payment method');
    }
  };

  return (
    <DataContext.Provider value={{
      expenseCategories,
      incomeCategories,
      paymentMethods,
      addExpenseCategory,
      removeExpenseCategory,
      addIncomeCategory,
      removeIncomeCategory,
      addPaymentMethod,
      removePaymentMethod,
      isLoading,
      error,
      refreshData,
    }}>
      {children}
    </DataContext.Provider>
  );
}; 