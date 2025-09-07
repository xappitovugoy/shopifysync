import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { db } from "@/lib/db"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export interface User {
  id: string
  email: string
  name?: string
  role: string
  isActive: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name?: string
  role?: string
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  static generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    )
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return null
    }
  }

  static async register(data: RegisterData): Promise<{ user: User; token: string }> {
    const hashedPassword = await this.hashPassword(data.password)

    const user = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name || null,
        role: data.role || "admin"
      }
    })

    const token = this.generateToken(user)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      },
      token
    }
  }

  static async login(credentials: LoginCredentials): Promise<{ user: User; token: string } | null> {
    const user = await db.user.findUnique({
      where: { email: credentials.email }
    })

    if (!user || !user.isActive) {
      return null
    }

    const isPasswordValid = await this.comparePassword(credentials.password, user.password)
    if (!isPasswordValid) {
      return null
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    const token = this.generateToken(user)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      },
      token
    }
  }

  static async getCurrentUser(token: string): Promise<User | null> {
    try {
      const decoded = this.verifyToken(token)
      if (!decoded) {
        return null
      }

      const user = await db.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      })

      return user
    } catch (error) {
      return null
    }
  }

  static async createDefaultAdmin(): Promise<void> {
    const adminEmail = "admin@nepsync.com"
    const adminPassword = "admin123" // Change this in production!

    const existingAdmin = await db.user.findUnique({
      where: { email: adminEmail }
    })

    if (!existingAdmin) {
      const hashedPassword = await this.hashPassword(adminPassword)
      
      await db.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: "System Administrator",
          role: "admin"
        }
      })

      console.log("Default admin user created:")
      console.log(`Email: ${adminEmail}`)
      console.log(`Password: ${adminPassword}`)
      console.log("Please change the password after first login!")
    }
  }
}