// src/services/expenseService.ts
import { db } from '../db/database';
import type { Expense, ExpenseFormData, ExpenseCategory } from '../types';

export async function getExpensesForBatch(batchId: number): Promise<Expense[]> {
  const expenses = await db.expenses
    .where('batch_id')
    .equals(batchId)
    .toArray();

  // Sort descending by date, then time
  expenses.sort((a, b) => {
    const dateComp = b.expense_date.localeCompare(a.expense_date);
    if (dateComp !== 0) return dateComp;
    return (b.expense_time || '').localeCompare(a.expense_time || '');
  });

  return expenses;
}

export async function createExpense(data: ExpenseFormData): Promise<number> {
  const now = new Date().toISOString();
  const id = await db.expenses.add({
    batch_id: data.batch_id,
    category: data.category,
    amount: Math.max(0, Number(data.amount) || 0),
    expense_date: data.expense_date,
    expense_time: data.expense_time || '12:00',
    notes: data.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  } as Expense);
  return id;
}

export async function updateExpense(id: number, data: Partial<ExpenseFormData>): Promise<void> {
  const updates: Partial<Expense> = {
    updated_at: new Date().toISOString(),
  };

  if (data.category !== undefined) updates.category = data.category;
  if (data.amount !== undefined) updates.amount = Math.max(0, Number(data.amount) || 0);
  if (data.expense_date !== undefined) updates.expense_date = data.expense_date;
  if (data.expense_time !== undefined) updates.expense_time = data.expense_time;
  if (data.notes !== undefined) updates.notes = data.notes?.trim() || null;

  await db.expenses.update(id, updates);
}

export async function deleteExpense(id: number): Promise<void> {
  await db.expenses.delete(id);
}

export interface BatchFinancialSummary {
  purchaseCost: number | null;
  totalExpenses: number;
  totalInvestment: number;
  hasPurchaseCost: boolean;
  saleRevenue: number | null;
  hasSaleRevenue: boolean;
  netProfitLoss: number | null;
  isProfit: boolean;
  expensesByCategory: Record<ExpenseCategory, number>;
}

export async function calculateBatchFinancials(
  batchId: number,
  purchaseCost?: number | null,
  saleRevenue?: number | null
): Promise<BatchFinancialSummary> {
  const expenses = await getExpensesForBatch(batchId);

  const expensesByCategory: Record<ExpenseCategory, number> = {
    feed: 0,
    medicine: 0,
    vaccine: 0,
    supplement: 0,
    equipment: 0,
    other: 0,
  };

  let totalExpenses = 0;
  for (const exp of expenses) {
    const amt = Number(exp.amount) || 0;
    totalExpenses += amt;
    if (expensesByCategory[exp.category] !== undefined) {
      expensesByCategory[exp.category] += amt;
    } else {
      expensesByCategory.other += amt;
    }
  }

  const validPurchaseCost = purchaseCost != null && purchaseCost >= 0 ? Number(purchaseCost) : null;
  const hasPurchaseCost = validPurchaseCost !== null;
  const totalInvestment = (validPurchaseCost ?? 0) + totalExpenses;

  const validSaleRevenue = saleRevenue != null && saleRevenue >= 0 ? Number(saleRevenue) : null;
  const hasSaleRevenue = validSaleRevenue !== null;

  let netProfitLoss: number | null = null;
  let isProfit = false;

  if (hasSaleRevenue) {
    netProfitLoss = validSaleRevenue! - totalInvestment;
    isProfit = netProfitLoss >= 0;
  }

  return {
    purchaseCost: validPurchaseCost,
    totalExpenses,
    totalInvestment,
    hasPurchaseCost,
    saleRevenue: validSaleRevenue,
    hasSaleRevenue,
    netProfitLoss,
    isProfit,
    expensesByCategory,
  };
}
