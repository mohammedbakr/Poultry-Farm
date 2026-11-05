// src/components/BottomNav.tsx
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function BottomNav() {
  const { t } = useTranslation();

  const navItems = [
    { to: '/',        label: t('dashboard'), icon: '🏠' },
    { to: '/batches', label: t('batches'),   icon: '🐔' },
    { to: '/settings',label: t('settings'),  icon: '⚙️' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-40">
      <div className="flex">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 pt-2 pb-3 text-xs gap-0.5 transition-colors ${
                isActive ? 'text-primary-600 font-semibold' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
