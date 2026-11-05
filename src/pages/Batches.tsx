// src/pages/Batches.tsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllBatches } from '../services/batchService';
import Modal from '../components/Modal';
import BatchForm from '../components/BatchForm';
import type { Batch } from '../types';

export default function Batches() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAllBatches();
    setBatches(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const STATUS_BADGE: Record<string, string> = {
    active: 'bg-primary-100 text-primary-700',
    sold:   'bg-blue-100 text-blue-700',
    closed: 'bg-gray-100 text-gray-500',
  };

  function getDaysOld(purchaseDate: string) {
    const diff = Date.now() - new Date(purchaseDate).getTime();
    return Math.floor(diff / 86400000);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t('batches')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 active:bg-primary-600"
        >
          <span className="text-base">+</span> {t('addBatch')}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="text-4xl animate-bounce">🐔</div>
        </div>
      )}

      {!loading && batches.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-6xl mb-4">🐣</div>
          <p className="text-lg mb-2 text-gray-600">{t('noBatches')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-primary-500 text-white px-6 py-3 rounded-xl font-medium"
          >
            {t('addBatch')}
          </button>
        </div>
      )}

      {batches.map(batch => (
        <Link
          key={batch.id}
          to={`/batches/${batch.id}`}
          className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:bg-gray-50 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">{batch.species_icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[batch.status]}`}>
                  {t(batch.status)}
                </span>
                <span className="text-xs text-gray-400">{isAr ? batch.species_name_ar : batch.species_name_en}</span>
              </div>
              <h3 className="font-bold text-gray-900 leading-snug">{batch.name}</h3>
              <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                <span>🐦 {batch.current_count} {isAr ? 'طير' : 'birds'}</span>
                <span>📅 {t('daysOld', { days: getDaysOld(batch.purchase_date) })}</span>
              </div>
            </div>
            <div className="text-gray-300 text-xl">{isAr ? '‹' : '›'}</div>
          </div>
        </Link>
      ))}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={t('addBatch')}>
        <BatchForm
          onSaved={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
