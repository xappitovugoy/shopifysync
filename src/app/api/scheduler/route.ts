import { NextRequest, NextResponse } from "next/server"
import { TaskScheduler } from "@/lib/services/task-scheduler"

const scheduler = TaskScheduler.getInstance()

export async function GET() {
  try {
    const jobs = scheduler.getJobStatus()
    return NextResponse.json({ jobs })
  } catch (error) {
    console.error("Error getting scheduler status:", error)
    return NextResponse.json(
      { error: "Failed to get scheduler status" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, jobName } = await request.json()
    
    switch (action) {
      case "start":
        scheduler.start()
        return NextResponse.json({ message: "Scheduler started" })
      
      case "stop":
        scheduler.stop()
        return NextResponse.json({ message: "Scheduler stopped" })
      
      case "restart":
        if (jobName) {
          const success = scheduler.restartJob(jobName)
          if (success) {
            return NextResponse.json({ message: `Job ${jobName} restarted` })
          } else {
            return NextResponse.json(
              { error: `Job ${jobName} not found` },
              { status: 404 }
            )
          }
        } else {
          return NextResponse.json(
            { error: "Job name is required for restart action" },
            { status: 400 }
          )
        }
      
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error managing scheduler:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to manage scheduler" },
      { status: 500 }
    )
  }
}