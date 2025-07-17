import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Transaction } from './supabase';
import { getItem, setItem, addToQueue, getQueue, clearQueue } from './utils';

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<Transaction>;
  isLoading: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  isOffline: boolean;
  error: string | null;
  refreshTransactions: () => Promise<void>;
  bulkRenameInTransactions: (field: 'category' | 'payment_method', oldValue: string, newValue: string) => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(navigator.onLine);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsConnected(true);
      setIsOffline(false);
      syncQueue();
    };
    const handleOffline = () => {
      setIsConnected(false);
      setIsOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load transactions from local cache or Supabase
  useEffect(() => {
    refreshTransactions();
    // eslint-disable-next-line
  }, []);

  const refreshTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: load from local cache
        const localTx = await getItem<Transaction[]>("transactions");
        setTransactions(localTx || []);
        setIsConnected(false);
        setIsOffline(true);
      } else {
        // Online: load from Supabase
        const { data, error: supabaseError } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });
        if (supabaseError) throw supabaseError;
        setTransactions(data || []);
        setItem("transactions", data || []);
        setIsConnected(true);
        setIsOffline(false);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load transactions');
      setIsConnected(false);
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync queued changes when back online
  const syncQueue = async () => {
    setIsSyncing(true);
    try {
      let localTx = (await getItem<Transaction[]>("transactions")) || [];
      const queue = await getQueue();
      for (const action of queue) {
        if (action.type === 'add') {
          // Remove fake id before insert
          const { id, ...insertData } = action.data;
          const { data, error } = await supabase.from('transactions').insert([insertData]).select().single();
          if (!error && data) {
            // Replace offline tx with real tx in local cache and UI
            localTx = localTx.filter(t => t.id !== id);
            localTx.unshift(data);
            setTransactions(localTx);
            await setItem("transactions", localTx);
          }
        } else if (action.type === 'update') {
          await supabase.from('transactions').update(action.data).eq('id', action.id);
        } else if (action.type === 'delete') {
          await supabase.from('transactions').delete().eq('id', action.id);
        }
      }
      await clearQueue();
      await refreshTransactions();
    } catch (e) {
      // If sync fails, keep queue
    } finally {
      setIsSyncing(false);
    }
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: add to local cache and queue
        const localTx = (await getItem<Transaction[]>("transactions")) || [];
        const tempId = `offline-${Date.now()}`;
        const newTx: Transaction = { ...transactionData, id: tempId };
        await setItem("transactions", [newTx, ...localTx]);
        await addToQueue({ type: 'add', data: newTx });
        setTransactions([newTx, ...localTx]);
      } else {
        // Online: add to Supabase and local cache
        const { data, error: supabaseError } = await supabase
          .from('transactions')
          .insert([transactionData])
          .select()
          .single();
        if (supabaseError) throw supabaseError;
        setTransactions(prev => [data, ...prev]);
        const localTx = (await getItem<Transaction[]>("transactions")) || [];
        await setItem("transactions", [data, ...localTx]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add transaction');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeTransaction = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: remove from local cache and queue
        const localTx = (await getItem<Transaction[]>("transactions")) || [];
        await setItem("transactions", localTx.filter(t => t.id !== id));
        await addToQueue({ type: 'delete', id });
        setTransactions(localTx.filter(t => t.id !== id));
      } else {
        // Online: remove from Supabase and local cache
        const { error: supabaseError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);
        if (supabaseError) throw supabaseError;
        const localTx = (await getItem<Transaction[]>("transactions")) || [];
        await setItem("transactions", localTx.filter(t => t.id !== id));
        setTransactions(prev => prev.filter(t => t.id !== id));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove transaction');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: update in local cache and queue
        const localTx = (await getItem<Transaction[]>("transactions")) || [];
        const updatedTx = localTx.map(t => t.id === id ? { ...t, ...updates } : t);
        await setItem("transactions", updatedTx);
        await addToQueue({ type: 'update', id, data: updates });
        setTransactions(updatedTx);
        return updatedTx.find(t => t.id === id)!;
      } else {
        // Online: update in Supabase and local cache
        const { data, error: supabaseError } = await supabase
          .from('transactions')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (supabaseError) throw supabaseError;
        const localTx = (await getItem<Transaction[]>("transactions")) || [];
        const updatedTx = localTx.map(t => t.id === id ? { ...t, ...updates } : t);
        await setItem("transactions", updatedTx);
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        return data;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update transaction');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk update category or payment method in all transactions
  const bulkRenameInTransactions = async (field: 'category' | 'payment_method', oldValue: string, newValue: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        // Offline: update in local cache and queue
        const localTx = (await getItem<Transaction[]>("transactions")) || [];
        const updatedTx = localTx.map(t => t[field] === oldValue ? { ...t, [field]: newValue } : t);
        await setItem("transactions", updatedTx);
        await addToQueue({ type: 'bulkRename', field, oldValue, newValue });
        setTransactions(updatedTx);
      } else {
        // Online: update in Supabase and local cache
        const { error: supabaseError } = await supabase
          .from('transactions')
          .update({ [field]: newValue })
          .eq(field, oldValue);
        if (supabaseError) throw supabaseError;
        const localTx = (await getItem<Transaction[]>("transactions")) || [];
        const updatedTx = localTx.map(t => t[field] === oldValue ? { ...t, [field]: newValue } : t);
        await setItem("transactions", updatedTx);
        setTransactions(updatedTx);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to bulk rename');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sync bulkRename actions in queue
  useEffect(() => {
    if (isConnected && !isOffline) {
      syncQueue();
    }
    // eslint-disable-next-line
  }, [isConnected, isOffline]);

  return (
    <TransactionContext.Provider value={{
      transactions,
      addTransaction,
      removeTransaction,
      updateTransaction,
      isLoading,
      isConnected,
      isSyncing,
      isOffline,
      error,
      refreshTransactions,
      bulkRenameInTransactions
    }}>
      {children}
    </TransactionContext.Provider>
  );
}; 