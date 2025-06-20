import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/lib/currency-context";
import { useTransactions } from "@/lib/transaction-context";
import { BarChart3, DollarSign, PieChart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useData } from "@/lib/data-context";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const Dashboard = () => {
  const { transactions } = useTransactions();
  const { currency } = useCurrency();
  const { expenseCategories, incomeCategories, paymentMethods } = useData();

  // FILTER STATES
  // Monthly Trend
  const [trendType, setTrendType] = React.useState<'all' | 'income' | 'expense'>('all');
  const [trendStartDate, setTrendStartDate] = React.useState("");
  const [trendEndDate, setTrendEndDate] = React.useState("");
  // Category Breakdown
  const [categoryMonth, setCategoryMonth] = React.useState(() => new Date().toISOString().slice(0, 7));
  // Daily Spending
  const [dailyCategory, setDailyCategory] = React.useState('all');
  const [dailyStartDate, setDailyStartDate] = React.useState("");
  const [dailyEndDate, setDailyEndDate] = React.useState("");
  // Payment Methods
  const [paymentMethodFilter, setPaymentMethodFilter] = React.useState('all');
  // Top Spending Categories
  const [topCatStartDate, setTopCatStartDate] = React.useState("");
  const [topCatEndDate, setTopCatEndDate] = React.useState("");

  const getCurrencySymbol = () => {
    switch (currency) {
      case 'INR': return '₹';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '$';
    }
  };

  // Calculate statistics from real transaction data
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Filter transactions for current month
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    // Calculate totals
    const totalIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    // Calculate category breakdown for expenses
    const expensesByCategory = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    // Get top spending categories
    const topCategories = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }));

    return {
      totalIncome,
      totalExpenses,
      balance,
      transactionCount: currentMonthTransactions.length,
      topCategories
    };
  }, [transactions]);

  // Chart data calculations
  const chartData = useMemo(() => {
    // Monthly trend data (last 6 months or filtered by date)
    let monthlyData = [];
    let monthsToShow = 6;
    let customMonths: { month: string, year: number }[] = [];
    if (trendStartDate && trendEndDate) {
      // Generate months between start and end
      const start = new Date(trendStartDate);
      const end = new Date(trendEndDate);
      let d = new Date(start.getFullYear(), start.getMonth(), 1);
      while (d <= end) {
        customMonths.push({ month: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear() });
        d.setMonth(d.getMonth() + 1);
      }
    }
    for (let i = (customMonths.length ? customMonths.length - 1 : monthsToShow - 1); i >= 0; i--) {
      let date, month, year;
      if (customMonths.length) {
        month = new Date(trendStartDate).getMonth() + i;
        year = new Date(trendStartDate).getFullYear();
        date = new Date(year, month, 1);
        month = date.getMonth();
        year = date.getFullYear();
      } else {
        date = new Date();
        date.setMonth(date.getMonth() - i);
        month = date.getMonth();
        year = date.getFullYear();
      }
      let monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        let inMonth = transactionDate.getMonth() === month && transactionDate.getFullYear() === year;
        let inRange = true;
        if (trendStartDate) inRange = inRange && t.date >= trendStartDate;
        if (trendEndDate) inRange = inRange && t.date <= trendEndDate;
        return inMonth && inRange;
      });
      if (trendType !== 'all') monthTransactions = monthTransactions.filter(t => t.type === trendType);
      const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        income,
        expenses,
        net: income - expenses
      });
    }
    // Category pie chart data (for selected month)
    const [catYear, catMonth] = categoryMonth.split('-').map(Number);
    const catMonthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === catYear && d.getMonth() + 1 === catMonth && t.type === 'expense';
    });
    const expensesByCategory = catMonthTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    const totalExpenses = catMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
    const categoryData = Object.entries(expensesByCategory).map(([category, amount]) => ({
      name: category,
      value: amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    }));
    // Daily spending for last 7 days, filtered by category and date
    let dailyData = [];
    let daysToShow = 7;
    let customDays: string[] = [];
    if (dailyStartDate && dailyEndDate) {
      let d = new Date(dailyStartDate);
      const end = new Date(dailyEndDate);
      while (d <= end) {
        customDays.push(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 1);
      }
    }
    for (let i = (customDays.length ? customDays.length - 1 : daysToShow - 1); i >= 0; i--) {
      let date, dateString;
      if (customDays.length) {
        dateString = customDays[customDays.length - 1 - i];
        date = new Date(dateString);
      } else {
        date = new Date();
        date.setDate(date.getDate() - i);
        dateString = date.toISOString().split('T')[0];
      }
      let dayExpenses = transactions.filter(t => t.type === 'expense' && t.date === dateString);
      if (dailyCategory !== 'all') dayExpenses = dayExpenses.filter(t => t.category === dailyCategory);
      if (dailyStartDate || dailyEndDate) {
        dayExpenses = dayExpenses.filter(t => {
          if (dailyStartDate && t.date < dailyStartDate) return false;
          if (dailyEndDate && t.date > dailyEndDate) return false;
          return true;
        });
      }
      dailyData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        expenses: dayExpenses.reduce((sum, t) => sum + t.amount, 0)
      });
    }
    // Payment method data (all time, filterable)
    let paymentMethodTx = transactions.filter(t => t.payment_method);
    if (paymentMethodFilter !== 'all') paymentMethodTx = paymentMethodTx.filter(t => t.payment_method === paymentMethodFilter);
    const paymentMethodData = paymentMethodTx.reduce((acc, t) => {
      const method = t.payment_method || 'Unknown';
      acc[method] = (acc[method] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    const paymentData = Object.entries(paymentMethodData).map(([method, amount]) => ({
      name: method,
      value: amount
    }));
    // Top Spending Categories (filtered by date)
    let topCatTx = transactions.filter(t => t.type === 'expense');
    if (topCatStartDate) topCatTx = topCatTx.filter(t => t.date >= topCatStartDate);
    if (topCatEndDate) topCatTx = topCatTx.filter(t => t.date <= topCatEndDate);
    const topCatByCategory = topCatTx.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    const topCatTotal = topCatTx.reduce((sum, t) => sum + t.amount, 0);
    const topCategories = Object.entries(topCatByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: topCatTotal > 0 ? (amount / topCatTotal) * 100 : 0
      }));
    return {
      monthlyData,
      categoryData,
      dailyData,
      paymentData,
      topCategories
    };
  }, [transactions, trendType, trendStartDate, trendEndDate, categoryMonth, dailyCategory, dailyStartDate, dailyEndDate, paymentMethodFilter, topCatStartDate, topCatEndDate]);

  const formatAmount = (amount: number) => {
    return `${getCurrencySymbol()}${Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Colors for charts
  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatAmount(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatAmount(stats.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatAmount(stats.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Wallet className={`h-4 w-4 ${stats.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {stats.balance >= 0 ? '+' : '-'}{formatAmount(stats.balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.transactionCount}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Income vs Expenses Trend
            </CardTitle>
            <CardDescription>Last 6 months comparison</CardDescription>
            <div className="flex flex-wrap gap-2 mt-2 sm:flex-row flex-col items-center">
              <Select value={trendType} onValueChange={val => setTrendType(val as 'all' | 'income' | 'expense')}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={trendStartDate} onChange={e => setTrendStartDate(e.target.value)} className="w-36" placeholder="Start date" />
              <Input type="date" value={trendEndDate} onChange={e => setTrendEndDate(e.target.value)} className="w-36" placeholder="End date" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" size="icon" onClick={() => { setTrendType('all'); setTrendStartDate(""); setTrendEndDate(""); }} className="h-7 w-7"><span className="sr-only">Clear filter</span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></Button>
                </TooltipTrigger>
                <TooltipContent>Clear filter</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${getCurrencySymbol()}${value}`} />
                  <RechartsTooltip content={CustomTooltip as any} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Income"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Spending by Category
            </CardTitle>
            <CardDescription>This month's expense breakdown</CardDescription>
            <div className="flex flex-wrap gap-2 mt-2 sm:flex-row flex-col items-center">
              <Input type="month" value={categoryMonth} onChange={e => setCategoryMonth(e.target.value)} className="w-40" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" size="icon" onClick={() => setCategoryMonth(new Date().toISOString().slice(0, 7))} className="h-7 w-7"><span className="sr-only">Clear filter</span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></Button>
                </TooltipTrigger>
                <TooltipContent>Clear filter</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {chartData.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={CustomTooltip as any} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No expense data available</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Spending Pattern */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Spending Pattern</CardTitle>
            <CardDescription>Last 7 days expenses</CardDescription>
            <div className="flex flex-wrap gap-2 mt-2 sm:flex-row flex-col items-center">
              <Select value={dailyCategory} onValueChange={setDailyCategory}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {expenseCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={dailyStartDate} onChange={e => setDailyStartDate(e.target.value)} className="w-36" placeholder="Start date" />
              <Input type="date" value={dailyEndDate} onChange={e => setDailyEndDate(e.target.value)} className="w-36" placeholder="End date" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" size="icon" onClick={() => { setDailyCategory('all'); setDailyStartDate(""); setDailyEndDate(""); }} className="h-7 w-7"><span className="sr-only">Clear filter</span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></Button>
                </TooltipTrigger>
                <TooltipContent>Clear filter</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={(value) => `${getCurrencySymbol()}${value}`} />
                  <RechartsTooltip content={CustomTooltip as any} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Transaction amounts by payment method</CardDescription>
            <div className="flex flex-wrap gap-2 mt-2 sm:flex-row flex-col items-center">
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Methods" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" size="icon" onClick={() => setPaymentMethodFilter('all')} className="h-7 w-7"><span className="sr-only">Clear filter</span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></Button>
                </TooltipTrigger>
                <TooltipContent>Clear filter</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {chartData.paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData.paymentData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                    >
                      {chartData.paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={CustomTooltip as any} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No payment method data</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Spending Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Top Spending Categories</CardTitle>
          <CardDescription>Your biggest expense categories this month</CardDescription>
          <div className="flex flex-wrap gap-2 mt-2 sm:flex-row flex-col items-center">
            <Input type="date" value={topCatStartDate} onChange={e => setTopCatStartDate(e.target.value)} className="w-36" placeholder="Start date" />
            <Input type="date" value={topCatEndDate} onChange={e => setTopCatEndDate(e.target.value)} className="w-36" placeholder="End date" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" size="icon" onClick={() => { setTopCatStartDate(""); setTopCatEndDate(""); }} className="h-7 w-7"><span className="sr-only">Clear filter</span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></Button>
              </TooltipTrigger>
              <TooltipContent>Clear filter</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.topCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingDown className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No expenses yet</p>
              <p className="text-sm">Start tracking your expenses to see spending patterns!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chartData.topCategories.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{category.category}</p>
                      <p className="text-sm text-gray-500">
                        {category.percentage.toFixed(1)}% of total expenses
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      {formatAmount(category.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No transactions yet</p>
              <p className="text-sm">Add your first income or expense to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.category}</p>
                      <p className="text-sm text-gray-500">{transaction.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                    </p>
                    {transaction.description && (
                      <p className="text-sm text-gray-500">{transaction.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
