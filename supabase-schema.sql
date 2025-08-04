-- Expense Harmony Symphony - Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Authentication sessions table
CREATE TABLE auth_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Tags Table
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

-- Categories Table
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('expense', 'income')) not null,
  tag_id uuid references tags(id) on delete set null,
  default_value numeric default 0,
  "order" integer default 0
);

-- Budget Categories Table (used by BudgetPage)
create table if not exists categoriesbudget (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references categoriesbudget(id) on delete cascade,
  default_value numeric default 0,
  "order" integer default 0
);

-- Transactions Table
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  month text not null,
  category_id uuid references categories(id) on delete set null,
  amount numeric not null,
  comment text,
  type text check (type in ('budget', 'spend')) not null
);

-- Payment methods table
CREATE TABLE payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "order" integer DEFAULT 0
);

-- Insert default categories
INSERT INTO categories (name, type) VALUES
  ('Food & Dining', 'expense'),
  ('Transportation', 'expense'),
  ('Shopping', 'expense'),
  ('Entertainment', 'expense'),
  ('Bills & Utilities', 'expense'),
  ('Healthcare', 'expense'),
  ('Education', 'expense'),
  ('Travel', 'expense'),
  ('Salary', 'income'),
  ('Freelance', 'income'),
  ('Investment', 'income'),
  ('Business', 'income'),
  ('Other', 'income');

-- Insert default payment methods
INSERT INTO payment_methods (name) VALUES
  ('Cash'),
  ('Credit Card'),
  ('Debit Card'),
  ('Bank Transfer'),
  ('UPI'),
  ('Digital Wallet'),
  ('Cheque');

-- Enable Row Level Security
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (simple authentication system)
CREATE POLICY "Allow all operations" ON auth_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON payment_methods FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON tags FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_auth_sessions_token ON auth_sessions(session_token);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);

-- Enable RLS for categoriesbudget
ALTER TABLE categoriesbudget ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON categoriesbudget FOR ALL USING (true);

-- Add order management for categoriesbudget
-- Set default order for existing tags (parent_id is null)
DO $$
DECLARE
  i integer := 0;
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM categoriesbudget WHERE parent_id IS NULL ORDER BY id LOOP
    UPDATE categoriesbudget SET "order" = i WHERE id = r.id;
    i := i + 1;
  END LOOP;
END $$; 

-- Set order for all categories (parent_id is not null) to a unique, sequential value within each tag group
DO $$
DECLARE
  tag_id uuid;
  i integer;
  r RECORD;
BEGIN
  FOR tag_id IN SELECT DISTINCT parent_id FROM categoriesbudget WHERE parent_id IS NOT NULL LOOP
    i := 0;
    FOR r IN SELECT id FROM categoriesbudget WHERE parent_id = tag_id ORDER BY id LOOP
      UPDATE categoriesbudget SET "order" = i WHERE id = r.id;
      i := i + 1;
    END LOOP;
  END LOOP;
END $$;