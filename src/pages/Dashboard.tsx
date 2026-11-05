// src/pages/Dashboard.tsx
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import TaskCard from '../components/TaskCard';
import { getTodayTasks, getUpcomingTasks, getOverdueTasks } from '../services/taskService';
import { getActiveReminders, type ReminderSummary } from '../services/reminderService';
import type { ScheduledTask } from '../types';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [overdue, setOverdue] = useState<ScheduledTask[]>([]);
  const [today, setToday] = useState<ScheduledTask[]>([]);
  const [upcoming, setUpcoming] = useState<ScheduledTask[]>([]);
  const [reminderSummary, setReminderSummary] = useState<ReminderSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [o, td, up, rem] = await Promise.all([
      getOverdueTasks(),
      getTodayTasks(),
      getUpcomingTasks(7),
      getActiveReminders(),
    ]);
    setOverdue(o);
    setToday(td);
    setUpcoming(up);
    setReminderSummary(rem);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const dateStr = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-4xl animate-bounce">🐔</div>
      </div>
    );
  }

  const hasAnything = overdue.length + today.length + upcoming.length > 0;
  const totalUrgentReminders = (reminderSummary?.overdueCount ?? 0) + (reminderSummary?.todayCount ?? 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-5 text-white shadow-md">
        <p className="text-primary-100 text-sm mb-1">{dateStr}</p>
        <h1 className="text-2xl font-bold">{t('appName')} 🐔</h1>
        <div className="flex gap-2 sm:gap-3 mt-3 text-xs sm:text-sm flex-wrap">
          <span className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 font-medium">
            🔴 {overdue.length} {t('overdue')}
          </span>
          <span className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 font-medium">
            📅 {today.length} {t('today')}
          </span>
          <span className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 font-medium">
            📆 {upcoming.length} {t('upcoming')}
          </span>
        </div>
      </div>

      {/* In-App Reminder Urgent Banner */}
      {totalUrgentReminders > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {t('activeRemindersBanner', { count: totalUrgentReminders })}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {reminderSummary?.overdueCount ? `⚠️ ${reminderSummary.overdueCount} ${t('overdue')}` : ''}
                {reminderSummary?.overdueCount && reminderSummary?.todayCount ? ' · ' : ''}
                {reminderSummary?.todayCount ? `📅 ${reminderSummary.todayCount} ${t('dueToday')}` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasAnything && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🌟</div>
          <p className="text-lg">{t('noTasksToday')}</p>
        </div>
      )}

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <span>⚠️</span>
            <span>{t('overdue')}</span>
            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {overdue.length}
            </span>
          </h2>
          <div className="space-y-3">
            {overdue.map(task => (
              <TaskCard key={task.id} task={task} onRefresh={load} showBatchName />
            ))}
          </div>
        </section>
      )}

      {/* Today Section */}
      {today.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-primary-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <span>📅</span>
            <span>{t('today')}</span>
            <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {today.length}
            </span>
          </h2>
          <div className="space-y-3">
            {today.map(task => (
              <TaskCard key={task.id} task={task} onRefresh={load} showBatchName />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <span>📆</span>
            <span>{t('upcoming')} (7 {isAr ? 'أيام' : 'days'})</span>
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">
              {upcoming.length}
            </span>
          </h2>
          <div className="space-y-3">
            {upcoming.map(task => (
              <TaskCard key={task.id} task={task} onRefresh={load} showBatchName />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
