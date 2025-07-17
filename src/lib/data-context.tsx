import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getItem, setItem, addToQueue, getQueue, clearQueue } from './utils';

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
  isOffline: boolean;
  isSyncing: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  updateCategoryOrder: (type: 'expense' | 'income', orderedNames: string[]) => Promise<void>;
  updatePaymentMethodOrder: (orderedNames: string[]) => Promise<void>;
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncQueue();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load data from local cache or Supabase
  useEffect(() => {
    refreshData();
    // eslint-disable-next-line
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: load from local cache
        const localCategories = await getItem<any[]>("categories");
        const localPaymentMethods = await getItem<any[]>("payment_methods");
        setExpenseCategories(localCategories?.filter(c => c.type === 'expense').map(c => c.name) || []);
        setIncomeCategories(localCategories?.filter(c => c.type === 'income').map(c => c.name) || []);
        setPaymentMethods(localPaymentMethods?.map(p => p.name) || []);
        setIsOffline(true);
      } else {
        // Online: load from Supabase
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('order', { ascending: true });
        if (categoriesError) throw categoriesError;
        const { data: paymentMethodsData, error: paymentMethodsError } = await supabase
          .from('payment_methods')
          .select('*')
          .order('order', { ascending: true });
        if (paymentMethodsError) throw paymentMethodsError;
        setExpenseCategories(categoriesData?.filter(c => c.type === 'expense').map(c => c.name) || []);
        setIncomeCategories(categoriesData?.filter(c => c.type === 'income').map(c => c.name) || []);
        setPaymentMethods(paymentMethodsData?.map(p => p.name) || []);
        await setItem("categories", categoriesData || []);
        await setItem("payment_methods", paymentMethodsData || []);
        setIsOffline(false);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load data');
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync queued changes when back online
  const syncQueue = async () => {
    setIsSyncing(true);
    try {
      let localCategories = (await getItem<any[]>("categories")) || [];
      let localPaymentMethods = (await getItem<any[]>("payment_methods")) || [];
      const queue = await getQueue();
      for (const action of queue) {
        if (action.entity === 'category') {
          if (action.type === 'add') {
            const { id, ...insertData } = action.data;
            const { data, error } = await supabase.from('categories').insert([insertData]).select().single();
            if (!error && data) {
              localCategories = localCategories.filter(c => c.id !== id);
              localCategories.push(data);
              await setItem("categories", localCategories);
            }
          } else if (action.type === 'delete') {
            await supabase.from('categories').delete().eq('id', action.id);
            localCategories = localCategories.filter(c => c.id !== action.id);
            await setItem("categories", localCategories);
          }
        } else if (action.entity === 'payment_method') {
          if (action.type === 'add') {
            const { id, ...insertData } = action.data;
            const { data, error } = await supabase.from('payment_methods').insert([insertData]).select().single();
            if (!error && data) {
              localPaymentMethods = localPaymentMethods.filter(p => p.id !== id);
              localPaymentMethods.push(data);
              await setItem("payment_methods", localPaymentMethods);
            }
          } else if (action.type === 'delete') {
            await supabase.from('payment_methods').delete().eq('id', action.id);
            localPaymentMethods = localPaymentMethods.filter(p => p.id !== action.id);
            await setItem("payment_methods", localPaymentMethods);
          }
        }
      }
      await clearQueue();
      await refreshData();
    } catch (e) {
      // If sync fails, keep queue
    } finally {
      setIsSyncing(false);
    }
  };

  // Update order in DB for categories
  const updateCategoryOrder = async (type: 'expense' | 'income', orderedNames: string[]) => {
    setIsLoading(true);
    try {
      for (let i = 0; i < orderedNames.length; i++) {
        await supabase
          .from('categories')
          .update({ order: i })
          .eq('name', orderedNames[i])
          .eq('type', type);
      }
      await refreshData();
    } finally {
      setIsLoading(false);
    }
  };

  // Update order in DB for payment methods
  const updatePaymentMethodOrder = async (orderedNames: string[]) => {
    setIsLoading(true);
    try {
      for (let i = 0; i < orderedNames.length; i++) {
        await supabase
          .from('payment_methods')
          .update({ order: i })
          .eq('name', orderedNames[i]);
      }
      await refreshData();
    } finally {
      setIsLoading(false);
    }
  };

  // --- Category CRUD ---
  const addExpenseCategory = async (category: string) => {
    if (!category.trim() || expenseCategories.includes(category)) return;
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: add to local cache and queue
        const localCategories = (await getItem<any[]>("categories")) || [];
        const tempId = `offline-cat-${Date.now()}`;
        const newCat = { id: tempId, name: category, type: 'expense' };
        await setItem("categories", [...localCategories, newCat]);
        await addToQueue({ entity: 'category', type: 'add', data: newCat });
        setExpenseCategories(prev => [...prev, category]);
      } else {
        // Online: add to Supabase and local cache
        const { error: supabaseError, data } = await supabase
          .from('categories')
          .insert([{ name: category, type: 'expense' }])
          .select()
          .single();
        if (supabaseError) throw supabaseError;
        const localCategories = (await getItem<any[]>("categories")) || [];
        await setItem("categories", [...localCategories, data]);
        setExpenseCategories(prev => [...prev, category]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add expense category');
    } finally {
      setIsLoading(false);
    }
  };

  const removeExpenseCategory = async (category: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: remove from local cache and queue
        let localCategories = (await getItem<any[]>("categories")) || [];
        const cat = localCategories.find(c => c.name === category && c.type === 'expense');
        if (cat) {
          localCategories = localCategories.filter(c => c.id !== cat.id);
          await setItem("categories", localCategories);
          await addToQueue({ entity: 'category', type: 'delete', id: cat.id });
        }
        setExpenseCategories(prev => prev.filter(c => c !== category));
      } else {
        // Online: remove from Supabase and local cache
        const { error: supabaseError } = await supabase
          .from('categories')
          .delete()
          .eq('name', category)
          .eq('type', 'expense');
        if (supabaseError) throw supabaseError;
        let localCategories = (await getItem<any[]>("categories")) || [];
        localCategories = localCategories.filter(c => !(c.name === category && c.type === 'expense'));
        await setItem("categories", localCategories);
        setExpenseCategories(prev => prev.filter(c => c !== category));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove expense category');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Income Category CRUD ---
  const addIncomeCategory = async (category: string) => {
    if (!category.trim() || incomeCategories.includes(category)) return;
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: add to local cache and queue
        const localCategories = (await getItem<any[]>("categories")) || [];
        const tempId = `offline-cat-${Date.now()}`;
        const newCat = { id: tempId, name: category, type: 'income' };
        await setItem("categories", [...localCategories, newCat]);
        await addToQueue({ entity: 'category', type: 'add', data: newCat });
        setIncomeCategories(prev => [...prev, category]);
      } else {
        // Online: add to Supabase and local cache
        const { error: supabaseError, data } = await supabase
          .from('categories')
          .insert([{ name: category, type: 'income' }])
          .select()
          .single();
        if (supabaseError) throw supabaseError;
        const localCategories = (await getItem<any[]>("categories")) || [];
        await setItem("categories", [...localCategories, data]);
        setIncomeCategories(prev => [...prev, category]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add income category');
    } finally {
      setIsLoading(false);
    }
  };

  const removeIncomeCategory = async (category: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: remove from local cache and queue
        let localCategories = (await getItem<any[]>("categories")) || [];
        const cat = localCategories.find(c => c.name === category && c.type === 'income');
        if (cat) {
          localCategories = localCategories.filter(c => c.id !== cat.id);
          await setItem("categories", localCategories);
          await addToQueue({ entity: 'category', type: 'delete', id: cat.id });
        }
        setIncomeCategories(prev => prev.filter(c => c !== category));
      } else {
        // Online: remove from Supabase and local cache
        const { error: supabaseError } = await supabase
          .from('categories')
          .delete()
          .eq('name', category)
          .eq('type', 'income');
        if (supabaseError) throw supabaseError;
        let localCategories = (await getItem<any[]>("categories")) || [];
        localCategories = localCategories.filter(c => !(c.name === category && c.type === 'income'));
        await setItem("categories", localCategories);
        setIncomeCategories(prev => prev.filter(c => c !== category));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove income category');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Payment Method CRUD ---
  const addPaymentMethod = async (method: string) => {
    if (!method.trim() || paymentMethods.includes(method)) return;
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: add to local cache and queue
        const localPaymentMethods = (await getItem<any[]>("payment_methods")) || [];
        const tempId = `offline-pay-${Date.now()}`;
        const newPay = { id: tempId, name: method };
        await setItem("payment_methods", [...localPaymentMethods, newPay]);
        await addToQueue({ entity: 'payment_method', type: 'add', data: newPay });
        setPaymentMethods(prev => [...prev, method]);
      } else {
        // Online: add to Supabase and local cache
        const { error: supabaseError, data } = await supabase
          .from('payment_methods')
          .insert([{ name: method }])
          .select()
          .single();
        if (supabaseError) throw supabaseError;
        const localPaymentMethods = (await getItem<any[]>("payment_methods")) || [];
        await setItem("payment_methods", [...localPaymentMethods, data]);
        setPaymentMethods(prev => [...prev, method]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add payment method');
    } finally {
      setIsLoading(false);
    }
  };

  const removePaymentMethod = async (method: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: remove from local cache and queue
        let localPaymentMethods = (await getItem<any[]>("payment_methods")) || [];
        const pay = localPaymentMethods.find(p => p.name === method);
        if (pay) {
          localPaymentMethods = localPaymentMethods.filter(p => p.id !== pay.id);
          await setItem("payment_methods", localPaymentMethods);
          await addToQueue({ entity: 'payment_method', type: 'delete', id: pay.id });
        }
        setPaymentMethods(prev => prev.filter(m => m !== method));
      } else {
        // Online: remove from Supabase and local cache
        const { error: supabaseError } = await supabase
          .from('payment_methods')
          .delete()
          .eq('name', method);
        if (supabaseError) throw supabaseError;
        let localPaymentMethods = (await getItem<any[]>("payment_methods")) || [];
        localPaymentMethods = localPaymentMethods.filter(p => p.name !== method);
        await setItem("payment_methods", localPaymentMethods);
        setPaymentMethods(prev => prev.filter(m => m !== method));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove payment method');
    } finally {
      setIsLoading(false);
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
      isOffline,
      isSyncing,
      error,
      refreshData,
      updateCategoryOrder,
      updatePaymentMethodOrder,
    }}>
      {children}
    </DataContext.Provider>
  );
}; 