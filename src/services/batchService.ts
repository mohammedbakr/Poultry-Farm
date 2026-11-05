// src/services/batchService.ts
import { db } from '../db/database';
import type { Batch, BatchFormData, Species } from '../types';

async function attachSpecies(batches: Batch[]): Promise<Batch[]> {
  const speciesList = await db.species.toArray();
  const speciesMap = new Map<number, Species>(speciesList.map(s => [s.id, s]));

  return batches.map(b => {
    const s = speciesMap.get(b.species_id);
    return {
      ...b,
      species_name_ar: s?.name_ar,
      species_name_en: s?.name_en,
      species_icon: s?.icon ?? '🐔',
    };
  });
}

export async function getAllBatches(): Promise<Batch[]> {
  const batches = await db.batches.orderBy('created_at').reverse().toArray();
  return attachSpecies(batches);
}

export async function getActiveBatches(): Promise<Batch[]> {
  const batches = await db.batches
    .filter(b => b.status === 'active')
    .toArray();
  batches.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return attachSpecies(batches);
}

export async function getBatchById(id: number): Promise<Batch | null> {
  const batch = await db.batches.get(id);
  if (!batch) return null;
  const [enriched] = await attachSpecies([batch]);
  return enriched ?? null;
}

export async function createBatch(data: BatchFormData): Promise<number> {
  const now = new Date().toISOString();
  const id = await db.batches.add({
    species_id: data.species_id,
    name: data.name,
    purchase_date: data.purchase_date,
    initial_count: data.initial_count,
    current_count: data.current_count ?? data.initial_count,
    status: 'active',
    purchase_cost: data.purchase_cost != null && data.purchase_cost >= 0 ? data.purchase_cost : null,
    closed_at: null,
    sale_revenue: null,
    notes: data.notes ?? null,
    created_at: now,
  } as Batch);
  return id;
}

export async function updateBatch(id: number, data: Partial<Batch>): Promise<void> {
  await db.batches.update(id, data);
}

export async function updateBatchCount(id: number, current_count: number): Promise<void> {
  await db.batches.update(id, { current_count });
}

export async function updateBatchStatus(id: number, status: 'active' | 'sold' | 'closed'): Promise<void> {
  await db.batches.update(id, { status });
}

export async function closeOrSellBatch(
  id: number,
  status: 'sold' | 'closed',
  closedAt: string,
  saleRevenue?: number | null
): Promise<void> {
  await db.batches.update(id, {
    status,
    closed_at: closedAt,
    sale_revenue: saleRevenue != null && saleRevenue >= 0 ? saleRevenue : null,
  });
}

export async function reopenBatch(id: number): Promise<void> {
  await db.batches.update(id, {
    status: 'active',
    closed_at: null,
  });
}

export async function deleteBatch(id: number): Promise<void> {
  await db.transaction('rw', [db.batches, db.scheduled_tasks, db.expenses], async () => {
    await db.scheduled_tasks.where('batch_id').equals(id).delete();
    await db.expenses.where('batch_id').equals(id).delete();
    await db.batches.delete(id);
  });
}
