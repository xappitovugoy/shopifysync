import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdminAuth } from "@/lib/middleware/auth"

export async function GET() {
  try {
    const configurations = await db.configuration.findMany({
      orderBy: [
        { category: "asc" },
        { key: "asc" }
      ]
    })

    // Group by category
    const grouped = configurations.reduce((acc, config) => {
      if (!acc[config.category]) {
        acc[config.category] = []
      }
      acc[config.category].push(config)
      return acc
    }, {} as Record<string, typeof configurations>)

    return NextResponse.json(grouped)
  } catch (error) {
    console.error("Error fetching configurations:", error)
    return NextResponse.json(
      { error: "Failed to fetch configurations" },
      { status: 500 }
    )
  }
}

export const POST = withAdminAuth(async (request: NextRequest, user) => {
  try {
    const { key, value, description, category, isSensitive } = await request.json()

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      )
    }

    const configuration = await db.configuration.upsert({
      where: { key },
      update: {
        value: value.toString(),
        description,
        category: category || "general",
        isSensitive: isSensitive || false,
        updatedAt: new Date()
      },
      create: {
        key,
        value: value.toString(),
        description,
        category: category || "general",
        isSensitive: isSensitive || false
      }
    })

    return NextResponse.json(configuration)
  } catch (error) {
    console.error("Error creating/updating configuration:", error)
    return NextResponse.json(
      { error: "Failed to create/update configuration" },
      { status: 500 }
    )
  }
})

export const PUT = withAdminAuth(async (request: NextRequest, user) => {
  try {
    const { key, value, description, category, isSensitive } = await request.json()

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      )
    }

    const configuration = await db.configuration.update({
      where: { key },
      data: {
        value: value.toString(),
        description,
        category,
        isSensitive,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(configuration)
  } catch (error) {
    console.error("Error updating configuration:", error)
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    )
  }
})

export const DELETE = withAdminAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      )
    }

    await db.configuration.delete({
      where: { key }
    })

    return NextResponse.json({ message: "Configuration deleted successfully" })
  } catch (error) {
    console.error("Error deleting configuration:", error)
    return NextResponse.json(
      { error: "Failed to delete configuration" },
      { status: 500 }
    )
  }
})