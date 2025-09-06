import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ShopifyService } from "@/lib/services/shopify"
import { EmailService } from "@/lib/services/email"

export async function POST() {
  try {
    // Create a sync log entry
    const syncLog = await db.syncLog.create({
      data: {
        operation: "manual",
        status: "pending",
        productsCount: 0
      }
    })

    const startTime = Date.now()

    try {
      // Initialize Shopify service
      const shopifyService = new ShopifyService()
      
      // Perform sync
      const result = await shopifyService.syncProducts()
      
      const duration = Date.now() - startTime
      const totalProducts = result.synced + result.updated

      // Update sync log to completed
      await db.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "completed",
          productsCount: totalProducts,
          duration,
          metadata: JSON.stringify({
            synced: result.synced,
            updated: result.updated,
            failed: result.failed
          })
        }
      })

      // Send email notification
      try {
        const emailService = new EmailService()
        await emailService.sendSyncReport(syncLog.id)
      } catch (emailError) {
        console.error("Failed to send sync report email:", emailError)
        // Don't fail the sync if email fails
      }

      return NextResponse.json({ 
        message: "Sync completed successfully",
        syncId: syncLog.id,
        result
      })
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Update sync log to failed
      await db.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          duration,
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        }
      })

      // Try to send error email notification
      try {
        const emailService = new EmailService()
        await emailService.sendSyncReport(syncLog.id)
      } catch (emailError) {
        console.error("Failed to send error sync report email:", emailError)
        // Don't fail the sync if email fails
      }

      throw error
    }
  } catch (error) {
    console.error("Error during sync:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    )
  }
}