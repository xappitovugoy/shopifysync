import { db } from "@/lib/db"

export interface ConfigItem {
  key: string
  value: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export class ConfigService {
  private static instance: ConfigService
  private cache: Map<string, string> = new Map()

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService()
    }
    return ConfigService.instance
  }

  async get(key: string, defaultValue?: string): Promise<string | undefined> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }

    try {
      const config = await db.configuration.findUnique({
        where: { key }
      })

      if (config) {
        this.cache.set(key, config.value)
        return config.value
      }

      return defaultValue
    } catch (error) {
      console.error(`Error getting config ${key}:`, error)
      return defaultValue
    }
  }

  async set(key: string, value: string, description?: string): Promise<void> {
    try {
      const existingConfig = await db.configuration.findUnique({
        where: { key }
      })

      if (existingConfig) {
        await db.configuration.update({
          where: { key },
          data: {
            value,
            description
          }
        })
      } else {
        await db.configuration.create({
          data: {
            key,
            value,
            description
          }
        })
      }

      // Update cache
      this.cache.set(key, value)
    } catch (error) {
      console.error(`Error setting config ${key}:`, error)
      throw new Error(`Failed to set config ${key}`)
    }
  }

  async getNumber(key: string, defaultValue?: number): Promise<number | undefined> {
    const value = await this.get(key)
    if (value === undefined) return defaultValue
    
    const num = parseFloat(value)
    return isNaN(num) ? defaultValue : num
  }

  async getBoolean(key: string, defaultValue?: boolean): Promise<boolean | undefined> {
    const value = await this.get(key)
    if (value === undefined) return defaultValue
    
    return value.toLowerCase() === "true" || value === "1"
  }

  async getJSON<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const value = await this.get(key)
    if (value === undefined) return defaultValue
    
    try {
      return JSON.parse(value) as T
    } catch (error) {
      console.error(`Error parsing JSON config ${key}:`, error)
      return defaultValue
    }
  }

  async getAll(): Promise<ConfigItem[]> {
    try {
      const configs = await db.configuration.findMany({
        orderBy: {
          key: "asc"
        }
      })

      // Update cache
      configs.forEach(config => {
        this.cache.set(config.key, config.value)
      })

      return configs
    } catch (error) {
      console.error("Error getting all configs:", error)
      return []
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await db.configuration.delete({
        where: { key }
      })

      // Remove from cache
      this.cache.delete(key)
    } catch (error) {
      console.error(`Error deleting config ${key}:`, error)
      throw new Error(`Failed to delete config ${key}`)
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const config = await db.configuration.findUnique({
        where: { key }
      })
      return config !== null
    } catch (error) {
      console.error(`Error checking config existence ${key}:`, error)
      return false
    }
  }

  clearCache(): void {
    this.cache.clear()
  }

  // Predefined configuration keys
  static get KEYS() {
    return {
      // Email settings
      EMAIL_RECIPIENTS: "email_recipients",
      EMAIL_LOW_STOCK_THRESHOLD: "email_low_stock_threshold",
      EMAIL_SYNC_REPORTS_ENABLED: "email_sync_reports_enabled",
      
      // Sync settings
      SYNC_AUTO_ENABLED: "sync_auto_enabled",
      SYNC_INTERVAL_HOURS: "sync_interval_hours",
      SYNC_LOW_STOCK_THRESHOLD: "sync_low_stock_threshold",
      
      // Shopify settings
      SHOPIFY_STORE_NAME: "shopify_store_name",
      SHOPIFY_ACCESS_TOKEN: "shopify_access_token",
      
      // Google Sheets settings
      GOOGLE_SHEETS_ENABLED: "google_sheets_enabled",
      GOOGLE_SHEETS_FOLDER_ID: "google_sheets_folder_id",
      
      // General settings
      APP_NAME: "app_name",
      TIMEZONE: "timezone",
      DATE_FORMAT: "date_format"
    } as const
  }
}