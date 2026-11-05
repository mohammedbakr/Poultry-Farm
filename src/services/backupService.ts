// src/services/backupService.ts
import { db } from '../db/database';
import { getTodayDateString } from './taskService';
import type { Species, Batch, ScheduledTask, Expense } from '../types';

export const BACKUP_VERSION = 2;

export interface BackupPayload {
  version: number;
  appName: string;
  exportedAt: string;
  data: {
    species: Species[];
    batches: Batch[];
    scheduled_tasks: ScheduledTask[];
    expenses?: Expense[];
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  backup?: BackupPayload;
}

/**
 * Creates a clean backup payload from current IndexedDB data.
 */
export async function createBackupPayload(): Promise<BackupPayload> {
  const [species, batches, tasks, expenses] = await Promise.all([
    db.species.toArray(),
    db.batches.toArray(),
    db.scheduled_tasks.toArray(),
    db.expenses.toArray(),
  ]);

  // Strip transient joined fields
  const cleanBatches = batches.map(b => ({
    id: b.id,
    species_id: b.species_id,
    name: b.name,
    purchase_date: b.purchase_date,
    initial_count: b.initial_count,
    current_count: b.current_count,
    status: b.status,
    purchase_cost: b.purchase_cost ?? null,
    closed_at: b.closed_at ?? null,
    sale_revenue: b.sale_revenue ?? null,
    notes: b.notes,
    created_at: b.created_at,
  })) as Batch[];

  const cleanTasks = tasks.map(t => ({
    id: t.id,
    batch_id: t.batch_id,
    task_type: t.task_type,
    title_ar: t.title_ar,
    title_en: t.title_en,
    description: t.description,
    scheduled_date: t.scheduled_date,
    reminder_time: t.reminder_time || '07:00',
    status: t.status,
    completed_at: t.completed_at,
    postponed_to: t.postponed_to,
    notification_id: t.notification_id,
    created_at: t.created_at,
  })) as ScheduledTask[];

  const cleanExpenses = expenses.map(e => ({
    id: e.id,
    batch_id: e.batch_id,
    category: e.category,
    amount: e.amount,
    expense_date: e.expense_date,
    expense_time: e.expense_time || '12:00',
    notes: e.notes,
    created_at: e.created_at,
    updated_at: e.updated_at,
  })) as Expense[];

  return {
    version: BACKUP_VERSION,
    appName: 'PoultryFarm',
    exportedAt: new Date().toISOString(),
    data: {
      species,
      batches: cleanBatches,
      scheduled_tasks: cleanTasks,
      expenses: cleanExpenses,
    },
  };
}

/**
 * Downloads current database state as a JSON file.
 */
export async function downloadBackup(): Promise<string> {
  const payload = await createBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = getTodayDateString();
  const filename = `poultry-farm-backup-${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Validates a parsed or stringified backup.
 * Supports backward compatibility with Version 1 backups!
 */
export function validateBackup(content: string): ValidationResult {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Invalid file format: Not a JSON object.' };
    }

    const backup = parsed as Partial<BackupPayload>;

    if (typeof backup.version !== 'number') {
      return { valid: false, error: 'Missing or invalid backup version number.' };
    }

    if (backup.version > BACKUP_VERSION) {
      return {
        valid: false,
        error: `Incompatible backup version (${backup.version}). Current supported version is ${BACKUP_VERSION}.`,
      };
    }

    if (!backup.data || typeof backup.data !== 'object') {
      return { valid: false, error: 'Missing data object in backup.' };
    }

    const { species, batches, scheduled_tasks, expenses } = backup.data;

    if (!Array.isArray(species)) {
      return { valid: false, error: 'Backup data must include a species list.' };
    }
    if (!Array.isArray(batches)) {
      return { valid: false, error: 'Backup data must include a batches list.' };
    }
    if (!Array.isArray(scheduled_tasks)) {
      return { valid: false, error: 'Backup data must include a scheduled_tasks list.' };
    }

    // Default missing expenses for legacy backups (Version 1)
    if (!expenses || !Array.isArray(expenses)) {
      backup.data.expenses = [];
    }

    // Verify critical attributes
    for (const s of species) {
      if (!s.name_ar || typeof s.name_ar !== 'string') {
        return { valid: false, error: 'Corrupt species record: missing name_ar.' };
      }
    }

    for (const b of batches) {
      if (!b.name || typeof b.name !== 'string' || !b.purchase_date) {
        return { valid: false, error: 'Corrupt batch record: missing required fields.' };
      }
      // Normalize legacy batches
      if (b.purchase_cost === undefined) b.purchase_cost = null;
      if (b.closed_at === undefined) b.closed_at = null;
      if (b.sale_revenue === undefined) b.sale_revenue = null;
    }

    for (const t of scheduled_tasks) {
      if (!t.title_ar || !t.scheduled_date || !t.task_type) {
        return { valid: false, error: 'Corrupt task record: missing required fields.' };
      }
      if (!t.reminder_time) {
        t.reminder_time = '07:00';
      }
    }

    return { valid: true, backup: backup as BackupPayload };
  } catch (err) {
    return { valid: false, error: `Invalid JSON: ${String(err)}` };
  }
}

/**
 * Restores the database from a validated backup payload.
 */
export async function restoreBackup(backup: BackupPayload): Promise<{
  speciesCount: number;
  batchesCount: number;
  tasksCount: number;
  expensesCount: number;
}> {
  return await db.transaction('rw', [db.species, db.batches, db.scheduled_tasks, db.expenses], async () => {
    // Clear existing tables
    await db.expenses.clear();
    await db.scheduled_tasks.clear();
    await db.batches.clear();
    await db.species.clear();

    // Re-populate from backup
    if (backup.data.species.length > 0) {
      await db.species.bulkAdd(backup.data.species);
    }
    if (backup.data.batches.length > 0) {
      await db.batches.bulkAdd(backup.data.batches);
    }
    if (backup.data.scheduled_tasks.length > 0) {
      await db.scheduled_tasks.bulkAdd(backup.data.scheduled_tasks);
    }
    if (backup.data.expenses && backup.data.expenses.length > 0) {
      await db.expenses.bulkAdd(backup.data.expenses);
    }

    return {
      speciesCount: backup.data.species.length,
      batchesCount: backup.data.batches.length,
      tasksCount: backup.data.scheduled_tasks.length,
      expensesCount: backup.data.expenses ? backup.data.expenses.length : 0,
    };
  });
}
