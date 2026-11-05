// src/components/ExpenseForm.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createExpense, updateExpense } from '../services/expenseService';
import { getTodayDateString, getCurrentTimeString } from '../services/taskService';
import type { Expense, ExpenseFormData, ExpenseCategory } from '../types';

interface Props {
  batchId: number;
  expense?: Expense;
  onSaved: () => void;
  onCancel: () => void;
}

const CATEGORIES: { key: ExpenseCategory; icon: string }[] = [
  { key: 'feed', icon: '🌾' },
  { key: 'medicine', icon: '💊' },
  { key: 'vaccine', icon: '💉' },
  { key: 'supplement', icon: '🧪' },
  { key: 'equipment', icon: '🛠️' },
  { key: 'other', icon: '📦' },
];

export default function ExpenseForm({ batchId, expense, onSaved, onCancel }: Props) {
  const { t } = useTranslation();
  const isEditing = !!expense;

  const [form, setForm] = useState<ExpenseFormData>({
    batch_id: batchId,
    category: expense?.category || 'feed',
    amount: expense?.amount || 0,
    expense_date: expense?.expense_date || getTodayDateString(),
    expense_time: expense?.expense_time || getCurrentTimeString(),
    notes: expense?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0 || !form.expense_date) return;
    setSaving(true);
    try {
      if (isEditing && expense) {
        await updateExpense(expense.id, {
          category: form.category,
          amount: Number(form.amount),
          expense_date: form.expense_date,
          expense_time: form.expense_time || '12:00',
          notes: form.notes?.trim() || undefined,
        });
      } else {
        await createExpense({
          ...form,
          amount: Number(form.amount),
          notes: form.notes?.trim() || undefined,
        });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category selector */}
      <div>
        <label className={label}>{t('expenseCategory')}</label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setForm(f => ({ ...f, category: cat.key }))}
              className={`py-2 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1 transition-colors ${
                form.category === cat.key
                  ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{t(`expenseCategories.${cat.key}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount (EGP) */}
      <div>
        <label className={label}>
          {t('expenseAmount')} <span className="text-gray-400">({t('currency')})</span>
        </label>
        <input
          type="number"
          min="0.01"
          step="any"
          placeholder="0.00"
          className={field}
          value={form.amount || ''}
          onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
          required
        />
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>{t('expenseDate')}</label>
          <input
            type="date"
            className={field}
            value={form.expense_date}
            onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className={label}>{t('expenseTime')}</label>
          <input
            type="time"
            className={field}
            value={form.expense_time}
            onChange={e => setForm(f => ({ ...f, expense_time: e.target.value }))}
          />
        </div>
      </div>

      {/* Description / Notes */}
      <div>
        <label className={label}>
          {t('notes')} <span className="text-gray-400">({t('optional')})</span>
        </label>
        <textarea
          className={field + ' resize-none'}
          rows={2}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder={t('description')}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium active:bg-gray-200"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium active:bg-primary-600 disabled:opacity-60"
        >
          {saving ? '...' : t('save')}
        </button>
      </div>
    </form>
  );
}
