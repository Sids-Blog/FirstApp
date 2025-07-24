import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, TrendingDown, Wallet, TrendingUp, Home, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-4 bg-white/80 shadow-sm border-b">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 tracking-tight">
          Sid&apos;s Personal Finance Apps
        </h1>
        <div className="flex items-center space-x-2 sm:space-x-4">
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
            variant="outline"
            className="flex items-center gap-2 text-base font-medium"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-2xl mt-12">
          {/* Admin Tools Card */}
          <Card
            className="cursor-pointer transition-transform hover:scale-105 shadow-lg border-purple-200"
            onClick={() => navigate("/admin")}
          >
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Settings className="h-6 w-6 text-purple-600" />
                Admin Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Manage application settings, currency preferences, and other global configurations.
              </p>
            </CardContent>
          </Card>

          {/* Expense Card */}
          <Card
            className="cursor-pointer transition-transform hover:scale-105 shadow-lg border-blue-200"
            onClick={() => navigate("/expense")}
          >
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <TrendingDown className="h-7 w-7 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-blue-700">
                Expense Tracker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-base">
                Track your daily expenses, add incomes, and manage your transactions with ease.
              </p>
            </CardContent>
          </Card>

          {/* Budget Card */}
          <Card
            className="cursor-pointer transition-transform hover:scale-105 shadow-lg border-emerald-200"
            onClick={() => navigate("/budget")}
          >
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="bg-emerald-100 rounded-full p-2">
                <Wallet className="h-7 w-7 text-emerald-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-emerald-700">
                Budget Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-base">
                Set monthly budgets, monitor your spending, and analyze your financial health.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
