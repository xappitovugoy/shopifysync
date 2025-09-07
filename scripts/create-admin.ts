import { AuthService } from "@/lib/services/auth"

async function createDefaultAdmin() {
  try {
    await AuthService.createDefaultAdmin()
    console.log("Default admin user creation process completed")
    process.exit(0)
  } catch (error) {
    console.error("Error creating default admin:", error)
    process.exit(1)
  }
}

createDefaultAdmin()