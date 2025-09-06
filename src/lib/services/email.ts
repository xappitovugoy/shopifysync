import nodemailer from "nodemailer"
import { db } from "@/lib/db"

export interface EmailOptions {
  to: string
  subject: string
  body: string
  type: "low_stock" | "sync_report" | "manual"
}

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Log email attempt
      const emailLog = await db.emailLog.create({
        data: {
          to: options.to,
          subject: options.subject,
          body: options.body,
          status: "pending",
          type: options.type
        }
      })

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.body
      }

      const result = await this.transporter.sendMail(mailOptions)

      // Update email log to sent
      await db.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: "sent"
        }
      })

      return {
        success: true,
        message: "Email sent successfully"
      }
    } catch (error) {
      console.error("Error sending email:", error)
      
      // Update email log to failed
      await db.emailLog.create({
        data: {
          to: options.to,
          subject: options.subject,
          body: options.body,
          status: "failed",
          type: options.type,
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        }
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email"
      }
    }
  }

  async sendLowStockAlert(threshold: number = 10): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const lowStockProducts = await db.product.findMany({
        where: {
          quantity: {
            lte: threshold
          }
        },
        orderBy: {
          quantity: "asc"
        },
        take: 20 // Limit to top 20 low stock items
      })

      if (lowStockProducts.length === 0) {
        return {
          success: true,
          message: "No low stock items to report"
        }
      }

      const subject = `🚨 Low Stock Alert - ${lowStockProducts.length} items need restocking`
      
      const body = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .product { border: 1px solid #e9ecef; padding: 15px; margin-bottom: 10px; border-radius: 5px; }
              .product-title { font-weight: bold; color: #495057; margin-bottom: 5px; }
              .product-details { color: #6c757d; font-size: 14px; }
              .low-quantity { color: #dc3545; font-weight: bold; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Low Stock Alert</h1>
              <p>The following ${lowStockProducts.length} products have low inventory levels and need attention:</p>
            </div>
            
            ${lowStockProducts.map(product => `
              <div class="product">
                <div class="product-title">${product.title}</div>
                <div class="product-details">
                  <div>SKU: ${product.sku || "N/A"}</div>
                  <div>Current Quantity: <span class="low-quantity">${product.quantity}</span></div>
                  <div>Price: $${product.price || "N/A"}</div>
                  <div>Vendor: ${product.vendor || "N/A"}</div>
                </div>
              </div>
            `).join("")}
            
            <div class="footer">
              <p>This is an automated notification from your inventory management system.</p>
              <p>Please restock these items soon to avoid stockouts.</p>
            </div>
          </body>
        </html>
      `

      // Get email recipients from configuration or use a default
      const recipients = await this.getEmailRecipients()
      
      if (recipients.length === 0) {
        return {
          success: false,
          error: "No email recipients configured"
        }
      }

      // Send email to all recipients
      const results = await Promise.all(
        recipients.map(recipient => 
          this.sendEmail({
            to: recipient,
            subject,
            body,
            type: "low_stock"
          })
        )
      )

      const failedEmails = results.filter(r => !r.success)
      
      if (failedEmails.length > 0) {
        return {
          success: false,
          error: `Failed to send ${failedEmails.length} out of ${recipients.length} emails`
        }
      }

      return {
        success: true,
        message: `Low stock alert sent to ${recipients.length} recipients`
      }
    } catch (error) {
      console.error("Error sending low stock alert:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send low stock alert"
      }
    }
  }

  async sendSyncReport(syncId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const syncLog = await db.syncLog.findUnique({
        where: { id: syncId }
      })

      if (!syncLog) {
        return {
          success: false,
          error: "Sync log not found"
        }
      }

      const subject = `Sync Report - ${syncLog.operation} ${syncLog.status.toUpperCase()}`
      
      const body = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .status { padding: 10px; border-radius: 5px; margin-bottom: 15px; }
              .status-completed { background-color: #d4edda; color: #155724; }
              .status-failed { background-color: #f8d7da; color: #721c24; }
              .details { border: 1px solid #e9ecef; padding: 15px; border-radius: 5px; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Sync Report</h1>
              <p>Inventory synchronization completed at ${new Date(syncLog.createdAt).toLocaleString()}</p>
            </div>
            
            <div class="status ${syncLog.status === "completed" ? "status-completed" : "status-failed"}">
              <strong>Status:</strong> ${syncLog.status.toUpperCase()}
            </div>
            
            <div class="details">
              <p><strong>Operation:</strong> ${syncLog.operation}</p>
              <p><strong>Products Processed:</strong> ${syncLog.productsCount}</p>
              ${syncLog.duration ? `<p><strong>Duration:</strong> ${syncLog.duration}ms</p>` : ""}
              ${syncLog.errorMessage ? `<p><strong>Error:</strong> ${syncLog.errorMessage}</p>` : ""}
            </div>
            
            ${syncLog.metadata ? `
              <div class="details">
                <h3>Detailed Results:</h3>
                ${JSON.parse(syncLog.metadata).synced ? `<p>✓ New products: ${JSON.parse(syncLog.metadata).synced}</p>` : ""}
                ${JSON.parse(syncLog.metadata).updated ? `<p>✓ Updated products: ${JSON.parse(syncLog.metadata).updated}</p>` : ""}
                ${JSON.parse(syncLog.metadata).failed ? `<p>✗ Failed products: ${JSON.parse(syncLog.metadata).failed}</p>` : ""}
              </div>
            ` : ""}
            
            <div class="footer">
              <p>This is an automated notification from your inventory management system.</p>
            </div>
          </body>
        </html>
      `

      const recipients = await this.getEmailRecipients()
      
      if (recipients.length === 0) {
        return {
          success: false,
          error: "No email recipients configured"
        }
      }

      const results = await Promise.all(
        recipients.map(recipient => 
          this.sendEmail({
            to: recipient,
            subject,
            body,
            type: "sync_report"
          })
        )
      )

      const failedEmails = results.filter(r => !r.success)
      
      if (failedEmails.length > 0) {
        return {
          success: false,
          error: `Failed to send ${failedEmails.length} out of ${recipients.length} emails`
        }
      }

      return {
        success: true,
        message: `Sync report sent to ${recipients.length} recipients`
      }
    } catch (error) {
      console.error("Error sending sync report:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send sync report"
      }
    }
  }

  private async getEmailRecipients(): Promise<string[]> {
    try {
      // Get email recipients from configuration
      const emailConfig = await db.configuration.findUnique({
        where: { key: "email_recipients" }
      })

      if (emailConfig?.value) {
        return emailConfig.value.split(",").map(email => email.trim())
      }

      // Return default recipient if no configuration found
      const defaultEmail = process.env.EMAIL_USER
      return defaultEmail ? [defaultEmail] : []
    } catch (error) {
      console.error("Error getting email recipients:", error)
      return []
    }
  }
}