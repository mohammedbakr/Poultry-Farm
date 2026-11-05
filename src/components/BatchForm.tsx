// src/components/BatchForm.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getAllSpecies } from '../services/speciesService';
import { createBatch, updateBatch } from '../services/batchService';
import { getTodayDateString } from '../services/taskService';
import type { Species, BatchFormData, Batch } from '../types';

interface Props {
  batch?: Batch;
  onSaved: () => void;
  onCancel: () => void;
}

export default function BatchForm({ batch, onSaved, onCancel }: Props) {
  const { t } = useTranslation();
  const isEditing = !!batch;
  const [species, setSpecies] = useState<Species[]>([]);
  const [form, setForm] = useState<BatchFormData>({
    species_id: batch?.species_id || 0,
    name: batch?.name || '',
    purchase_date: batch?.purchase_date || getTodayDateString(),
    initial_count: batch?.initial_count || 0,
    current_count: batch?.current_count || 0,
    purchase_cost: batch?.purchase_cost != null ? batch.purchase_cost : undefined,
    notes: batch?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllSpecies().then(list => {
      setSpecies(list);
      if (!isEditing && list.length > 0 && !form.species_id) {
        setForm(f => ({ ...f, species_id: list[0].id }));
      }
    });
  }, [isEditing, form.species_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.species_id || !form.initial_count) return;
    setSaving(true);
    try {
      const parsedCost = form.purchase_cost != null && !isNaN(Number(form.purchase_cost))
        ? Math.max(0, Number(form.purchase_cost))
        : null;

      if (isEditing && batch) {
        await updateBatch(batch.id, {
          species_id: form.species_id,
          name: form.name.trim(),
          purchase_date: form.purchase_date,
          initial_count: Number(form.initial_count),
          current_count: Number(form.current_count ?? form.initial_count),
          purchase_cost: parsedCost,
          notes: form.notes?.trim() || null,
        });
      } else {
        await createBatch({
          ...form,
          name: form.name.trim(),
          purchase_cost: parsedCost,
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
      <div>
        <label className={label}>{t('species')}</label>
        <select
          className={field}
          value={form.species_id}
          onChange={e => setForm(f => ({ ...f, species_id: Number(e.target.value) }))}
          required
        >
          <option value={0} disabled>{t('selectSpecies')}</option>
          {species.map(s => (
            <option key={s.id} value={s.id}>{s.icon} {s.name_ar} / {s.name_en}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>{t('batchName')}</label>
        <input
          className={field}
          placeholder={t('batchNamePlaceholder')}
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>{t('purchaseDate')}</label>
          <input
            type="date"
            className={field}
            value={form.purchase_date}
            onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className={label}>{t('initialCount')}</label>
          <input
            type="number"
            min={1}
            className={field}
            value={form.initial_count || ''}
            onChange={e => setForm(f => ({
              ...f,
              initial_count: Number(e.target.value),
              current_count: isEditing ? f.current_count : Number(e.target.value)
            }))}
            required
          />
        </div>
      </div>

      {isEditing && (
        <div>
          <label className={label}>{t('currentCount')}</label>
          <input
            type="number"
            min={0}
            className={field}
            value={form.current_count ?? ''}
            onChange={e => setForm(f => ({ ...f, current_count: Number(e.target.value) }))}
            required
          />
        </div>
      )}

      {/* Purchase Cost (Optional, non-negative) */}
      <div>
        <label className={label}>
          {t('purchaseCost')} <span className="text-gray-400">({t('currency')} - {t('optional')})</span>
        </label>
        <input
          type="number"
          min="0"
          step="any"
          placeholder="0.00"
          className={field}
          value={form.purchase_cost ?? ''}
          onChange={e => {
            const val = e.target.value;
            setForm(f => ({ ...f, purchase_cost: val === '' ? undefined : Number(val) }));
          }}
        />
      </div>

      <div>
        <label className={label}>{t('notes')} <span className="text-gray-400">({t('optional')})</span></label>
        <textarea
          className={field + ' resize-none'}
          rows={2}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
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
