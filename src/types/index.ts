// src/types/index.ts

export type TaskStatus = 'pending' | 'done' | 'postponed';
export type BatchStatus = 'active' | 'sold' | 'closed';
export type TaskType = 'vaccination' | 'medication' | 'feed_change' | 'weighing' | 'custom';
export type ExpenseCategory = 'feed' | 'medicine' | 'vaccine' | 'supplement' | 'equipment' | 'other';

export interface Species {
  id: number;
  name_ar: string;
  name_en: string;
  icon: string;
  created_at: string;
}

export interface Batch {
  id: number;
  species_id: number;
  name: string;
  purchase_date: string;
  initial_count: number;
  current_count: number;
  status: BatchStatus;
  purchase_cost?: number | null;
  closed_at?: string | null;
  sale_revenue?: number | null;
  notes: string | null;
  created_at: string;
  // joined
  species_name_ar?: string;
  species_name_en?: string;
  species_icon?: string;
}

export interface ScheduledTask {
  id: number;
  batch_id: number;
  task_type: TaskType;
  title_ar: string;
  title_en: string;
  description: string | null;
  scheduled_date: string;
  reminder_time: string;
  status: TaskStatus;
  completed_at: string | null;
  postponed_to: string | null;
  notification_id: number | null;
  created_at: string;
  // joined
  batch_name?: string;
  species_icon?: string;
}

export interface Expense {
  id: number;
  batch_id: number;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  expense_time: string;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface TaskFormData {
  id?: number;
  batch_id: number;
  task_type: TaskType;
  title_ar: string;
  title_en: string;
  description?: string;
  scheduled_date: string;
  reminder_time: string;
}

export interface BatchFormData {
  species_id: number;
  name: string;
  purchase_date: string;
  initial_count: number;
  current_count?: number;
  purchase_cost?: number | null;
  notes?: string;
}

export interface ExpenseFormData {
  id?: number;
  batch_id: number;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  expense_time: string;
  notes?: string;
}
