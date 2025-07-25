import Dashboard from "@/components/Dashboard";
import DropdownManager from "@/components/DropdownManager";
import ExpenseForm from "@/components/ExpenseForm";
import IncomeForm from "@/components/IncomeForm";
import SettingsPage from "@/components/SettingsPage";
import TransactionList from "@/components/TransactionList";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/lib/transaction-context";
import { BarChart3, Home, List, LogOut, Plus, PlusCircle, Settings, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
    
const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showFabMenu, setShowFabMenu] = useState(false);
  const { logout } = useAuth();
  const { isOffline, isSyncing } = useTransactions();
  const [lastSync, setLastSync] = useState<string | null>(null);
  const lastSyncRef = useRef<string | null>(null);
  const navigate = useNavigate();
  // Update last sync time in localStorage when online and not syncing
  useEffect(() => {
    if (!isOffline && !isSyncing) {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const ist = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${pad(ist.getDate())}-${pad(ist.getMonth() + 1)}-${ist.getFullYear()}`;
      const timeStr = `${pad(ist.getHours())}:${pad(ist.getMinutes())}:${pad(ist.getSeconds())}`;
      const syncStr = `${dateStr} ${timeStr} IST`;
      localStorage.setItem('last_sync_ist', syncStr);
      setLastSync(syncStr);
      lastSyncRef.current = syncStr;
    } else if (isOffline) {
      // On going offline, read last sync from localStorage
      const stored = localStorage.getItem('last_sync_ist');
      setLastSync(stored);
      lastSyncRef.current = stored;
    }
  }, [isOffline, isSyncing]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      {/* Offline/Sync Banner */}
      {(isOffline || isSyncing) && (
        <div className={`w-full text-center py-2 text-white ${isOffline ? 'bg-red-600' : 'bg-blue-600'}`}
             style={{ zIndex: 1000 }}>
          {isOffline ? (
            <>
              You are offline. Changes will sync when you are back online.
              {lastSync && (
                <div className="text-xs text-white/80 mt-1">Last sync: {lastSync}</div>
              )}
            </>
          ) : (
            'Syncing changes...'
          )}
        </div>
      )}
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                <span className="sm:hidden">Expenses</span>
                <span className="hidden sm:inline">Expense tracker</span>
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                onClick={() => setActiveTab("add-expense")}
                className="bg-red-600 hover:bg-red-700 text-white min-h-[44px] min-w-[44px] sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-2"
                size="sm"
              >
                <TrendingDown className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Expense</span>
              </Button>
              <Button
                onClick={() => setActiveTab("add-income")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] min-w-[44px] sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-2"
                size="sm"
              >
                <TrendingUp className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Income</span>
              </Button>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="min-h-[44px] min-w-[44px] sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-2 border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                size="sm"
              >
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="min-h-[44px] min-w-[44px] sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-2 border-gray-300 hover:bg-gray-50"
                size="sm"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-gray-100 rounded-xl flex gap-1 p-1 justify-start">
            <TabsTrigger value="dashboard" className="flex-1 font-semibold text-gray-700 rounded-lg px-3 py-2 transition-colors focus:outline-none data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-black data-[state=active]:font-bold hover:bg-white/70">
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1 font-semibold text-gray-700 rounded-lg px-3 py-2 transition-colors focus:outline-none data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-black data-[state=active]:font-bold hover:bg-white/70">
              <List className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex-1 font-semibold text-gray-700 rounded-lg px-3 py-2 transition-colors focus:outline-none data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-black data-[state=active]:font-bold hover:bg-white/70">
              <PlusCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="add-expense" className="mt-6">
            <div className="flex justify-center">
              <ExpenseForm />
            </div>
          </TabsContent>

          <TabsContent value="add-income" className="mt-6">
            <div className="flex justify-center">
              <IncomeForm />
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <TransactionList />
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <DropdownManager />
          </TabsContent>

        </Tabs>
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        {showFabMenu && (
          <div className="absolute bottom-16 right-0 space-y-3 mb-2">
            <Button
              onClick={() => {
                setActiveTab("add-expense");
                setShowFabMenu(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center gap-2 min-h-[48px] px-4"
              size="sm"
            >
              <TrendingDown className="h-4 w-4" />
              <span>Add Expense</span>
            </Button>
            <Button
              onClick={() => {
                setActiveTab("add-income");
                setShowFabMenu(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center gap-2 min-h-[48px] px-4"
              size="sm"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Add Income</span>
            </Button>
          </div>
        )}
        <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="min-h-[44px] min-w-[44px] sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-2 border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                size="sm"
              >
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button> 
        <Button
          onClick={() => setShowFabMenu(!showFabMenu)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-full h-14 w-14 p-0"
          size="sm"
        >
          <Plus className={`h-6 w-6 transition-transform ${showFabMenu ? 'rotate-45' : ''}`} />
        </Button>
      </div>

      {/* Footer */}
      <footer className="w-full mt-8 py-4 bg-white border-t text-center text-xs text-gray-500">
        This site is created for Siddeshwar's personal budget tracking
      </footer>
    </div>
  );
};

export default Index;
