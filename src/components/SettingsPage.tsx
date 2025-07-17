import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/lib/currency-context";
import { useTransactions } from "@/lib/transaction-context";
import { AlertCircle, CheckCircle, Database, DollarSign, Monitor, LogOut, Trash2, RefreshCw, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";

const SettingsPage = () => {
  const { currency, setCurrency } = useCurrency();
  const { isConnected, error, refreshTransactions } = useTransactions();
  const { getActiveSessions, terminateSession, terminateAllOtherSessions } = useAuth();
  const { toast } = useToast();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [showAccessKeyInput, setShowAccessKeyInput] = useState(false);

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'CHF', 'CNY', 'BRL'];

  const handleRefresh = async () => {
    try {
      await refreshTransactions();
      toast({
        title: "Data Refreshed",
        description: "Successfully refreshed data from Supabase",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Failed to refresh data. Please check your connection.",
      });
    }
  };

  // Load active sessions
  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const activeSessions = await getActiveSessions();
      setSessions(activeSessions);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to load sessions",
        description: "Could not fetch active sessions.",
      });
    } finally {
      setLoadingSessions(false);
    }
  };

  // Terminate a specific session
  const handleTerminateSession = async (sessionToken: string) => {
    try {
      await terminateSession(sessionToken);
      await loadSessions(); // Reload sessions
      toast({
        title: "Session Terminated",
        description: "The selected session has been terminated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to terminate session",
        description: "Could not terminate the selected session.",
      });
    }
  };

  // Terminate all other sessions
  const handleTerminateAllOtherSessions = async () => {
    try {
      await terminateAllOtherSessions();
      await loadSessions(); // Reload sessions
      toast({
        title: "Other Sessions Terminated",
        description: "All other active sessions have been terminated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to terminate sessions",
        description: "Could not terminate other sessions.",
      });
    }
  };

  // Sessions are loaded only after authentication, not on mount

  // Helper function to format device info
  const formatDeviceInfo = (deviceInfo: string) => {
    const parts = deviceInfo.split(' - ');
    if (parts.length >= 3) {
      const platform = parts[0];
      const userAgent = parts[1];
      const language = parts[2];
      
      // Extract browser info from user agent
      let browser = 'Unknown';
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Safari')) browser = 'Safari';
      else if (userAgent.includes('Edge')) browser = 'Edge';
      
      // Extract OS info
      let os = 'Unknown';
      if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Mac')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('iOS')) os = 'iOS';
      
      return `${os} - ${browser} (${language})`;
    }
    return deviceInfo;
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Handle root user authentication
  const handleRootUserAuth = async () => {
    if (!accessKey.trim()) {
      toast({
        variant: "destructive",
        title: "Access Key Required",
        description: "Please enter the access key to view sessions.",
      });
      return;
    }

    setIsAuthenticating(true);
    try {
      // Verify access key against environment variable + day
      const correctAccessKey = import.meta.env.VITE_ACCESS_KEY;
      const today = new Date();
      const day = today.getDate().toString();
      const expectedKey = correctAccessKey ? `${correctAccessKey}${day}` : null;
      if (!expectedKey) {
        toast({
          title: "Configuration Error",
          description: "Access key not configured. Please contact administrator.",
          variant: "destructive",
        });
        return;
      }

      if (accessKey !== expectedKey) {
        toast({
          title: "Invalid Access Key",
          description: "The access key you entered is incorrect.",
          variant: "destructive",
        });
        setAccessKey("");
        return;
      }

      // Authentication successful
      setShowSessions(true);
      setShowAccessKeyInput(false);
      setAccessKey("");
      await loadSessions();
      
      toast({
        title: "Authentication Successful",
        description: "Root user access granted. Sessions are now visible.",
      });
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle root user button click
  const handleRootUserClick = () => {
    setShowAccessKeyInput(true);
    setShowSessions(false);
  };

  // Handle cancel authentication
  const handleCancelAuth = () => {
    setShowAccessKeyInput(false);
    setShowSessions(false);
    setAccessKey("");
  };

  return (
    <div>
      {/* Current IST time at the top */}
      <div className="mb-4 text-right text-xs text-gray-500">
        {(() => {
          const now = new Date();
          const istOffset = 5.5 * 60 * 60 * 1000;
          const ist = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
          const pad = (n: number) => n.toString().padStart(2, '0');
          const dateStr = `${pad(ist.getDate())}-${pad(ist.getMonth() + 1)}-${ist.getFullYear()}`;
          const timeStr = `${pad(ist.getHours())}:${pad(ist.getMinutes())}:${pad(ist.getSeconds())}`;
          return `${dateStr} ${timeStr} IST`;
        })()}
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currency Settings
            </CardTitle>
            <CardDescription>
              Set your preferred currency for displaying amounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currency">Default Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr} value={curr}>
                      {curr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Connection
            </CardTitle>
            <CardDescription>
              Supabase database connection status and management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Connected to Supabase
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <Badge variant="destructive">
                    Not Connected
                  </Badge>
                </>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button onClick={handleRefresh} variant="outline">
              Refresh Data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Manage your active login sessions across different devices (Root access required)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showSessions && !showAccessKeyInput && (
              <div className="text-center py-8">
                <Monitor className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium text-gray-900 mb-2">Sessions Hidden</p>
                <p className="text-sm text-gray-500 mb-4">
                  Active sessions are hidden by default for security. 
                  Root user authentication is required to view and manage sessions.
                </p>
                <Button 
                  onClick={handleRootUserClick}
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Root User
                </Button>
              </div>
            )}

            {showAccessKeyInput && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="font-medium text-gray-900 mb-2">Root User Authentication</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Enter the access key to view and manage active sessions
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="access-key">Access Key</Label>
                    <Input
                      id="access-key"
                      type="password"
                      placeholder="Enter access key..."
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleRootUserAuth()}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={handleRootUserAuth}
                      disabled={isAuthenticating || !accessKey.trim()}
                      className="flex-1"
                    >
                      {isAuthenticating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Authenticating...
                        </>
                      ) : (
                        'Authenticate'
                      )}
                    </Button>
                    <Button 
                      onClick={handleCancelAuth}
                      variant="outline"
                      disabled={isAuthenticating}
                      className="flex-1 sm:flex-none"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {showSessions && (
              <>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={loadSessions} 
                      variant="outline" 
                      size="sm"
                      disabled={loadingSessions}
                      className="flex-1 sm:flex-none"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingSessions ? 'animate-spin' : ''}`} />
                      <span className="ml-1">Refresh</span>
                    </Button>
                    {sessions.length > 1 && (
                      <Button 
                        onClick={handleTerminateAllOtherSessions} 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 flex-1 sm:flex-none"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="ml-1">Terminate Others</span>
                      </Button>
                    )}
                    <Button 
                      onClick={handleCancelAuth}
                      variant="outline" 
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      <EyeOff className="h-4 w-4" />
                      <span className="ml-1">Hide Sessions</span>
                    </Button>
                  </div>
                </div>

                {loadingSessions ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500 mt-2">Loading sessions...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Monitor className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium">No active sessions</p>
                    <p className="text-sm">You are not currently logged in on any device.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div 
                        key={session.id} 
                        className={`p-4 border rounded-lg ${
                          session.is_current 
                            ? 'border-blue-200 bg-blue-50' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                                {formatDeviceInfo(session.device_info)}
                              </h4>
                              {session.is_current && (
                                <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                                  Current Session
                                </Badge>
                              )}
                            </div>
                            {!session.is_current && (
                              <Button
                                onClick={() => handleTerminateSession(session.session_token)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 self-start sm:self-auto"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="ml-1 sm:hidden">Terminate</span>
                              </Button>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Created: {formatDate(session.created_at)}</p>
                            <p>Expires: {formatDate(session.expires_at)}</p>
                            <p className="text-xs text-gray-500">
                              Session ID: {session.session_token.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
