import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const configurations = await db.configuration.findMany({
      orderBy: {
        key: "asc"
      }
    })

    return NextResponse.json(configurations)
  } catch (error) {
    console.error("Error fetching configurations:", error)
    return NextResponse.json(
      { error: "Failed to fetch configurations" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, value, description } = await request.json()

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
        updatedAt: new Date()
      },
      create: {
        key,
        value: value.toString(),
        description
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
}

export async function PUT(request: NextRequest) {
  try {
    const { key, value, description } = await request.json()

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
}

export async function DELETE(request: NextRequest) {
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
}