"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Shield, 
  Mail, 
  ShoppingCart, 
  FileSpreadsheet,
  Clock,
  AlertTriangle
} from "lucide-react"

interface Configuration {
  id: string
  key: string
  value: string
  description?: string
  category: string
  isSensitive: boolean
}

interface ConfigGroup {
  [category: string]: Configuration[]
}

export default function ConfigurationManager() {
  const [configGroups, setConfigGroups] = useState<ConfigGroup>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchConfigurations()
  }, [])

  const fetchConfigurations = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/config/categories")
      if (response.ok) {
        const data = await response.json()
        setConfigGroups(data)
      }
    } catch (error) {
      console.error("Error fetching configurations:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateConfiguration = async (key: string, value: string) => {
    setSaving(true)
    try {
      const response = await fetch("/api/config/categories", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        },
        body: JSON.stringify({ key, value })
      })

      if (response.ok) {
        setMessage("Configuration updated successfully")
        setTimeout(() => setMessage(""), 3000)
        await fetchConfigurations()
      } else {
        const error = await response.json()
        setMessage(error.error || "Failed to update configuration")
      }
    } catch (error) {
      setMessage("Failed to update configuration")
    } finally {
      setSaving(false)
    }
  }

  const renderConfigField = (config: Configuration) => {
    const isBoolean = config.value === "true" || config.value === "false"
    const isNumber = !isNaN(Number(config.value))
    const isSecret = config.isSensitive

    if (isBoolean) {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={config.value === "true"}
            onCheckedChange={(checked) => 
              updateConfiguration(config.key, checked.toString())
            }
          />
          <span className="text-sm text-gray-600">
            {config.value === "true" ? "Enabled" : "Disabled"}
          </span>
        </div>
      )
    }

    if (isSecret) {
      return (
        <div className="relative">
          <Input
            type="password"
            value="••••••••"
            onChange={(e) => {
              // Allow editing but show as masked
              const newValue = e.target.value
              if (newValue !== "••••••••") {
                updateConfiguration(config.key, newValue)
              }
            }}
            placeholder="Enter secret value"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            onClick={() => {
              const newValue = prompt("Enter new value:", config.value)
              if (newValue !== null) {
                updateConfiguration(config.key, newValue)
              }
            }}
          >
            Edit
          </Button>
        </div>
      )
    }

    return (
      <Input
        type={isNumber ? "number" : "text"}
        value={config.value}
        onChange={(e) => updateConfiguration(config.key, e.target.value)}
        placeholder={config.description}
      />
    )
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "shopify":
        return <ShoppingCart className="h-5 w-5" />
      case "email":
        return <Mail className="h-5 w-5" />
      case "google":
        return <FileSpreadsheet className="h-5 w-5" />
      case "sync":
        return <Clock className="h-5 w-5" />
      default:
        return <Settings className="h-5 w-5" />
    }
  }

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case "shopify":
        return "Shopify API credentials and store settings"
      case "email":
        return "Email notification settings and SMTP configuration"
      case "google":
        return "Google Sheets API and integration settings"
      case "sync":
        return "Automatic sync scheduling and threshold settings"
      default:
        return "General application settings"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading configurations...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration Management</h1>
          <p className="text-muted-foreground">
            Manage application settings and integrations
          </p>
        </div>
        <Button onClick={fetchConfigurations} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          {Object.keys(configGroups).map((category) => (
            <TabsTrigger key={category} value={category} className="flex items-center gap-2">
              {getCategoryIcon(category)}
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(configGroups).map(([category, configs]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {getCategoryIcon(category)}
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {category.charAt(0).toUpperCase() + category.slice(1)} Settings
                      <Badge variant="outline">{configs.length} items</Badge>
                    </CardTitle>
                    <CardDescription>
                      {getCategoryDescription(category)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {configs.map((config) => (
                    <div key={config.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={config.key} className="text-sm font-medium">
                            {config.key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                          {config.isSensitive && (
                            <Badge variant="secondary" className="ml-2">
                              <Shield className="h-3 w-3 mr-1" />
                              Secret
                            </Badge>
                          )}
                        </div>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {config.key}
                        </code>
                      </div>
                      
                      {config.description && (
                        <p className="text-sm text-gray-600">{config.description}</p>
                      )}
                      
                      <div className="max-w-md">
                        {renderConfigField(config)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Shopify Configuration:</strong> Requires your store name and API access token from Shopify Admin</p>
            <p><strong>Email Configuration:</strong> Use app-specific passwords for Gmail, not your regular password</p>
            <p><strong>Google Sheets:</strong> Create OAuth 2.0 credentials in Google Cloud Console</p>
            <p><strong>Sync Settings:</strong> Configure thresholds and scheduling for automated operations</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}