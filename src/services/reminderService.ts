// src/services/reminderService.ts
import { db } from '../db/database';
import { getTodayDateString, completeTask } from './taskService';
import type { ScheduledTask, TaskType } from '../types';

export interface ReminderItem {
  id: number;
  taskId: number;
  batchId: number;
  batchName: string;
  speciesIcon: string;
  titleAr: string;
  titleEn: string;
  description: string | null;
  taskType: TaskType;
  dueDate: string;
  reminderTime: string;
  isOverdue: boolean;
  isToday: boolean;
  status: 'overdue' | 'today';
}

export interface ReminderSummary {
  overdueCount: number;
  todayCount: number;
  totalCount: number;
  reminders: ReminderItem[];
}

/**
 * Pure calculation function: given tasks and the reference date,
 * returns deduped reminders sorted by priority (overdue first, then by time).
 * Decoupled from UI and storage, suitable for future Option B push workers.
 */
export function calculateReminders(
  tasks: ScheduledTask[],
  todayStr: string = getTodayDateString()
): ReminderSummary {
  const seenTaskIds = new Set<number>();
  const reminders: ReminderItem[] = [];

  for (const task of tasks) {
    if (task.status !== 'pending') continue;
    if (seenTaskIds.has(task.id)) continue;

    const effectiveDate = task.postponed_to || task.scheduled_date;
    const isOverdue = effectiveDate < todayStr;
    const isToday = effectiveDate === todayStr;

    if (isOverdue || isToday) {
      seenTaskIds.add(task.id);
      reminders.push({
        id: task.id,
        taskId: task.id,
        batchId: task.batch_id,
        batchName: task.batch_name || '—',
        speciesIcon: task.species_icon || '🐔',
        titleAr: task.title_ar,
        titleEn: task.title_en || task.title_ar,
        description: task.description,
        taskType: task.task_type,
        dueDate: effectiveDate,
        reminderTime: task.reminder_time,
        isOverdue,
        isToday,
        status: isOverdue ? 'overdue' : 'today',
      });
    }
  }

  // Sort: overdue first (ascending date), then today (ascending reminderTime)
  reminders.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    const dateComp = a.dueDate.localeCompare(b.dueDate);
    if (dateComp !== 0) return dateComp;
    return a.reminderTime.localeCompare(b.reminderTime);
  });

  const overdueCount = reminders.filter(r => r.isOverdue).length;
  const todayCount = reminders.filter(r => r.isToday).length;

  return {
    overdueCount,
    todayCount,
    totalCount: reminders.length,
    reminders,
  };
}

/**
 * Fetches all pending tasks and calculates active reminders.
 */
export async function getActiveReminders(): Promise<ReminderSummary> {
  const [tasks, batches, species] = await Promise.all([
    db.scheduled_tasks.where('status').equals('pending').toArray(),
    db.batches.toArray(),
    db.species.toArray(),
  ]);

  const batchMap = new Map(batches.map(b => [b.id, b]));
  const speciesMap = new Map(species.map(s => [s.id, s]));

  const enrichedTasks: ScheduledTask[] = tasks.map(t => {
    const b = batchMap.get(t.batch_id);
    const s = b ? speciesMap.get(b.species_id) : undefined;
    return {
      ...t,
      batch_name: b?.name,
      species_icon: s?.icon ?? '🐔',
    };
  });

  return calculateReminders(enrichedTasks);
}

/**
 * Mark a reminder completed directly from the in-app reminders UI.
 */
export async function markReminderCompleted(taskId: number): Promise<void> {
  await completeTask(taskId);
}
