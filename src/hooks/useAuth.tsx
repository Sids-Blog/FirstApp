import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (accessKey: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuthStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Generate a unique session token
  const generateSessionToken = (): string => {
    return crypto.randomUUID()
  }

  // Get device info for session tracking
  const getDeviceInfo = (): string => {
    const userAgent = navigator.userAgent
    const platform = navigator.platform
    const language = navigator.language
    return `${platform} - ${userAgent.substring(0, 100)} - ${language}`
  }

  // Check if user is authenticated by looking for valid session in database
  const checkAuthStatus = async (): Promise<void> => {
    try {
      setIsLoading(true)
      
      // Get stored session token from localStorage
      const storedToken = localStorage.getItem('auth_session_token')
      if (!storedToken) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      // Check if session exists and is valid in database
      const { data: session, error } = await supabase
        .from('auth_sessions')
        .select('*')
        .eq('session_token', storedToken)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !session) {
        // Session not found or expired, remove from localStorage
        localStorage.removeItem('auth_session_token')
        setIsAuthenticated(false)
      } else {
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Login with access key
  const login = async (accessKey: string): Promise<boolean> => {
    try {
      setIsLoading(true)

      // Verify access key against environment variable
      const correctAccessKey = import.meta.env.VITE_ACCESS_KEY
      if (!correctAccessKey) {
        toast({
          title: "Configuration Error",
          description: "Access key not configured. Please contact administrator.",
          variant: "destructive",
        })
        return false
      }

      if (accessKey !== correctAccessKey) {
        toast({
          title: "Invalid Access Key",
          description: "The access key you entered is incorrect.",
          variant: "destructive",
        })
        return false
      }

      // Generate session token and store in database
      const sessionToken = generateSessionToken()
      const deviceInfo = getDeviceInfo()

      const { error } = await supabase
        .from('auth_sessions')
        .insert({
          session_token: sessionToken,
          device_info: deviceInfo,
        })

      if (error) {
        console.error('Error creating session:', error)
        toast({
          title: "Login Failed",
          description: "Failed to create session. Please try again.",
          variant: "destructive",
        })
        return false
      }

      // Store session token in localStorage
      localStorage.setItem('auth_session_token', sessionToken)
      setIsAuthenticated(true)

      toast({
        title: "Login Successful",
        description: "Welcome! You are now authenticated.",
      })

      return true
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Logout and clean up session
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true)

      const storedToken = localStorage.getItem('auth_session_token')
      if (storedToken) {
        // Remove session from database
        await supabase
          .from('auth_sessions')
          .delete()
          .eq('session_token', storedToken)

        // Remove from localStorage
        localStorage.removeItem('auth_session_token')
      }

      setIsAuthenticated(false)

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      })
    } catch (error) {
      console.error('Logout error:', error)
      toast({
        title: "Logout Error",
        description: "Error during logout, but you have been logged out locally.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Check auth status on component mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Clean up expired sessions periodically (optional)
  useEffect(() => {
    const cleanupExpiredSessions = async () => {
      try {
        await supabase
          .from('auth_sessions')
          .delete()
          .lt('expires_at', new Date().toISOString())
      } catch (error) {
        console.error('Error cleaning up expired sessions:', error)
      }
    }

    // Clean up expired sessions on load and every hour
    cleanupExpiredSessions()
    const interval = setInterval(cleanupExpiredSessions, 60 * 60 * 1000) // 1 hour

    return () => clearInterval(interval)
  }, [])

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuthStatus,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 