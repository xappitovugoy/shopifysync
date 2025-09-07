import { NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/services/auth"

export function withAuth(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get("authorization")
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Missing or invalid authorization header" },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      const user = await AuthService.getCurrentUser(token)

      if (!user) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        )
      }

      if (!user.isActive) {
        return NextResponse.json(
          { error: "Account is deactivated" },
          { status: 403 }
        )
      }

      return await handler(req, user)
    } catch (error) {
      console.error("Authentication error:", error)
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      )
    }
  }
}

export function withAdminAuth(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get("authorization")
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Missing or invalid authorization header" },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      const user = await AuthService.getCurrentUser(token)

      if (!user) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        )
      }

      if (!user.isActive) {
        return NextResponse.json(
          { error: "Account is deactivated" },
          { status: 403 }
        )
      }

      if (user.role !== "admin") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        )
      }

      return await handler(req, user)
    } catch (error) {
      console.error("Authentication error:", error)
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      )
    }
  }
}