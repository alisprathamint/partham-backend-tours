/**
 * Follow-up Reminder Scheduler
 * Uses node-cron to run every minute (cron: '* * * * *').
 * Checks for due tasks and pushes real-time reminder events
 * via SSE to the assigned user's browser.
 */
import cron from 'node-cron';
import prisma from '../config/prisma.js';
import { sendToUser } from './wsManager.js';

const checkAndPushReminders = async () => {
  try {
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find all tasks that:
    // 1. Are not completed
    // 2. Are due now or overdue (within last 24 hours to catch missed ones)
    // 3. Haven't had a reminder sent yet OR the snoozedUntil time has passed
    const dueTasks = await prisma.task.findMany({
      where: {
        isCompleted: false,
        dueDate: {
          gte: past24h,
          lte: now,
        },
        OR: [
          { reminderSent: false },
          {
            snoozedUntil: {
              lte: now,
            },
          },
        ],
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            type: true,
            status: true,
            destination: true,
          },
        },
      },
    });

    for (const task of dueTasks) {
      const targetUserId = task.assignedToId || task.createdBy;

      const payload = {
        taskId: task.id,
        title: task.title,
        note: task.note,
        dueDate: task.dueDate,
        lead: task.lead,
      };

      const sent = sendToUser(targetUserId, 'follow-up-reminder', payload);

      if (sent) {
        // Mark reminder as sent so we don't re-push on the next cron tick
        await prisma.task.update({
          where: { id: task.id },
          data: { reminderSent: true },
        });
        console.log(`[Cron] Reminder sent to user ${targetUserId} for task ${task.id}`);
      }
    }
  } catch (err) {
    console.error('[Cron] Error checking follow-up reminders:', err.message);
  }
};

export const startReminderScheduler = () => {
  // Cron expression: '* * * * *' = runs at every minute (minute hour day month weekday)
  cron.schedule('* * * * *', checkAndPushReminders, {
    scheduled: true,
    timezone: 'Asia/Kolkata', // IST
  });

  console.log('[Cron] Follow-up reminder scheduler started — running every minute (IST).');
};
