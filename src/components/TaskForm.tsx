// src/components/TaskForm.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createTask, updateTask, getTodayDateString } from '../services/taskService';
import type { TaskFormData, TaskType, ScheduledTask } from '../types';

interface Props {
  batchId: number;
  task?: ScheduledTask;
  onSaved: () => void;
  onCancel: () => void;
}

const TASK_TYPES: TaskType[] = ['vaccination', 'medication', 'feed_change', 'weighing', 'custom'];

export default function TaskForm({ batchId, task, onSaved, onCancel }: Props) {
  const { t } = useTranslation();
  const isEditing = !!task;

  const [form, setForm] = useState<TaskFormData>({
    batch_id: batchId,
    task_type: task?.task_type || 'vaccination',
    title_ar: task?.title_ar || '',
    title_en: task?.title_en || '',
    description: task?.description || '',
    scheduled_date: task?.scheduled_date || getTodayDateString(),
    reminder_time: task?.reminder_time || '07:00',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title_ar || !form.scheduled_date) return;
    setSaving(true);
    try {
      if (isEditing && task) {
        await updateTask(task.id, {
          task_type: form.task_type,
          title_ar: form.title_ar.trim(),
          title_en: form.title_en?.trim() || form.title_ar.trim(),
          description: form.description?.trim() || undefined,
          scheduled_date: form.scheduled_date,
          reminder_time: form.reminder_time || '07:00',
        });
      } else {
        await createTask({
          ...form,
          title_ar: form.title_ar.trim(),
          title_en: form.title_en?.trim() || form.title_ar.trim(),
          description: form.description?.trim() || undefined,
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
        <label className={label}>{t('taskType')}</label>
        <div className="grid grid-cols-3 gap-2">
          {TASK_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setForm(f => ({ ...f, task_type: type }))}
              className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors ${
                form.task_type === type
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {t(`taskTypes.${type}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>{t('taskTitleAr')}</label>
        <input
          className={field}
          placeholder={t('taskTitleArPlaceholder')}
          value={form.title_ar}
          onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))}
          required
          dir="rtl"
        />
      </div>

      <div>
        <label className={label}>{t('taskTitleEn')} <span className="text-gray-400">({t('optional')})</span></label>
        <input
          className={field}
          placeholder={t('taskTitleEnPlaceholder')}
          value={form.title_en}
          onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))}
          dir="ltr"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>{t('scheduledDate')}</label>
          <input
            type="date"
            className={field}
            value={form.scheduled_date}
            onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className={label}>{t('reminderTime')}</label>
          <input
            type="time"
            className={field}
            value={form.reminder_time}
            onChange={e => setForm(f => ({ ...f, reminder_time: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className={label}>{t('description')} <span className="text-gray-400">({t('optional')})</span></label>
        <textarea
          className={field + ' resize-none'}
          rows={2}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder={t('description')}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-60"
        >
          {saving ? '...' : t('save')}
        </button>
      </div>
    </form>
  );
}
