import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const recentSyncs = await db.syncLog.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 10, // Get last 10 sync operations
      select: {
        id: true,
        operation: true,
        status: true,
        productsCount: true,
        createdAt: true
      }
    })

    return NextResponse.json(recentSyncs)
  } catch (error) {
    console.error("Error fetching recent syncs:", error)
    return NextResponse.json(
      { error: "Failed to fetch recent syncs" },
      { status: 500 }
    )
  }
}