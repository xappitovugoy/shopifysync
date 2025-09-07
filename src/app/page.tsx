"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Package, 
  AlertTriangle, 
  DollarSign, 
  RefreshCw, 
  Download, 
  Mail,
  TrendingUp,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  Settings,
  LogOut,
  User
} from "lucide-react"
import ConfigurationManager from "@/components/config/ConfigurationManager"

interface InventoryStats {
  totalProducts: number
  lowStockCount: number
  totalValue: number
  lastSync: string
  syncStatus: "completed" | "failed" | "pending"
}

interface RecentSync {
  id: string
  operation: string
  status: string
  productsCount: number
  createdAt: string
}

interface User {
  id: string
  email: string
  name?: string
  role: string
  isActive: boolean
}

export default function Dashboard() {
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    lowStockCount: 0,
    totalValue: 0,
    lastSync: "Never",
    syncStatus: "pending"
  })
  
  const [recentSyncs, setRecentSyncs] = useState<RecentSync[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchDashboardData()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem("auth_token")
    const userData = localStorage.getItem("user")
    
    if (!token || !userData) {
      router.push("/login")
      return
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        // Token is invalid, clear storage and redirect to login
        localStorage.removeItem("auth_token")
        localStorage.removeItem("user")
        router.push("/login")
      }
    } catch (error) {
      console.error("Auth check failed:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("auth_token")
    if (!token) return

    try {
      const [statsResponse, syncsResponse] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/recent-syncs")
      ])
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
      
      if (syncsResponse.ok) {
        const syncsData = await syncsResponse.json()
        setRecentSyncs(syncsData)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  const handleSync = async () => {
    const token = localStorage.getItem("auth_token")
    if (!token) return

    setIsSyncing(true)
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        await fetchDashboardData()
      }
    } catch (error) {
      console.error("Sync failed:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleExportGoogleSheets = async (type: "inventory" | "low-stock" = "inventory") => {
    const token = localStorage.getItem("auth_token")
    if (!token) return

    try {
      const response = await fetch("/api/export/google-sheets", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.open(data.url, "_blank")
        }
      }
    } catch (error) {
      console.error("Google Sheets export failed:", error)
    }
  }

  const handleExportCSV = async () => {
    const token = localStorage.getItem("auth_token")
    if (!token) return

    try {
      const response = await fetch("/api/export/csv", {
        headers: { 
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("CSV export failed:", error)
    }
  }

  const handleSendLowStockAlert = async () => {
    const token = localStorage.getItem("auth_token")
    if (!token) return

    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ type: "low_stock", threshold: 10 })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(data.message || "Low stock alert sent successfully")
      } else {
        const error = await response.json()
        alert(error.error || "Failed to send low stock alert")
      }
    } catch (error) {
      console.error("Failed to send low stock alert:", error)
      alert("Failed to send low stock alert")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500"
      case "failed": return "bg-red-500"
      case "pending": return "bg-yellow-500"
      default: return "bg-gray-500"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NepSync Inventory</h1>
              <p className="text-sm text-gray-600">Inventory Management System</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push("/config")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configuration
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h2>
                <p className="text-muted-foreground">
                  Monitor and manage your Shopify inventory in real-time
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSync} 
                  disabled={isSyncing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleSendLowStockAlert}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Send Low Stock Alert
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportGoogleSheets("inventory")}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export to Google Sheets
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportGoogleSheets("low-stock")}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Low Stock to Google Sheets
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">
                    Active inventory items
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.lowStockCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Items need restocking
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${stats.totalValue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Inventory wholesale value
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(stats.syncStatus)}`} />
                    <div className="text-2xl font-bold">{stats.lastSync}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.syncStatus === "completed" ? "Successful" : stats.syncStatus === "failed" ? "Failed" : "In Progress"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different sections */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sync-history">Sync History</TabsTrigger>
                <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Overview</CardTitle>
                    <CardDescription>
                      Summary of your current inventory status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Inventory Health</span>
                          <span className="text-sm text-muted-foreground">85%</span>
                        </div>
                        <Progress value={85} className="h-2" />
                      </div>
                      
                      <Alert>
                        <TrendingUp className="h-4 w-4" />
                        <AlertDescription>
                          Your inventory is performing well. Consider restocking low stock items soon.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="sync-history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Sync Operations</CardTitle>
                    <CardDescription>
                      History of inventory synchronization activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentSyncs.length === 0 ? (
                        <p className="text-muted-foreground">No sync operations yet</p>
                      ) : (
                        recentSyncs.map((sync) => (
                          <div key={sync.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(sync.status)}`} />
                              <div>
                                <p className="font-medium">{sync.operation}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(sync.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{sync.productsCount} products</p>
                              <Badge variant={sync.status === "completed" ? "default" : "destructive"}>
                                {sync.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="low-stock" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Low Stock Items</CardTitle>
                    <CardDescription>
                      Products that need restocking attention
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Low stock items will appear here once data is synced.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <ConfigurationManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}