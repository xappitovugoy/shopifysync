import { NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/services/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    const result = await AuthService.register({
      email,
      password,
      name,
      role: role || "admin"
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Registration error:", error)
    
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    )
  }
}