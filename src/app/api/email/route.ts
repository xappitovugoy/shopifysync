import { NextRequest, NextResponse } from "next/server"
import { EmailService } from "@/lib/services/email"

export async function POST(request: NextRequest) {
  try {
    const { type, threshold = 10, syncId } = await request.json()
    
    const emailService = new EmailService()
    
    let result
    
    switch (type) {
      case "low_stock":
        result = await emailService.sendLowStockAlert(threshold)
        break
      case "sync_report":
        if (!syncId) {
          return NextResponse.json(
            { error: "Sync ID is required for sync report" },
            { status: 400 }
          )
        }
        result = await emailService.sendSyncReport(syncId)
        break
      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    )
  }
}