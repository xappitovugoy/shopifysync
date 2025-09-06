import { db } from "@/lib/db"

export interface AppConfig {
  shopify: {
    storeName: string
    accessToken: string
    apiVersion: string
  }
  email: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    recipients: string[]
  }
  google: {
    clientId: string
    clientSecret: string
    redirectUri: string
  }
  sync: {
    lowStockThreshold: number
    autoSyncEnabled: boolean
    autoSyncInterval: string
    emailNotifications: boolean
  }
}

export class ConfigService {
  private static instance: ConfigService
  private cache: Map<string, any> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService()
    }
    return ConfigService.instance
  }

  async getConfig(): Promise<AppConfig> {
    try {
      const configs = await db.configuration.findMany()
      
      const configMap = new Map(configs.map(c => [c.key, c.value]))
      
      return {
        shopify: {
          storeName: configMap.get("shopify_store_name") || "",
          accessToken: configMap.get("shopify_access_token") || "",
          apiVersion: configMap.get("shopify_api_version") || "2024-01"
        },
        email: {
          host: configMap.get("email_host") || "smtp.gmail.com",
          port: parseInt(configMap.get("email_port") || "587"),
          user: configMap.get("email_user") || "",
          pass: configMap.get("email_pass") || "",
          from: configMap.get("email_from") || "",
          recipients: configMap.get("email_recipients") 
            ? configMap.get("email_recipients").split(",").map(r => r.trim())
            : []
        },
        google: {
          clientId: configMap.get("google_client_id") || "",
          clientSecret: configMap.get("google_client_secret") || "",
          redirectUri: configMap.get("google_redirect_uri") || ""
        },
        sync: {
          lowStockThreshold: parseInt(configMap.get("sync_low_stock_threshold") || "10"),
          autoSyncEnabled: configMap.get("sync_auto_enabled") === "true",
          autoSyncInterval: configMap.get("sync_auto_interval") || "0 */6 * * *",
          emailNotifications: configMap.get("sync_email_notifications") === "true"
        }
      }
    } catch (error) {
      console.error("Error getting configuration:", error)
      throw new Error("Failed to get configuration")
    }
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
    try {
      const operations = []

      if (updates.shopify) {
        if (updates.shopify.storeName !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "shopify_store_name" },
              update: { value: updates.shopify.storeName },
              create: { key: "shopify_store_name", value: updates.shopify.storeName, description: "Shopify store name" }
            })
          )
        }
        if (updates.shopify.accessToken !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "shopify_access_token" },
              update: { value: updates.shopify.accessToken },
              create: { key: "shopify_access_token", value: updates.shopify.accessToken, description: "Shopify access token" }
            })
          )
        }
        if (updates.shopify.apiVersion !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "shopify_api_version" },
              update: { value: updates.shopify.apiVersion },
              create: { key: "shopify_api_version", value: updates.shopify.apiVersion, description: "Shopify API version" }
            })
          )
        }
      }

      if (updates.email) {
        if (updates.email.host !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "email_host" },
              update: { value: updates.email.host },
              create: { key: "email_host", value: updates.email.host, description: "Email SMTP host" }
            })
          )
        }
        if (updates.email.port !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "email_port" },
              update: { value: updates.email.port.toString() },
              create: { key: "email_port", value: updates.email.port.toString(), description: "Email SMTP port" }
            })
          )
        }
        if (updates.email.user !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "email_user" },
              update: { value: updates.email.user },
              create: { key: "email_user", value: updates.email.user, description: "Email username" }
            })
          )
        }
        if (updates.email.pass !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "email_pass" },
              update: { value: updates.email.pass },
              create: { key: "email_pass", value: updates.email.pass, description: "Email password" }
            })
          )
        }
        if (updates.email.from !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "email_from" },
              update: { value: updates.email.from },
              create: { key: "email_from", value: updates.email.from, description: "Email from address" }
            })
          )
        }
        if (updates.email.recipients !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "email_recipients" },
              update: { value: updates.email.recipients.join(",") },
              create: { key: "email_recipients", value: updates.email.recipients.join(","), description: "Email recipients (comma separated)" }
            })
          )
        }
      }

      if (updates.google) {
        if (updates.google.clientId !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "google_client_id" },
              update: { value: updates.google.clientId },
              create: { key: "google_client_id", value: updates.google.clientId, description: "Google client ID" }
            })
          )
        }
        if (updates.google.clientSecret !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "google_client_secret" },
              update: { value: updates.google.clientSecret },
              create: { key: "google_client_secret", value: updates.google.clientSecret, description: "Google client secret" }
            })
          )
        }
        if (updates.google.redirectUri !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "google_redirect_uri" },
              update: { value: updates.google.redirectUri },
              create: { key: "google_redirect_uri", value: updates.google.redirectUri, description: "Google redirect URI" }
            })
          )
        }
      }

      if (updates.sync) {
        if (updates.sync.lowStockThreshold !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "sync_low_stock_threshold" },
              update: { value: updates.sync.lowStockThreshold.toString() },
              create: { key: "sync_low_stock_threshold", value: updates.sync.lowStockThreshold.toString(), description: "Low stock threshold" }
            })
          )
        }
        if (updates.sync.autoSyncEnabled !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "sync_auto_enabled" },
              update: { value: updates.sync.autoSyncEnabled.toString() },
              create: { key: "sync_auto_enabled", value: updates.sync.autoSyncEnabled.toString(), description: "Auto sync enabled" }
            })
          )
        }
        if (updates.sync.autoSyncInterval !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "sync_auto_interval" },
              update: { value: updates.sync.autoSyncInterval },
              create: { key: "sync_auto_interval", value: updates.sync.autoSyncInterval, description: "Auto sync interval (cron expression)" }
            })
          )
        }
        if (updates.sync.emailNotifications !== undefined) {
          operations.push(
            db.configuration.upsert({
              where: { key: "sync_email_notifications" },
              update: { value: updates.sync.emailNotifications.toString() },
              create: { key: "sync_email_notifications", value: updates.sync.emailNotifications.toString(), description: "Email notifications enabled" }
            })
          )
        }
      }

      await Promise.all(operations)
      
      // Clear cache
      this.cache.clear()
      this.cacheExpiry.clear()

      return await this.getConfig()
    } catch (error) {
      console.error("Error updating configuration:", error)
      throw new Error("Failed to update configuration")
    }
  }

  async getShopifyConfig() {
    const config = await this.getConfig()
    return config.shopify
  }

  async getEmailConfig() {
    const config = await this.getConfig()
    return config.email
  }

  async getGoogleConfig() {
    const config = await this.getConfig()
    return config.google
  }

  async getSyncConfig() {
    const config = await this.getConfig()
    return config.sync
  }
}