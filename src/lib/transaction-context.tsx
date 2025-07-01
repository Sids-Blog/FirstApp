import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Transaction } from './supabase';

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<Transaction>;
  isLoading: boolean;
  isConnected: boolean;
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
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load transactions from Supabase on mount
  useEffect(() => {
    refreshTransactions();
  }, []);

  const refreshTransactions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      setTransactions(data || []);
      setIsConnected(true);
      console.log(`Loaded ${data?.length || 0} transactions from Supabase`);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError(error instanceof Error ? error.message : 'Failed to load transactions');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      // Add to local state immediately
      setTransactions(prev => [data, ...prev]);
      console.log('Transaction added to Supabase');
    } catch (error) {
      console.error('Error adding transaction:', error);
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
      const { error: supabaseError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (supabaseError) {
        throw supabaseError;
      }

      // Remove from local state immediately
      setTransactions(prev => prev.filter(t => t.id !== id));
      console.log('Transaction deleted from Supabase');
    } catch (error) {
      console.error('Error removing transaction:', error);
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
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (supabaseError) {
        throw supabaseError;
      }
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      console.log('Transaction updated in Supabase');
      return data;
    } catch (error) {
      console.error('Error updating transaction:', error);
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
      const { error: supabaseError } = await supabase
        .from('transactions')
        .update({ [field]: newValue })
        .eq(field, oldValue);
      if (supabaseError) {
        throw supabaseError;
      }
      // Update local state
      setTransactions(prev => prev.map(t => t[field] === oldValue ? { ...t, [field]: newValue } : t));
      console.log(`Renamed ${field} from '${oldValue}' to '${newValue}' in all transactions`);
    } catch (error) {
      console.error('Error bulk renaming in transactions:', error);
      setError(error instanceof Error ? error.message : 'Failed to bulk rename');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TransactionContext.Provider value={{
      transactions,
      addTransaction,
      removeTransaction,
      updateTransaction,
      isLoading,
      isConnected,
      error,
      refreshTransactions,
      bulkRenameInTransactions
    }}>
      {children}
    </TransactionContext.Provider>
  );
}; 