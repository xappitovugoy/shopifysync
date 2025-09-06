import { NextRequest, NextResponse } from "next/server"
import { GoogleSheetsService } from "@/lib/services/google-sheets"

export async function POST(request: NextRequest) {
  try {
    const { type = "inventory", threshold = 10 } = await request.json()

    const googleSheetsService = new GoogleSheetsService()

    let result: { url?: string; message: string }

    if (type === "low-stock") {
      const url = await googleSheetsService.exportLowStockToSheet(threshold)
      result = {
        url,
        message: "Low stock inventory exported to Google Sheets successfully"
      }
    } else {
      // For full inventory export, we need to create a new spreadsheet
      const spreadsheetId = await googleSheetsService.createSpreadsheet(
        `Inventory Export - ${new Date().toLocaleDateString()}`
      )
      
      await googleSheetsService.exportToSheet(spreadsheetId)
      
      const url = await googleSheetsService.getSpreadsheetUrl(spreadsheetId)
      result = {
        url,
        message: "Inventory exported to Google Sheets successfully"
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error exporting to Google Sheets:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export to Google Sheets" },
      { status: 500 }
    )
  }
}