// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { initDb } from './db/database';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Batches from './pages/Batches';
import BatchDetail from './pages/BatchDetail';
import Settings from './pages/Settings';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await initDb();
        setDbReady(true);
      } catch (err) {
        console.error('[App] Database init error', err);
        setDbError(String(err));
      }
    }
    init();
  }, []);

  if (dbError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 text-center">
        <div>
          <div className="text-5xl mb-4">❌</div>
          <p className="text-red-600 font-medium">Database Error</p>
          <p className="text-gray-500 text-sm mt-2">{dbError}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🐔</div>
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-gray-50 font-sans">
        <main className="max-w-lg mx-auto px-4 pt-5 pb-24">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/batches"     element={<Batches />} />
            <Route path="/batches/:id" element={<BatchDetail />} />
            <Route path="/settings"    element={<Settings />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
