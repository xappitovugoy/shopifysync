import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: {
        createdAt: "desc"
      }
    })

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No products to export" },
        { status: 404 }
      )
    }

    // Generate CSV content
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

    const csvContent = [
      headers.join(","),
      ...products.map(product => [
        product.sku || "",
        `"${product.title.replace(/"/g, '""')}"`,
        `"${(product.description || "").replace(/"/g, '""')}"`,
        product.quantity,
        product.wholesaleCost || 0,
        product.price || 0,
        product.weight || 0,
        product.status,
        `"${(product.vendor || "").replace(/"/g, '""')}"`,
        `"${(product.productType || "").replace(/"/g, '""')}"`,
        product.lastSyncedAt ? new Date(product.lastSyncedAt).toLocaleDateString() : ""
      ].join(","))
    ].join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="inventory-${new Date().toISOString().split("T")[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("Error generating CSV:", error)
    return NextResponse.json(
      { error: "Failed to generate CSV" },
      { status: 500 }
    )
  }
}