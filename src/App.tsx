import { useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { AdminPanel } from './components/AdminPanel.tsx';
import { CalendarGrid } from './components/CalendarGrid.tsx';
import { CodeLookupModal } from './components/CodeLookupModal.tsx';
import { DoorModal } from './components/DoorModal.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { InfoSections } from './components/InfoSections.tsx';
import { Navbar } from './components/Navbar.tsx';
import { SnowfallOverlay } from './components/SnowfallOverlay.tsx';
import { auth } from './firebase.ts';
import { checkIsUserAdmin, subscribeToPublicCalendar } from './lib/firebaseCalendar.ts';
import type { PublicCalendarResponse, PublicDoorView, WinnerReceipt } from './types/calendar.ts';

const RECEIPTS_STORAGE_KEY = 'albas_2026_winner_receipts';

function loadSavedReceipts(): WinnerReceipt[] {
  try {
    const raw = window.localStorage.getItem(RECEIPTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WinnerReceipt[]) : [];
  } catch {
    return [];
  }
}

function AdventCalendarApp() {
  const [calendarData, setCalendarData] = useState<PublicCalendarResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDoor, setSelectedDoor] = useState<PublicDoorView | null>(null);
  const [lookupOpen, setLookupOpen] = useState(false);

  const [isAdminView, setIsAdminView] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);

  const [savedReceipts, setSavedReceipts] = useState<WinnerReceipt[]>(() => loadSavedReceipts());

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const ok = await checkIsUserAdmin(user);
        setIsAdminAuthorized(ok);
      } else {
        setIsAdminAuthorized(false);
      }
      setAuthReady(true);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    setLoadError(null);
    const unsubscribe = subscribeToPublicCalendar(
      (data) => {
        setCalendarData(data);
        setLoadError(null);
        setSavedReceipts((prev) => {
          const claimedDays = new Set(data.doors.filter((d) => d.isClaimed).map((d) => d.day));
          const synced = prev.filter((r) => claimedDays.has(r.day));
          if (synced.length !== prev.length) {
            try {
              window.localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(synced));
            } catch {
              // Ignore storage errors
            }
          }
          return synced;
        });
      },
      () => {
        setLoadError('No se pudo conectar con la base de datos del calendario. Inténtalo de nuevo en unos segundos.');
      }
    );
    return () => unsubscribe();
  }, [retryCounter]);

  const refreshCalendar = useCallback(() => {
    setRetryCounter((prev) => prev + 1);
  }, []);

  const handleClaimSuccess = (receipt: WinnerReceipt) => {
    setSavedReceipts((prev) => {
      const filtered = prev.filter((item) => item.claimCode !== receipt.claimCode);
      const updated = [...filtered, receipt];
      try {
        window.localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage quota errors
      }
      return updated;
    });
  };

  const handleExploreCalendar = () => {
    const availableDoor = calendarData?.doors.find((d) => d.state === 'available_now');
    if (availableDoor) {
      setSelectedDoor(availableDoor);
      return;
    }
    const el = document.getElementById('calendario');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenSavedReceipt = (receipt: WinnerReceipt) => {
    const matchingDoor = calendarData?.doors.find((d) => d.day === receipt.day);
    if (matchingDoor) {
      setSelectedDoor(matchingDoor);
    }
  };

  const availableTodayDoor = calendarData?.doors.find((d) => d.state === 'available_now') ?? null;

  const savedReceiptForSelectedDoor =
    selectedDoor !== null ? savedReceipts.find((r) => r.day === selectedDoor.day) ?? null : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen flex flex-col bg-[#FFF9FB] text-[#231520]">
        {!isAdminView && <SnowfallOverlay />}
        <Navbar
          salonName={calendarData?.config.salonName || 'Alba’s Beauty Salón'}
          isAdminView={isAdminView}
          isAuthenticated={Boolean(firebaseUser && isAdminAuthorized)}
          onOpenAdmin={() => setIsAdminView(true)}
          onBackToCalendar={() => setIsAdminView(false)}
        />

        {isAdminView ? (
          <div className="flex-1">
            <AdminPanel
              authReady={authReady}
              user={firebaseUser}
              isAuthorized={isAdminAuthorized}
              onAdminVerified={(verified) => setIsAdminAuthorized(verified)}
            />
          </div>
        ) : (
          <main className="flex-1">
            {loadError ? (
              <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-4">
                <h1 className="font-display text-3xl font-semibold text-[#231520]">
                  Alba’s Beauty Salón · Calendario de Adviento 2026
                </h1>
                <p className="text-sm text-[#6B4C5E]">{loadError}</p>
                <button
                  type="button"
                  onClick={refreshCalendar}
                  className="px-5 py-2.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-sm font-medium transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : !calendarData ? (
              <div className="max-w-6xl mx-auto px-6 py-20 text-center text-sm text-[#6B4C5E]">
                Cargando calendario de belleza...
              </div>
            ) : (
              <>
                <HeroSection
                  config={calendarData.config}
                  time={calendarData.time}
                  availableTodayDay={availableTodayDoor ? availableTodayDoor.day : null}
                  savedReceipts={savedReceipts}
                  onExploreCalendar={handleExploreCalendar}
                  onOpenLookup={() => setLookupOpen(true)}
                  onOpenSavedReceipt={handleOpenSavedReceipt}
                />

                <CalendarGrid
                  doors={calendarData.doors}
                  openHour={calendarData.config.openHour}
                  openMinute={calendarData.config.openMinute}
                  onSelectDoor={(door) => setSelectedDoor(door)}
                />

                <InfoSections config={calendarData.config} />

                <DoorModal
                  door={selectedDoor}
                  savedReceiptForDoor={savedReceiptForSelectedDoor}
                  config={calendarData.config}
                  onClose={() => setSelectedDoor(null)}
                  onClaimSuccess={handleClaimSuccess}
                />

                <CodeLookupModal isOpen={lookupOpen} onClose={() => setLookupOpen(false)} />
              </>
            )}
          </main>
        )}

        <footer className="border-t border-[#F5D0DF] bg-[#FFF2F7] py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B4C5E]">
            <div className="text-center sm:text-left space-y-1">
              <p className="font-display text-base font-semibold text-[#231520]">
                {calendarData?.config.salonName || 'Alba’s Beauty Salón'}
              </p>
              <p>
                {calendarData?.config.locationText || 'Alicante, España'} · Instagram / TikTok{' '}
                {calendarData?.config.instagramHandle || '@albas.beauttysalon'} · WhatsApp +
                {calendarData?.config.whatsappNumber || '34624531323'}
              </p>
            </div>
            <p className="text-center sm:text-right">
              Calendario de Adviento 2026 · 24 días de belleza y sorpresas.
            </p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AdventCalendarApp />
    </ErrorBoundary>
  );
}
