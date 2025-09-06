import cron from "node-cron"
import { ShopifyService } from "./shopify"
import { EmailService } from "./email"
import { db } from "@/lib/db"

export class TaskScheduler {
  private static instance: TaskScheduler
  private jobs: Map<string, cron.ScheduledTask> = new Map()

  private constructor() {}

  static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler()
    }
    return TaskScheduler.instance
  }

  start() {
    console.log("Starting task scheduler...")
    
    // Schedule automatic sync every 6 hours
    this.scheduleSync("0 */6 * * *", "auto-sync-6h")
    
    // Schedule low stock alert every day at 9 AM
    this.scheduleLowStockAlert("0 9 * * *", "low-stock-daily")
    
    // Schedule cleanup of old sync logs every week
    this.scheduleCleanup("0 2 * * 0", "cleanup-weekly")
    
    console.log("Task scheduler started successfully")
  }

  stop() {
    console.log("Stopping task scheduler...")
    
    this.jobs.forEach((job, name) => {
      job.stop()
      console.log(`Stopped job: ${name}`)
    })
    
    this.jobs.clear()
    console.log("Task scheduler stopped")
  }

  private scheduleSync(cronExpression: string, jobName: string) {
    if (this.jobs.has(jobName)) {
      console.log(`Job ${jobName} already exists, skipping...`)
      return
    }

    const job = cron.schedule(cronExpression, async () => {
      console.log(`Starting scheduled sync: ${jobName}`)
      
      try {
        // Create sync log entry
        const syncLog = await db.syncLog.create({
          data: {
            operation: "scheduled",
            status: "pending",
            productsCount: 0
          }
        })

        const startTime = Date.now()

        try {
          const shopifyService = new ShopifyService()
          const result = await shopifyService.syncProducts()
          
          const duration = Date.now() - startTime
          const totalProducts = result.synced + result.updated

          await db.syncLog.update({
            where: { id: syncLog.id },
            data: {
              status: "completed",
              productsCount: totalProducts,
              duration,
              metadata: JSON.stringify({
                synced: result.synced,
                updated: result.updated,
                failed: result.failed
              })
            }
          })

          // Send email notification
          try {
            const emailService = new EmailService()
            await emailService.sendSyncReport(syncLog.id)
          } catch (emailError) {
            console.error("Failed to send sync report email:", emailError)
          }

          console.log(`Scheduled sync completed: ${jobName}`, result)
        } catch (error) {
          const duration = Date.now() - startTime
          
          await db.syncLog.update({
            where: { id: syncLog.id },
            data: {
              status: "failed",
              duration,
              errorMessage: error instanceof Error ? error.message : "Unknown error"
            }
          })

          console.error(`Scheduled sync failed: ${jobName}`, error)
        }
      } catch (error) {
        console.error(`Error in scheduled sync ${jobName}:`, error)
      }
    }, {
      scheduled: false,
      timezone: "UTC"
    })

    job.start()
    this.jobs.set(jobName, job)
    console.log(`Scheduled job started: ${jobName}`)
  }

  private scheduleLowStockAlert(cronExpression: string, jobName: string) {
    if (this.jobs.has(jobName)) {
      console.log(`Job ${jobName} already exists, skipping...`)
      return
    }

    const job = cron.schedule(cronExpression, async () => {
      console.log(`Starting scheduled low stock alert: ${jobName}`)
      
      try {
        const emailService = new EmailService()
        const result = await emailService.sendLowStockAlert(10)
        
        console.log(`Scheduled low stock alert completed: ${jobName}`, result)
      } catch (error) {
        console.error(`Error in scheduled low stock alert ${jobName}:`, error)
      }
    }, {
      scheduled: false,
      timezone: "UTC"
    })

    job.start()
    this.jobs.set(jobName, job)
    console.log(`Scheduled job started: ${jobName}`)
  }

  private scheduleCleanup(cronExpression: string, jobName: string) {
    if (this.jobs.has(jobName)) {
      console.log(`Job ${jobName} already exists, skipping...`)
      return
    }

    const job = cron.schedule(cronExpression, async () => {
      console.log(`Starting scheduled cleanup: ${jobName}`)
      
      try {
        // Delete sync logs older than 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const deletedSyncLogs = await db.syncLog.deleteMany({
          where: {
            createdAt: {
              lt: thirtyDaysAgo
            }
          }
        })

        // Delete email logs older than 30 days
        const deletedEmailLogs = await db.emailLog.deleteMany({
          where: {
            createdAt: {
              lt: thirtyDaysAgo
            }
          }
        })

        console.log(`Scheduled cleanup completed: ${jobName}`, {
          deletedSyncLogs: deletedSyncLogs.count,
          deletedEmailLogs: deletedEmailLogs.count
        })
      } catch (error) {
        console.error(`Error in scheduled cleanup ${jobName}:`, error)
      }
    }, {
      scheduled: false,
      timezone: "UTC"
    })

    job.start()
    this.jobs.set(jobName, job)
    console.log(`Scheduled job started: ${jobName}`)
  }

  getJobStatus(): { name: string; running: boolean }[] {
    return Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: job.running
    }))
  }

  restartJob(jobName: string): boolean {
    const job = this.jobs.get(jobName)
    if (job) {
      job.stop()
      job.start()
      console.log(`Restarted job: ${jobName}`)
      return true
    }
    return false
  }
}