import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Transaction } from './supabase';

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  refreshTransactions: () => Promise<void>;
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

  return (
    <TransactionContext.Provider value={{
      transactions,
      addTransaction,
      removeTransaction,
      isLoading,
      isConnected,
      error,
      refreshTransactions
    }}>
      {children}
    </TransactionContext.Provider>
  );
}; 