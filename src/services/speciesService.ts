// src/services/speciesService.ts
import { db } from '../db/database';
import type { Species } from '../types';

export async function getAllSpecies(): Promise<Species[]> {
  const all = await db.species.toArray();
  return all.sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
}

export async function getSpeciesById(id: number): Promise<Species | undefined> {
  return db.species.get(id);
}

export async function createSpecies(name_ar: string, name_en: string, icon: string): Promise<number> {
  const id = await db.species.add({
    name_ar,
    name_en,
    icon,
    created_at: new Date().toISOString(),
  } as Species);
  return id;
}

export async function deleteSpecies(id: number): Promise<void> {
  await db.species.delete(id);
}
