import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Transaction {
  id?: string
  date: string
  type: 'expense' | 'income'
  amount: number
  currency: string
  category: string
  description?: string
  payment_method?: string
  fullySettled?: boolean // Added for settled status
  created_at?: string
}

export interface Category {
  id?: string
  name: string
  type: 'expense' | 'income'
  created_at?: string
}

export interface PaymentMethod {
  id?: string
  name: string
  created_at?: string
}

export interface AuthSession {
  id?: string
  session_token: string
  device_info?: string
  created_at?: string
  expires_at?: string
} 