// src/pages/Settings.tsx
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getAllSpecies, createSpecies, deleteSpecies } from '../services/speciesService';
import { downloadBackup, validateBackup, restoreBackup, type BackupPayload } from '../services/backupService';
import Modal from '../components/Modal';
import type { Species } from '../types';

const EMOJI_OPTIONS = ['🐔', '🐦', '🥚', '🦃', '🦆', '🐧', '🕊️', '🦅'];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [species, setSpecies] = useState<Species[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState('🐔');
  const [saving, setSaving] = useState(false);

  // Backup & Restore states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  async function loadSpecies() {
    setSpecies(await getAllSpecies());
  }

  useEffect(() => { loadSpecies(); }, []);

  async function handleAddSpecies(e: React.FormEvent) {
    e.preventDefault();
    if (!nameAr) return;
    setSaving(true);
    await createSpecies(nameAr, nameEn || nameAr, icon);
    setNameAr(''); setNameEn(''); setIcon('🐔');
    setShowAdd(false);
    setSaving(false);
    loadSpecies();
  }

  async function handleDeleteSpecies(id: number) {
    await deleteSpecies(id);
    loadSpecies();
  }

  function toggleLang() {
    const next = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(next);
  }

  async function handleExport() {
    try {
      const filename = await downloadBackup();
      setBackupMessage({
        type: 'success',
        text: `${t('backupExportSuccess')} (${filename})`,
      });
    } catch (err) {
      setBackupMessage({
        type: 'error',
        text: String(err),
      });
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const result = validateBackup(content);
      if (!result.valid || !result.backup) {
        setBackupMessage({
          type: 'error',
          text: t('backupImportError', { error: result.error ?? 'Invalid format' }),
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setPendingBackup(result.backup);
      setShowRestoreModal(true);
    };

    reader.onerror = () => {
      setBackupMessage({
        type: 'error',
        text: 'Failed to read backup file.',
      });
    };

    reader.readAsText(file);
  }

  async function confirmRestore() {
    if (!pendingBackup) return;
    setIsRestoring(true);
    try {
      const counts = await restoreBackup(pendingBackup);
      setShowRestoreModal(false);
      setPendingBackup(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setBackupMessage({
        type: 'success',
        text: t('backupImportSuccess', {
          batches: counts.batchesCount,
          tasks: counts.tasksCount,
          expenses: counts.expensesCount,
        }),
      });
      await loadSpecies();
    } catch (err) {
      setBackupMessage({
        type: 'error',
        text: t('backupImportError', { error: String(err) }),
      });
    } finally {
      setIsRestoring(false);
    }
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">{t('settings')}</h1>

      {/* Language toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="font-semibold text-gray-800 mb-3">🌐 {t('language')}</h2>
        <button
          onClick={toggleLang}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl active:bg-gray-100"
        >
          <span className="text-sm text-gray-700">
            {i18n.language === 'ar' ? '🇪🇬 العربية' : '🇬🇧 English'}
          </span>
          <span className="text-primary-600 text-sm font-medium">
            {i18n.language === 'ar' ? '→ English' : '→ العربية'}
          </span>
        </button>
      </div>

      {/* Backup and Restore */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="font-semibold text-gray-800 mb-1">💾 {t('backupAndRestore')}</h2>
        <p className="text-xs text-gray-500 mb-4">
          {i18n.language === 'ar'
            ? 'تصدير كافة بيانات المزرعة إلى ملف أو استعادتها على أي جهاز آخر.'
            : 'Export all farm data to a file or restore it on any other device.'}
        </p>

        {backupMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-medium mb-3 flex items-start justify-between gap-2 ${
              backupMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{backupMessage.text}</span>
            <button
              onClick={() => setBackupMessage(null)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-primary-50 text-primary-700 rounded-xl font-medium text-sm border border-primary-200 active:bg-primary-100 transition-colors"
          >
            <span>⬇️</span>
            <span>{t('exportBackup')}</span>
          </button>

          <label className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 text-gray-700 rounded-xl font-medium text-sm border border-gray-200 active:bg-gray-100 cursor-pointer transition-colors">
            <span>⬆️</span>
            <span>{t('importBackup')}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </div>
      </div>

      {/* Species management */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">🐦 {t('manageSpecies')}</h2>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="text-primary-600 text-sm font-medium"
          >
            + {t('addSpecies')}
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAddSpecies} className="mb-4 p-3 bg-gray-50 rounded-xl space-y-3">
            <div>
              <label className={label}>{t('icon')}</label>
              <div className="flex gap-2 flex-wrap">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setIcon(e)}
                    className={`text-2xl w-10 h-10 rounded-lg flex items-center justify-center ${icon === e ? 'bg-primary-100 ring-2 ring-primary-400' : 'bg-white border border-gray-200'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>{t('speciesNameAr')}</label>
              <input className={field} value={nameAr} onChange={e => setNameAr(e.target.value)} required dir="rtl" />
            </div>
            <div>
              <label className={label}>{t('speciesNameEn')} <span className="text-gray-400">({t('optional')})</span></label>
              <input className={field} value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-white border border-gray-200 rounded-xl text-sm">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="flex-1 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium disabled:opacity-60">{t('save')}</button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {species.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name_ar}</p>
                  <p className="text-xs text-gray-400">{s.name_en}</p>
                </div>
              </div>
              {/* Only allow deleting non-seeded species (id > 4) */}
              {s.id > 4 && (
                <button
                  onClick={() => handleDeleteSpecies(s.id)}
                  className="text-red-400 text-sm px-2 py-1 rounded-lg active:bg-red-50"
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => {
          if (!isRestoring) {
            setShowRestoreModal(false);
            setPendingBackup(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        }}
        title={t('importConfirmTitle')}
      >
        <div className="space-y-4">
          <p className="text-sm text-red-600">
            {t('importConfirmText')}
          </p>

          {pendingBackup && (
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
              <p>📦 <strong>Version:</strong> v{pendingBackup.version}</p>
              <p>📅 <strong>Exported:</strong> {new Date(pendingBackup.exportedAt).toLocaleString()}</p>
              <p>🐔 <strong>Batches:</strong> {pendingBackup.data.batches.length}</p>
              <p>📋 <strong>Tasks:</strong> {pendingBackup.data.scheduled_tasks.length}</p>
              <p>💸 <strong>Expenses:</strong> {pendingBackup.data.expenses?.length ?? 0}</p>
              <p>🐦 <strong>Species:</strong> {pendingBackup.data.species.length}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={isRestoring}
              onClick={() => {
                setShowRestoreModal(false);
                setPendingBackup(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={isRestoring}
              onClick={confirmRestore}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-60"
            >
              {isRestoring ? '...' : t('confirm')}
            </button>
          </div>
        </div>
      </Modal>

      {/* App info */}
      <div className="text-center text-xs text-gray-400 pb-4">
        <p>🐔 Poultry Manager PWA v1.0</p>
        <p>مزرعتي — Offline-first Progressive Web App</p>
      </div>
    </div>
  );
}
