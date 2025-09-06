import { NextRequest, NextResponse } from "next/server"
import { ConfigService } from "@/lib/services/config"

const configService = ConfigService.getInstance()

export async function GET() {
  try {
    const configs = await configService.getAll()
    return NextResponse.json(configs)
  } catch (error) {
    console.error("Error getting configurations:", error)
    return NextResponse.json(
      { error: "Failed to get configurations" },
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

    await configService.set(key, value, description)
    
    return NextResponse.json({ 
      message: "Configuration updated successfully",
      key,
      value 
    })
  } catch (error) {
    console.error("Error updating configuration:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update configuration" },
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

    await configService.delete(key)
    
    return NextResponse.json({ 
      message: "Configuration deleted successfully",
      key 
    })
  } catch (error) {
    console.error("Error deleting configuration:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete configuration" },
      { status: 500 }
    )
  }
}