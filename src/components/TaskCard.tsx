// src/components/TaskCard.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScheduledTask } from '../types';
import {
  completeTask,
  postponeTask,
  deleteTask,
  reopenTask,
  formatCompletionDateTime,
  getTodayDateString,
  getCurrentTimeString,
} from '../services/taskService';

interface Props {
  task: ScheduledTask;
  onRefresh: () => void;
  onEdit?: (task: ScheduledTask) => void;
  showBatchName?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  vaccination: 'bg-blue-100 text-blue-700',
  medication:  'bg-red-100 text-red-700',
  feed_change: 'bg-amber-100 text-amber-700',
  weighing:    'bg-purple-100 text-purple-700',
  custom:      'bg-gray-100 text-gray-700',
};

const TYPE_ICONS: Record<string, string> = {
  vaccination: '💉',
  medication:  '💊',
  feed_change: '🌾',
  weighing:    '⚖️',
  custom:      '📋',
};

export default function TaskCard({ task, onRefresh, onEdit, showBatchName = false }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [showPostpone, setShowPostpone] = useState(false);
  const [newDate, setNewDate] = useState(getTodayDateString());
  const [newTime, setNewTime] = useState(task.reminder_time || '07:00');

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionDate, setCompletionDate] = useState(getTodayDateString());
  const [completionTime, setCompletionTime] = useState(getCurrentTimeString());

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const title = isAr ? task.title_ar : task.title_en;
  const today = getTodayDateString();
  const effectiveDate = task.postponed_to || task.scheduled_date;
  const isOverdue = effectiveDate < today && task.status === 'pending';

  async function handleQuickComplete() {
    const isoDateTime = `${completionDate}T${completionTime}:00`;
    await completeTask(task.id, task.notification_id, isoDateTime);
    setShowCompleteModal(false);
    onRefresh();
  }

  async function handleReopen() {
    await reopenTask(task.id);
    onRefresh();
  }

  async function handlePostpone() {
    if (!newDate) return;
    await postponeTask(task.id, newDate, task.notification_id, newTime, task.title_ar);
    setShowPostpone(false);
    onRefresh();
  }

  async function handleDelete() {
    await deleteTask(task.id, task.notification_id);
    setShowConfirmDelete(false);
    onRefresh();
  }

  // ── Completed task display ──────────────────────────────────────────────────
  if (task.status === 'done') {
    const { formatted } = formatCompletionDateTime(task.completed_at);

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 transition-colors">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">✅</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[task.task_type]}`}>
                {TYPE_ICONS[task.task_type]} {t(`taskTypes.${task.task_type}`)}
              </span>
              {showBatchName && task.batch_name && (
                <span className="text-[10px] text-gray-500 font-medium">
                  {task.batch_name}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-600 line-through truncate">{title}</p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <span>{t('completedAt')}:</span>
              <span className="font-medium text-gray-600">{formatted}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReopen}
              title={t('reopenTask')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 active:bg-gray-200"
            >
              ↩️
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="text-xs p-1.5 rounded-lg text-red-400 hover:text-red-600 active:bg-red-50"
            >
              🗑
            </button>
          </div>
        </div>

        {showConfirmDelete && (
          <div className="mt-3 bg-red-50 border border-red-100 p-2.5 rounded-xl flex items-center justify-between gap-2">
            <p className="text-xs text-red-700">{t('confirmDelete')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-lg"
              >
                {t('no')}
              </button>
              <button
                onClick={handleDelete}
                className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-lg"
              >
                {t('yes')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Pending / Overdue task display ──────────────────────────────────────────
  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${isOverdue ? 'border-red-300' : 'border-gray-100'} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-0.5">{task.species_icon ?? TYPE_ICONS[task.task_type]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[task.task_type]}`}>
                {TYPE_ICONS[task.task_type]} {t(`taskTypes.${task.task_type}`)}
              </span>
              {isOverdue && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                  ⚠️ {t('overdue')}
                </span>
              )}
            </div>
            <p className="font-semibold text-gray-900 leading-snug">{title}</p>
            {showBatchName && task.batch_name && (
              <p className="text-xs text-gray-500 mt-0.5">{task.batch_name}</p>
            )}
            {task.description && (
              <p className="text-xs text-gray-500 mt-1">{task.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              📅 {task.postponed_to ?? task.scheduled_date} · ⏰ {task.reminder_time}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowCompleteModal(true)}
            className="flex-1 bg-primary-500 text-white text-sm py-2 rounded-xl font-medium active:bg-primary-600 transition-colors flex items-center justify-center gap-1"
          >
            <span>✓</span>
            <span>{t('done')}</span>
          </button>
          <button
            onClick={() => setShowPostpone(v => !v)}
            className="flex-1 bg-gray-100 text-gray-700 text-sm py-2 rounded-xl font-medium active:bg-gray-200 transition-colors"
          >
            🔄 {t('postpone')}
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="bg-gray-100 text-gray-600 text-sm px-3 py-2 rounded-xl active:bg-gray-200"
              title={t('edit')}
            >
              ✏️
            </button>
          )}
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="bg-gray-100 text-red-500 text-sm px-3 py-2 rounded-xl active:bg-red-50 transition-colors"
          >
            🗑
          </button>
        </div>

        {/* Postpone with Date AND Time */}
        {showPostpone && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
            <p className="text-xs font-semibold text-gray-700">{t('postponeTo')}</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={newDate}
                min={today}
                onChange={e => setNewDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
              />
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPostpone(false)}
                className="flex-1 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handlePostpone}
                disabled={!newDate}
                className="flex-1 bg-primary-500 text-white py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        )}

        {/* Mark Done Date & Time Modal */}
        {showCompleteModal && (
          <div className="mt-3 p-3 bg-emerald-50 rounded-xl space-y-2 border border-emerald-200">
            <p className="text-xs font-semibold text-emerald-900">
              {t('markDone')} — {t('completedAt')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-emerald-800 mb-0.5">{t('taskDate')}</label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={e => setCompletionDate(e.target.value)}
                  className="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-emerald-800 mb-0.5">{t('completionTime')}</label>
                <input
                  type="time"
                  value={completionTime}
                  onChange={e => setCompletionTime(e.target.value)}
                  className="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleQuickComplete}
                className="flex-1 bg-primary-600 text-white py-1.5 rounded-lg text-xs font-medium"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        )}
      </div>

      {showConfirmDelete && (
        <div className="bg-red-50 border-t border-red-100 px-4 py-3 flex items-center justify-between gap-2">
          <p className="text-sm text-red-700">{t('confirmDelete')}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-lg"
            >
              {t('no')}
            </button>
            <button
              onClick={handleDelete}
              className="text-sm px-3 py-1.5 bg-red-500 text-white rounded-lg"
            >
              {t('yes')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
