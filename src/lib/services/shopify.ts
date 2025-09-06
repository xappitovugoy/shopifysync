import axios from "axios"
import { db } from "@/lib/db"

export interface ShopifyProduct {
  id: number
  title: string
  body_html?: string
  vendor?: string
  product_type?: string
  tags?: string
  variants: ShopifyVariant[]
  images: ShopifyImage[]
  created_at: string
  updated_at: string
}

export interface ShopifyVariant {
  id: number
  product_id: number
  title: string
  sku?: string
  price: string
  weight?: number
  weight_unit?: string
  inventory_quantity: number
  inventory_item_id: number
}

export interface ShopifyImage {
  id: number
  product_id: number
  src: string
  position: number
}

export class ShopifyService {
  private shopifyStore: string
  private accessToken: string
  private apiVersion: string = "2024-01"

  constructor() {
    this.shopifyStore = process.env.SHOPIFY_STORE_NAME || ""
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || ""
    
    if (!this.shopifyStore || !this.accessToken) {
      throw new Error("Shopify credentials not configured")
    }
  }

  private get baseUrl() {
    return `https://${this.shopifyStore}.myshopify.com/admin/api/${this.apiVersion}`
  }

  private get headers() {
    return {
      "X-Shopify-Access-Token": this.accessToken,
      "Content-Type": "application/json"
    }
  }

  async getProducts(limit: number = 250, page: number = 1): Promise<ShopifyProduct[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/products.json`, {
        headers: this.headers,
        params: {
          limit,
          page,
          fields: "id,title,body_html,vendor,product_type,tags,variants,images,created_at,updated_at"
        }
      })

      return response.data.products
    } catch (error) {
      console.error("Error fetching Shopify products:", error)
      throw new Error("Failed to fetch products from Shopify")
    }
  }

  async getAllProducts(): Promise<ShopifyProduct[]> {
    try {
      let allProducts: ShopifyProduct[] = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const products = await this.getProducts(250, page)
        
        if (products.length === 0) {
          hasMore = false
        } else {
          allProducts = [...allProducts, ...products]
          page++
        }
      }

      return allProducts
    } catch (error) {
      console.error("Error fetching all Shopify products:", error)
      throw new Error("Failed to fetch all products from Shopify")
    }
  }

  async syncProducts(): Promise<{ synced: number, updated: number, failed: number }> {
    try {
      const shopifyProducts = await this.getAllProducts()
      let synced = 0
      let updated = 0
      let failed = 0

      for (const shopifyProduct of shopifyProducts) {
        try {
          // Get the first variant for main product data
          const mainVariant = shopifyProduct.variants[0] || {
            id: 0,
            product_id: shopifyProduct.id,
            title: "Default",
            sku: "",
            price: "0",
            weight: 0,
            weight_unit: "kg",
            inventory_quantity: 0,
            inventory_item_id: 0
          }

          // Check if product already exists
          const existingProduct = await db.product.findUnique({
            where: { shopifyId: shopifyProduct.id.toString() }
          })

          const productData = {
            shopifyId: shopifyProduct.id.toString(),
            sku: mainVariant.sku || null,
            title: shopifyProduct.title,
            description: shopifyProduct.body_html || null,
            weight: mainVariant.weight || null,
            quantity: mainVariant.inventory_quantity,
            wholesaleCost: null, // Will need to be calculated or set separately
            price: parseFloat(mainVariant.price) || null,
            imageUrl: shopifyProduct.images[0]?.src || null,
            tags: shopifyProduct.tags || null,
            vendor: shopifyProduct.vendor || null,
            productType: shopifyProduct.product_type || null,
            status: "active",
            lastSyncedAt: new Date()
          }

          if (existingProduct) {
            // Update existing product
            await db.product.update({
              where: { id: existingProduct.id },
              data: productData
            })
            updated++
          } else {
            // Create new product
            await db.product.create({
              data: productData
            })
            synced++
          }
        } catch (error) {
          console.error(`Error syncing product ${shopifyProduct.id}:`, error)
          failed++
        }
      }

      return { synced, updated, failed }
    } catch (error) {
      console.error("Error during product sync:", error)
      throw new Error("Failed to sync products")
    }
  }

  async getLowStockProducts(threshold: number = 10): Promise<ShopifyProduct[]> {
    try {
      const products = await this.getAllProducts()
      return products.filter(product => 
        product.variants.some(variant => variant.inventory_quantity <= threshold)
      )
    } catch (error) {
      console.error("Error fetching low stock products:", error)
      throw new Error("Failed to fetch low stock products")
    }
  }
}