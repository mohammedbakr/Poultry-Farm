// src/pages/BatchDetail.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getBatchById,
  deleteBatch,
  closeOrSellBatch,
  reopenBatch,
} from '../services/batchService';
import { getTasksForBatch, formatCompletionDateTime, getTodayDateString, getCurrentTimeString } from '../services/taskService';
import {
  getExpensesForBatch,
  calculateBatchFinancials,
  deleteExpense,
  type BatchFinancialSummary,
} from '../services/expenseService';
import TaskCard from '../components/TaskCard';
import Modal from '../components/Modal';
import TaskForm from '../components/TaskForm';
import BatchForm from '../components/BatchForm';
import ExpenseForm from '../components/ExpenseForm';
import type { Batch, ScheduledTask, Expense, ExpenseCategory } from '../types';

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  feed: '🌾',
  medicine: '💊',
  vaccine: '💉',
  supplement: '🧪',
  equipment: '🛠️',
  other: '📦',
};

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [batch, setBatch] = useState<Batch | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [financials, setFinancials] = useState<BatchFinancialSummary | null>(null);

  // Active view tabs
  const [mainTab, setMainTab] = useState<'tasks' | 'expenses'>('tasks');
  const [taskTab, setTaskTab] = useState<'pending' | 'done'>('pending');
  const [expenseFilter, setExpenseFilter] = useState<ExpenseCategory | 'all'>('all');

  // Modals state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | undefined>(undefined);

  const [showEditBatchModal, setShowEditBatchModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);

  // Closing / Selling Modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeStatus, setCloseStatus] = useState<'sold' | 'closed'>('sold');
  const [closingDate, setClosingDate] = useState(getTodayDateString());
  const [closingTime, setClosingTime] = useState(getCurrentTimeString());
  const [saleRevenueInput, setSaleRevenueInput] = useState<string>('');

  const load = useCallback(async () => {
    if (!id) return;
    const batchId = Number(id);
    const [b, tList, eList] = await Promise.all([
      getBatchById(batchId),
      getTasksForBatch(batchId),
      getExpensesForBatch(batchId),
    ]);

    setBatch(b);
    setTasks(tList);
    setExpenses(eList);

    if (b) {
      const fin = await calculateBatchFinancials(batchId, b.purchase_cost, b.sale_revenue);
      setFinancials(fin);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Handle closing / selling submission
  async function handleCloseOrSellSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!batch) return;

    const isoDateTime = `${closingDate}T${closingTime}:00`;
    const revNum = saleRevenueInput !== '' ? Number(saleRevenueInput) : null;

    await closeOrSellBatch(batch.id, closeStatus, isoDateTime, revNum);
    setShowCloseModal(false);
    load();
  }

  // Handle reopen
  async function handleReopenBatch() {
    if (!batch) return;
    await reopenBatch(batch.id);
    load();
  }

  // Handle batch deletion
  async function handleDeleteBatch() {
    if (!batch) return;
    await deleteBatch(batch.id);
    navigate('/batches');
  }

  // Handle expense deletion
  async function handleConfirmDeleteExpense() {
    if (!deletingExpenseId) return;
    await deleteExpense(deletingExpenseId);
    setDeletingExpenseId(null);
    load();
  }

  if (!batch) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-4xl animate-bounce">🐔</div>
      </div>
    );
  }

  const pending = tasks.filter(t => t.status === 'pending');
  const done = tasks.filter(t => t.status === 'done');

  const filteredExpenses = expenseFilter === 'all'
    ? expenses
    : expenses.filter(e => e.category === expenseFilter);

  function getDaysOld(purchaseDate: string) {
    return Math.floor((Date.now() - new Date(purchaseDate).getTime()) / 86400000);
  }

  const closedDateFormatted = batch.closed_at
    ? formatCompletionDateTime(batch.closed_at).formatted
    : null;

  return (
    <div className="space-y-5">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/batches')}
          className="flex items-center gap-1 text-primary-600 text-sm font-medium"
        >
          {isAr ? '→' : '←'} {t('batches')}
        </button>

        <button
          onClick={() => setShowEditBatchModal(true)}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1 transition-colors"
        >
          <span>✏️</span>
          <span>{t('editBatch')}</span>
        </button>
      </div>

      {/* ── 1. Batch header card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start gap-4">
          <div className="text-5xl">{batch.species_icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  batch.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : batch.status === 'sold'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {t(batch.status)}
              </span>
              <span className="text-xs text-gray-400">
                {isAr ? batch.species_name_ar : batch.species_name_en}
              </span>
            </div>

            <h1 className="text-xl font-bold text-gray-900 truncate">{batch.name}</h1>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-base font-bold text-gray-900">{batch.current_count}</p>
                <p className="text-[11px] text-gray-500">{isAr ? 'طيور' : 'birds'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-base font-bold text-gray-900">{getDaysOld(batch.purchase_date)}</p>
                <p className="text-[11px] text-gray-500">{isAr ? 'يوم' : 'days'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-base font-bold text-gray-900">{pending.length}</p>
                <p className="text-[11px] text-gray-500">{isAr ? 'مهام' : 'tasks'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Closing / Selling Date & Time Banner */}
        {closedDateFormatted && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-blue-900">
              <span>{batch.status === 'sold' ? '🏷️' : '🔒'}</span>
              <span>
                <strong>{batch.status === 'sold' ? t('soldAt') : t('closedAt')}:</strong> {closedDateFormatted}
              </span>
            </div>
            <button
              onClick={() => {
                setCloseStatus(batch.status === 'sold' ? 'sold' : 'closed');
                if (batch.closed_at) {
                  const parts = batch.closed_at.split('T');
                  setClosingDate(parts[0] || getTodayDateString());
                  setClosingTime(parts[1] ? parts[1].slice(0, 5) : getCurrentTimeString());
                }
                setSaleRevenueInput(batch.sale_revenue != null ? String(batch.sale_revenue) : '');
                setShowCloseModal(true);
              }}
              className="text-[11px] text-blue-700 underline font-medium"
            >
              {t('edit')}
            </button>
          </div>
        )}

        {batch.notes && (
          <p className="mt-3 text-xs text-gray-600 bg-gray-50 rounded-xl p-3">{batch.notes}</p>
        )}

        {/* Status Lifecycle Actions */}
        {batch.status === 'active' ? (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setCloseStatus('sold');
                setClosingDate(getTodayDateString());
                setClosingTime(getCurrentTimeString());
                setSaleRevenueInput('');
                setShowCloseModal(true);
              }}
              className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium active:bg-blue-100 flex items-center justify-center gap-1.5"
            >
              <span>🏷</span>
              <span>{t('sellBatch')}</span>
            </button>
            <button
              onClick={() => {
                setCloseStatus('closed');
                setClosingDate(getTodayDateString());
                setClosingTime(getCurrentTimeString());
                setSaleRevenueInput('');
                setShowCloseModal(true);
              }}
              className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium active:bg-gray-200 flex items-center justify-center gap-1.5"
            >
              <span>🔒</span>
              <span>{t('closeBatch')}</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="py-2 px-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium"
              title={t('delete')}
            >
              🗑
            </button>
          </div>
        ) : (
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleReopenBatch}
              className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium active:bg-emerald-100 flex items-center justify-center gap-1"
            >
              <span>♻️</span>
              <span>{t('reopen')}</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="py-2 px-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium"
              title={t('delete')}
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* Delete batch confirm */}
      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm text-red-800 font-medium mb-1">{t('deleteBatch')}</p>
          <p className="text-xs text-red-600 mb-3">{t('thisWillDeleteAll')}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2 bg-white border border-gray-200 rounded-xl text-sm"
            >
              {t('no')}
            </button>
            <button
              onClick={handleDeleteBatch}
              className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium"
            >
              {t('yes')}
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Financial Summary Card ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <span>📊</span>
            <span>{t('financialSummary')}</span>
          </h2>
          <span className="text-[11px] text-gray-400 font-medium">{t('currency')}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {/* Purchase Cost */}
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-gray-500 mb-0.5">🪙 {t('purchaseCost')}</p>
            <p className="text-sm font-bold text-gray-900">
              {financials?.hasPurchaseCost
                ? `${financials.purchaseCost?.toLocaleString()} ${t('currency')}`
                : <span className="text-gray-400 font-normal italic">{t('notEntered')}</span>}
            </p>
          </div>

          {/* Additional Expenses */}
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-gray-500 mb-0.5">💸 {t('additionalExpenses')}</p>
            <p className="text-sm font-bold text-amber-700">
              {financials?.totalExpenses?.toLocaleString()} {t('currency')}
            </p>
          </div>

          {/* Total Investment */}
          <div className="bg-gray-50 rounded-xl p-2.5 col-span-2 sm:col-span-1">
            <p className="text-gray-500 mb-0.5">💼 {t('totalInvestment')}</p>
            <p className="text-sm font-bold text-purple-700">
              {financials?.totalInvestment?.toLocaleString()} {t('currency')}
            </p>
            {!financials?.hasPurchaseCost && (
              <p className="text-[10px] text-gray-400 mt-0.5">{t('excludingPurchaseCost')}</p>
            )}
          </div>

          {/* Sale Revenue */}
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-gray-500 mb-0.5">🏷️ {t('saleRevenue')}</p>
            <p className="text-sm font-bold text-blue-700">
              {financials?.hasSaleRevenue
                ? `${financials.saleRevenue?.toLocaleString()} ${t('currency')}`
                : <span className="text-gray-400 font-normal italic">{t('pendingSale')}</span>}
            </p>
          </div>

          {/* Net Profit / Loss */}
          <div className={`rounded-xl p-2.5 col-span-2 sm:col-span-2 ${
            !financials?.hasSaleRevenue
              ? 'bg-gray-50 text-gray-500'
              : financials.isProfit
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}>
            <p className="text-[11px] mb-0.5 font-medium">📈 {t('netProfitLoss')}</p>
            <p className="text-sm font-bold">
              {!financials?.hasSaleRevenue ? (
                <span className="text-gray-400 font-normal italic">— ({t('pendingSale')})</span>
              ) : (
                <span className={financials.isProfit ? 'text-emerald-700' : 'text-red-700'}>
                  {financials.netProfitLoss! > 0 ? '+' : ''}
                  {financials.netProfitLoss?.toLocaleString()} {t('currency')}
                  <span className="text-xs font-semibold mx-1">
                    ({financials.isProfit ? t('netProfit') : t('netLoss')})
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Main Navigation Segment (Tasks vs Expenses) ──────────────────── */}
      <div className="flex bg-gray-100 p-1 rounded-2xl">
        <button
          onClick={() => setMainTab('tasks')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'tasks' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          <span>📋</span>
          <span>{t('tasks')}</span>
          <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {tasks.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('expenses')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'expenses' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          <span>💸</span>
          <span>{t('expenses')}</span>
          <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {financials?.totalExpenses?.toLocaleString()} {t('currency')}
          </span>
        </button>
      </div>

      {/* ── Tab Content: Tasks ──────────────────────────────────────────────── */}
      {mainTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setTaskTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  taskTab === 'pending' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                {t('pendingTasks')} ({pending.length})
              </button>
              <button
                onClick={() => setTaskTab('done')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  taskTab === 'done' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                {t('completedTasks')} ({done.length})
              </button>
            </div>

            <button
              onClick={() => {
                setEditingTask(undefined);
                setShowTaskForm(true);
              }}
              className="bg-primary-500 text-white px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1 active:bg-primary-600"
            >
              + {t('addTask')}
            </button>
          </div>

          {taskTab === 'pending' && (
            <div className="space-y-3">
              {pending.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-gray-100">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm">{t('noTasks')}</p>
                </div>
              ) : (
                pending.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onRefresh={load}
                    onEdit={t => {
                      setEditingTask(t);
                      setShowTaskForm(true);
                    }}
                  />
                ))
              )}
            </div>
          )}

          {taskTab === 'done' && (
            <div className="space-y-2.5">
              {done.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-gray-100">
                  <p className="text-sm">{t('noTasks')}</p>
                </div>
              ) : (
                done.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onRefresh={load}
                    onEdit={t => {
                      setEditingTask(t);
                      setShowTaskForm(true);
                    }}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: Expenses ───────────────────────────────────────────── */}
      {mainTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{t('expenses')}</h3>
              <p className="text-xs text-gray-500">
                {t('additionalExpenses')}: <strong>{financials?.totalExpenses?.toLocaleString()} {t('currency')}</strong>
              </p>
            </div>

            <button
              onClick={() => {
                setEditingExpense(undefined);
                setShowExpenseForm(true);
              }}
              className="bg-primary-500 text-white px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1 active:bg-primary-600"
            >
              + {t('addExpense')}
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setExpenseFilter('all')}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                expenseFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {t('allCategories')} ({expenses.length})
            </button>
            {(Object.keys(CATEGORY_ICONS) as ExpenseCategory[]).map(cat => {
              const count = expenses.filter(e => e.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setExpenseFilter(cat)}
                  className={`px-2.5 py-1.5 rounded-full font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                    expenseFilter === cat
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span>{t(`expenseCategories.${cat}`)}</span>
                  {count > 0 && <span className="opacity-75">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Expenses List */}
          <div className="space-y-2.5">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <div className="text-3xl mb-1">💸</div>
                <p className="text-sm">{t('noExpenses')}</p>
              </div>
            ) : (
              filteredExpenses.map(exp => (
                <div
                  key={exp.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl mt-0.5">{CATEGORY_ICONS[exp.category] || '📦'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-gray-900">
                          {t(`expenseCategories.${exp.category}`)}
                        </span>
                        <span className="text-xs font-bold text-primary-600">
                          {Number(exp.amount).toLocaleString()} {t('currency')}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        📅 {exp.expense_date} · ⏰ {exp.expense_time || '12:00'}
                      </p>
                      {exp.notes && (
                        <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg p-2">
                          {exp.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingExpense(exp);
                        setShowExpenseForm(true);
                      }}
                      className="text-xs p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                      title={t('edit')}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeletingExpenseId(exp.id)}
                      className="text-xs p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
                      title={t('delete')}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Task Form (Add / Edit) ────────────────────────────────────── */}
      <Modal
        isOpen={showTaskForm}
        onClose={() => {
          setShowTaskForm(false);
          setEditingTask(undefined);
        }}
        title={editingTask ? t('editTask') : t('addTask')}
      >
        <TaskForm
          batchId={batch.id}
          task={editingTask}
          onSaved={() => {
            setShowTaskForm(false);
            setEditingTask(undefined);
            load();
          }}
          onCancel={() => {
            setShowTaskForm(false);
            setEditingTask(undefined);
          }}
        />
      </Modal>

      {/* ── Modal: Edit Batch ────────────────────────────────────────────────── */}
      <Modal
        isOpen={showEditBatchModal}
        onClose={() => setShowEditBatchModal(false)}
        title={t('editBatch')}
      >
        <BatchForm
          batch={batch}
          onSaved={() => {
            setShowEditBatchModal(false);
            load();
          }}
          onCancel={() => setShowEditBatchModal(false)}
        />
      </Modal>

      {/* ── Modal: Expense Form (Add / Edit) ─────────────────────────────────── */}
      <Modal
        isOpen={showExpenseForm}
        onClose={() => {
          setShowExpenseForm(false);
          setEditingExpense(undefined);
        }}
        title={editingExpense ? t('editExpense') : t('addExpense')}
      >
        <ExpenseForm
          batchId={batch.id}
          expense={editingExpense}
          onSaved={() => {
            setShowExpenseForm(false);
            setEditingExpense(undefined);
            load();
          }}
          onCancel={() => {
            setShowExpenseForm(false);
            setEditingExpense(undefined);
          }}
        />
      </Modal>

      {/* ── Modal: Close / Sell Batch ────────────────────────────────────────── */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title={closeStatus === 'sold' ? t('sellBatch') : t('closeBatch')}
      >
        <form onSubmit={handleCloseOrSellSubmit} className="space-y-4">
          <p className="text-xs text-gray-500">
            {closeStatus === 'sold'
              ? (isAr ? 'تسجيل بيع الدفعة وتوثيق تاريخ ووقت البيع وإيرادات البيع.' : 'Record batch sale with exact date, time, and revenue.')
              : (isAr ? 'تسجيل إغلاق الدفعة وتوثيق تاريخ ووقت الإغلاق.' : 'Record batch closing date and time.')}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('closingDate')}</label>
              <input
                type="date"
                value={closingDate}
                onChange={e => setClosingDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('closingTime')}</label>
              <input
                type="time"
                value={closingTime}
                onChange={e => setClosingTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('saleRevenue')} <span className="text-gray-400">({t('currency')} - {t('optional')})</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={saleRevenueInput}
              onChange={e => setSaleRevenueInput(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCloseModal(false)}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium"
            >
              {t('confirm')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Confirm Delete Expense ────────────────────────────────────── */}
      <Modal
        isOpen={deletingExpenseId !== null}
        onClose={() => setDeletingExpenseId(null)}
        title={t('deleteExpense')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{t('confirmDeleteExpense')}</p>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingExpenseId(null)}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
            >
              {t('no')}
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteExpense}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium"
            >
              {t('yes')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
