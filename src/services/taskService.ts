// src/services/taskService.ts
import { db } from '../db/database';
import type { ScheduledTask, TaskFormData } from '../types';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

async function enrichTasks(tasks: ScheduledTask[]): Promise<ScheduledTask[]> {
  const [batches, species] = await Promise.all([
    db.batches.toArray(),
    db.species.toArray(),
  ]);

  const batchMap = new Map(batches.map(b => [b.id, b]));
  const speciesMap = new Map(species.map(s => [s.id, s]));

  return tasks.map(t => {
    const b = batchMap.get(t.batch_id);
    const s = b ? speciesMap.get(b.species_id) : undefined;
    return {
      ...t,
      batch_name: b?.name,
      species_icon: s?.icon ?? '🐔',
    };
  });
}

export async function getTasksForBatch(batchId: number): Promise<ScheduledTask[]> {
  const tasks = await db.scheduled_tasks
    .where('batch_id')
    .equals(batchId)
    .toArray();

  tasks.sort((a, b) => {
    const dateA = a.postponed_to || a.scheduled_date;
    const dateB = b.postponed_to || b.scheduled_date;
    const dateComp = dateA.localeCompare(dateB);
    if (dateComp !== 0) return dateComp;
    return (a.reminder_time || '').localeCompare(b.reminder_time || '');
  });

  return enrichTasks(tasks);
}

export async function getTodayTasks(): Promise<ScheduledTask[]> {
  const today = getTodayDateString();
  const tasks = await db.scheduled_tasks
    .filter(t => {
      if (t.status !== 'pending') return false;
      const effectiveDate = t.postponed_to || t.scheduled_date;
      return effectiveDate === today;
    })
    .toArray();

  tasks.sort((a, b) => (a.reminder_time || '').localeCompare(b.reminder_time || ''));
  return enrichTasks(tasks);
}

export async function getUpcomingTasks(days = 7): Promise<ScheduledTask[]> {
  const today = getTodayDateString();
  const future = new Date();
  future.setDate(future.getDate() + days);
  const futureYear = future.getFullYear();
  const futureMonth = String(future.getMonth() + 1).padStart(2, '0');
  const futureDay = String(future.getDate()).padStart(2, '0');
  const futureStr = `${futureYear}-${futureMonth}-${futureDay}`;

  const tasks = await db.scheduled_tasks
    .filter(t => {
      if (t.status !== 'pending') return false;
      const effectiveDate = t.postponed_to || t.scheduled_date;
      return effectiveDate > today && effectiveDate <= futureStr;
    })
    .toArray();

  tasks.sort((a, b) => {
    const dateA = a.postponed_to || a.scheduled_date;
    const dateB = b.postponed_to || b.scheduled_date;
    const dateComp = dateA.localeCompare(dateB);
    if (dateComp !== 0) return dateComp;
    return (a.reminder_time || '').localeCompare(b.reminder_time || '');
  });

  return enrichTasks(tasks);
}

export async function getOverdueTasks(): Promise<ScheduledTask[]> {
  const today = getTodayDateString();
  const tasks = await db.scheduled_tasks
    .filter(t => {
      if (t.status !== 'pending') return false;
      const effectiveDate = t.postponed_to || t.scheduled_date;
      return effectiveDate < today;
    })
    .toArray();

  tasks.sort((a, b) => {
    const dateA = a.postponed_to || a.scheduled_date;
    const dateB = b.postponed_to || b.scheduled_date;
    return dateA.localeCompare(dateB);
  });

  return enrichTasks(tasks);
}

export async function createTask(data: TaskFormData): Promise<number> {
  const id = await db.scheduled_tasks.add({
    batch_id: data.batch_id,
    task_type: data.task_type,
    title_ar: data.title_ar,
    title_en: data.title_en || data.title_ar,
    description: data.description ?? null,
    scheduled_date: data.scheduled_date,
    reminder_time: data.reminder_time || '07:00',
    status: 'pending',
    completed_at: null,
    postponed_to: null,
    notification_id: null,
    created_at: new Date().toISOString(),
  } as ScheduledTask);

  return id;
}

export async function updateTask(id: number, data: Partial<TaskFormData>): Promise<void> {
  const updates: Partial<ScheduledTask> = {};
  if (data.task_type !== undefined) updates.task_type = data.task_type;
  if (data.title_ar !== undefined) updates.title_ar = data.title_ar;
  if (data.title_en !== undefined) updates.title_en = data.title_en;
  if (data.description !== undefined) updates.description = data.description ?? null;
  if (data.scheduled_date !== undefined) updates.scheduled_date = data.scheduled_date;
  if (data.reminder_time !== undefined) updates.reminder_time = data.reminder_time;

  await db.scheduled_tasks.update(id, updates);
}

export async function completeTask(
  taskId: number,
  _notifId?: number | null,
  completedAt?: string
): Promise<void> {
  const finalCompletedAt = completedAt || new Date().toISOString();
  await db.scheduled_tasks.update(taskId, {
    status: 'done',
    completed_at: finalCompletedAt,
  });
}

export async function reopenTask(taskId: number): Promise<void> {
  await db.scheduled_tasks.update(taskId, {
    status: 'pending',
    completed_at: null,
  });
}

export async function postponeTask(
  taskId: number,
  newDate: string,
  _notifId?: number | null,
  reminderTime?: string,
  _titleAr?: string
): Promise<void> {
  const updates: Partial<ScheduledTask> = {
    status: 'pending',
    postponed_to: newDate,
  };
  if (reminderTime) {
    updates.reminder_time = reminderTime;
  }
  await db.scheduled_tasks.update(taskId, updates);
}

export async function deleteTask(taskId: number, _notifId?: number | null): Promise<void> {
  await db.scheduled_tasks.delete(taskId);
}

/**
 * Parses and formats any completed_at string gracefully.
 * Handles both ISO datetimes ("2026-11-05T14:30:00") and date-only strings ("2026-11-05").
 */
export function formatCompletionDateTime(completedAt: string | null | undefined): {
  date: string;
  time: string | null;
  formatted: string;
} {
  if (!completedAt) {
    return { date: '', time: null, formatted: '—' };
  }

  // If contains T or space, extract both date and time
  if (completedAt.includes('T')) {
    const [datePart, timePart] = completedAt.split('T');
    const time = timePart ? timePart.slice(0, 5) : null;
    return {
      date: datePart,
      time,
      formatted: time ? `${datePart} ${time}` : datePart,
    };
  }

  if (completedAt.includes(' ')) {
    const [datePart, timePart] = completedAt.split(' ');
    const time = timePart ? timePart.slice(0, 5) : null;
    return {
      date: datePart,
      time,
      formatted: time ? `${datePart} ${time}` : datePart,
    };
  }

  // Date-only legacy record
  return {
    date: completedAt,
    time: null,
    formatted: completedAt,
  };
}
