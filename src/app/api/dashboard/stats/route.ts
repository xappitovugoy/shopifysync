import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Get total products count
    const totalProducts = await db.product.count()
    
    // Get low stock count (products with quantity <= 10)
    const lowStockCount = await db.product.count({
      where: {
        quantity: {
          lte: 10
        }
      }
    })
    
    // Calculate total wholesale value
    const products = await db.product.findMany({
      select: {
        wholesaleCost: true,
        quantity: true
      }
    })
    
    const totalValue = products.reduce((sum, product) => {
      return sum + ((product.wholesaleCost || 0) * product.quantity)
    }, 0)
    
    // Get last sync status
    const lastSync = await db.syncLog.findFirst({
      orderBy: {
        createdAt: "desc"
      }
    })
    
    const lastSyncTime = lastSync 
      ? new Date(lastSync.createdAt).toLocaleDateString()
      : "Never"
    
    const syncStatus = lastSync?.status || "pending"

    return NextResponse.json({
      totalProducts,
      lowStockCount,
      totalValue: Math.round(totalValue),
      lastSync: lastSyncTime,
      syncStatus
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}