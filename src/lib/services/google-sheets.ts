import { google } from "googleapis"
import { db } from "@/lib/db"

export class GoogleSheetsService {
  private sheets: any
  private auth: any

  constructor() {
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    })

    this.sheets = google.sheets({ version: "v4", auth: this.auth })
  }

  async createSpreadsheet(title: string): Promise<string> {
    try {
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title
          },
          sheets: [
            {
              properties: {
                title: "Inventory",
                gridProperties: {
                  frozenRowCount: 1
                }
              }
            }
          ]
        }
      })

      return spreadsheet.data.spreadsheetId
    } catch (error) {
      console.error("Error creating spreadsheet:", error)
      throw new Error("Failed to create Google Sheet")
    }
  }

  async exportToSheet(spreadsheetId: string, sheetName: string = "Inventory"): Promise<void> {
    try {
      // Get products from database
      const products = await db.product.findMany({
        orderBy: {
          createdAt: "desc"
        }
      })

      if (products.length === 0) {
        throw new Error("No products to export")
      }

      // Prepare headers
      const headers = [
        "SKU",
        "Title",
        "Description",
        "Quantity",
        "Wholesale Cost",
        "Price",
        "Weight",
        "Status",
        "Vendor",
        "Product Type",
        "Last Synced"
      ]

      // Prepare data rows
      const rows = products.map(product => [
        product.sku || "",
        product.title,
        product.description || "",
        product.quantity,
        product.wholesaleCost || 0,
        product.price || 0,
        product.weight || 0,
        product.status,
        product.vendor || "",
        product.productType || "",
        product.lastSyncedAt ? new Date(product.lastSyncedAt).toLocaleDateString() : ""
      ])

      // Update the sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headers, ...rows]
        }
      })

      // Format the header row
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: headers.length
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.8,
                      green: 0.8,
                      blue: 0.8
                    },
                    textFormat: {
                      bold: true
                    }
                  }
                },
                fields: "userEnteredFormat(backgroundColor,textFormat)"
              }
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: "COLUMNS"
                }
              }
            }
          ]
        }
      })
    } catch (error) {
      console.error("Error exporting to Google Sheet:", error)
      throw new Error("Failed to export to Google Sheet")
    }
  }

  async getSpreadsheetUrl(spreadsheetId: string): Promise<string> {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
  }

  async exportLowStockToSheet(threshold: number = 10): Promise<string> {
    try {
      // Get low stock products
      const products = await db.product.findMany({
        where: {
          quantity: {
            lte: threshold
          }
        },
        orderBy: {
          quantity: "asc"
        }
      })

      if (products.length === 0) {
        throw new Error("No low stock products to export")
      }

      // Create a new spreadsheet for low stock items
      const spreadsheetId = await this.createSpreadsheet(`Low Stock Inventory - ${new Date().toLocaleDateString()}`)
      
      // Prepare headers
      const headers = [
        "SKU",
        "Title",
        "Current Quantity",
        "Wholesale Cost",
        "Price",
        "Vendor",
        "Product Type",
        "Last Synced"
      ]

      // Prepare data rows
      const rows = products.map(product => [
        product.sku || "",
        product.title,
        product.quantity,
        product.wholesaleCost || 0,
        product.price || 0,
        product.vendor || "",
        product.productType || "",
        product.lastSyncedAt ? new Date(product.lastSyncedAt).toLocaleDateString() : ""
      ])

      // Update the sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headers, ...rows]
        }
      })

      // Format the sheet
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: headers.length
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 1.0,
                      green: 0.9,
                      blue: 0.9
                    },
                    textFormat: {
                      bold: true
                    }
                  }
                },
                fields: "userEnteredFormat(backgroundColor,textFormat)"
              }
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: "COLUMNS"
                }
              }
            }
          ]
        }
      })

      return await this.getSpreadsheetUrl(spreadsheetId)
    } catch (error) {
      console.error("Error exporting low stock to Google Sheet:", error)
      throw new Error("Failed to export low stock to Google Sheet")
    }
  }
}