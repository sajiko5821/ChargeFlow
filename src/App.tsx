import { useState, useEffect } from 'react';
import { useDatabase } from './hooks/useDatabase';
import { useTheme } from './hooks/useTheme';
import { useI18n } from './i18n/I18nContext';
import { BottomNav } from './components/BottomNav';
import { CarTab } from './components/CarTab';
import { ChargingTab } from './components/ChargingTab';
import { CalculatorTab } from './components/CalculatorTab';
import { StatisticsTab } from './components/StatisticsTab';
import type { TabId } from './types';
import { Zap, Loader2, Sun, Moon, Languages } from 'lucide-react';

const validTabs: TabId[] = ['charging', 'statistics', 'calculator', 'car'];

function getTabFromPath(): TabId {
  const pathname = window.location.pathname;
  // Extract tab name from path (e.g., '/car' -> 'car', '/charging' -> 'charging')
  const segments = pathname.split('/').filter(Boolean);
  const tab = segments[0] || 'charging';
  return validTabs.includes(tab as TabId) ? (tab as TabId) : 'charging';
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromPath);
  const {
    ready,
    carData,
    sessions,
    deals,
    saveCar,
    addSession,
    updateSession,
    deleteSession,
    addDeal,
    updateDeal,
    deleteDeal,
  } = useDatabase();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();

  // Sync activeTab with URL path
  useEffect(() => {
    const newPath = `/${activeTab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [activeTab]);

  // Sync URL path changes (browser back/forward) with activeTab
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPath();
      setActiveTab(tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] gap-3 text-[var(--color-text-muted)]">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <p className="text-sm font-medium">{t.loadingDatabase}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-lg mx-auto w-full">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-header-bg)] backdrop-blur-sm border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-[var(--color-text)]">ChargeFlow</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}
              className="p-2 rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-highlight-muted)] active:scale-90 transition-all flex items-center gap-1"
              aria-label="Switch language"
            >
              <Languages size={18} />
              <span className="text-xs font-bold uppercase">{locale}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-highlight-muted)] active:scale-90 transition-all"
              aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'car' && (
          <CarTab
            carData={carData}
            deals={deals}
            onSave={saveCar}
            onAddDeal={addDeal}
            onUpdateDeal={updateDeal}
            onDeleteDeal={deleteDeal}
          />
        )}
        {activeTab === 'charging' && (
          <ChargingTab
            sessions={sessions}
            deals={deals}
            onAddSession={addSession}
            onUpdateSession={updateSession}
            onDeleteSession={deleteSession}
          />
        )}
        {activeTab === 'calculator' && <CalculatorTab carData={carData} />}
        {activeTab === 'statistics' && <StatisticsTab sessions={sessions} />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
