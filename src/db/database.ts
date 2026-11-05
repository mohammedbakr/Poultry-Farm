// src/db/database.ts
import Dexie, { type Table } from 'dexie';
import type { Species, Batch, ScheduledTask, Expense } from '../types';

export class PoultryDatabase extends Dexie {
  species!: Table<Species, number>;
  batches!: Table<Batch, number>;
  scheduled_tasks!: Table<ScheduledTask, number>;
  expenses!: Table<Expense, number>;

  constructor() {
    super('poultry_farm_pwa');

    // Schema version 1 (initial PWA release)
    this.version(1).stores({
      species: '++id, name_ar, name_en, icon, created_at',
      batches: '++id, species_id, name, purchase_date, current_count, status, created_at',
      scheduled_tasks: '++id, batch_id, task_type, scheduled_date, reminder_time, status, postponed_to, completed_at, created_at',
    });

    // Schema version 2 (financial tracking, expenses, batch closing date/time, purchase cost)
    this.version(2).stores({
      species: '++id, name_ar, name_en, icon, created_at',
      batches: '++id, species_id, name, purchase_date, current_count, status, purchase_cost, closed_at, sale_revenue, created_at',
      scheduled_tasks: '++id, batch_id, task_type, scheduled_date, reminder_time, status, postponed_to, completed_at, created_at',
      expenses: '++id, batch_id, category, amount, expense_date, expense_time, created_at',
    }).upgrade(async tx => {
      // Modify existing batches safely without losing any data
      await tx.table('batches').toCollection().modify(batch => {
        if (batch.purchase_cost === undefined) batch.purchase_cost = null;
        if (batch.closed_at === undefined) batch.closed_at = null;
        if (batch.sale_revenue === undefined) batch.sale_revenue = null;
      });
    });

    this.on('populate', async () => {
      await this.species.bulkAdd([
        { id: 1, name_ar: 'دجاج لاحم', name_en: 'Broiler Chicken', icon: '🐔', created_at: new Date().toISOString() },
        { id: 2, name_ar: 'سمان', name_en: 'Quail', icon: '🐦', created_at: new Date().toISOString() },
        { id: 3, name_ar: 'دجاج بياض', name_en: 'Layer Chicken', icon: '🥚', created_at: new Date().toISOString() },
        { id: 4, name_ar: 'ديك رومي', name_en: 'Turkey', icon: '🦃', created_at: new Date().toISOString() },
      ]);
    });
  }
}

export const db = new PoultryDatabase();

/**
 * Ensures the database is initialized and seed species exist.
 */
export async function initDb(): Promise<void> {
  await db.open();
  const count = await db.species.count();
  if (count === 0) {
    await db.species.bulkAdd([
      { id: 1, name_ar: 'دجاج لاحم', name_en: 'Broiler Chicken', icon: '🐔', created_at: new Date().toISOString() },
      { id: 2, name_ar: 'سمان', name_en: 'Quail', icon: '🐦', created_at: new Date().toISOString() },
      { id: 3, name_ar: 'دجاج بياض', name_en: 'Layer Chicken', icon: '🥚', created_at: new Date().toISOString() },
      { id: 4, name_ar: 'ديك رومي', name_en: 'Turkey', icon: '🦃', created_at: new Date().toISOString() },
    ]);
  }
}
