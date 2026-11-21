import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  LayoutDashboard,
  Lock,
  LogOut,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  Trophy,
  Upload,
  UserPlus,
} from 'lucide-react';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  DEFAULT_FOUNDER_PHOTO,
  resolveAssetPath,
} from '../lib/calendarDefaults.ts';
import {
  addAuthorizedAdminEmail,
  checkIsUserAdmin,
  fetchAdminDashboard,
  lookupAdminClaim,
  markClaimRedeemed,
  removeAuthorizedAdminEmail,
  resetAllTestClaims,
  saveAdminCampaignConfig,
  signInAdminWithGoogle,
  signOutAdmin,
  updateAdminDoor,
  voidClaimByDay,
} from '../lib/firebaseCalendar.ts';
import type { AdminClaimRecord, AdminDashboardResponse, AdminDoorRecord } from '../types/calendar.ts';

interface AdminPanelProps {
  authReady: boolean;
  user: User | null;
  isAuthorized: boolean;
  onAdminVerified: (verified: boolean) => void;
}

type AdminTab = 'overview' | 'calendar' | 'winners' | 'redemptions' | 'photo' | 'config';

async function compressPortraitToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      el.src = objectUrl;
    });

    const maxWidth = 480;
    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo procesar la fotografía en el navegador.');
    }
    ctx.drawImage(img, 0, 0, width, height);

    let dataUrl = canvas.toDataURL('image/webp', 0.8);
    if (dataUrl.length > 180000 || !dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    }
    if (dataUrl.length > 195000) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    }
    if (dataUrl.length > 195000) {
      throw new Error('La fotografía es demasiado pesada incluso tras optimizarla. Prueba con otra imagen.');
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function AdminPanel({
  authReady,
  user,
  isAuthorized,
  onAdminVerified,
}: AdminPanelProps) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Calendar Door Edit state
  const [editingDoor, setEditingDoor] = useState<AdminDoorRecord | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCat, setEditCat] = useState('');

  // Exceptional void state
  const [voidingDay, setVoidingDay] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Winners filter
  const [winnerSearch, setWinnerSearch] = useState('');

  // Redemptions lookup
  const [redeemSearchCode, setRedeemSearchCode] = useState('');
  const [lookedUpClaim, setLookedUpClaim] = useState<AdminClaimRecord | null>(null);
  const [redeemNote, setRedeemNote] = useState('');

  // Config form state
  const [cfgOpenHour, setCfgOpenHour] = useState(22);
  const [cfgOpenMin, setCfgOpenMin] = useState(0);
  const [cfgCloseHour, setCfgCloseHour] = useState(23);
  const [cfgCloseMin, setCfgCloseMin] = useState(59);
  const [cfgValidity, setCfgValidity] = useState('2027-01-31');
  const [cfgWhatsapp, setCfgWhatsapp] = useState('');
  const [cfgInstagram, setCfgInstagram] = useState('');
  const [cfgTiktok, setCfgTiktok] = useState('');
  const [cfgLocation, setCfgLocation] = useState('');
  const [cfgSlogan, setCfgSlogan] = useState('');
  const [cfgConditionsText, setCfgConditionsText] = useState('');
  const [cfgSimIso, setCfgSimIso] = useState<string>('');
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const actorEmail = user?.email || 'alba';

  const syncConfigFields = useCallback((dash: AdminDashboardResponse) => {
    setCfgOpenHour(dash.config.openHour);
    setCfgOpenMin(dash.config.openMinute);
    setCfgCloseHour(dash.config.closeHour);
    setCfgCloseMin(dash.config.closeMinute);
    setCfgValidity(dash.config.validityEndDate);
    setCfgWhatsapp(dash.config.whatsappNumber);
    setCfgInstagram(dash.config.instagramHandle);
    setCfgTiktok(dash.config.tiktokHandle);
    setCfgLocation(dash.config.locationText);
    setCfgSlogan(dash.config.slogan);
    setCfgConditionsText(dash.config.conditions.join('\n'));
    setCfgSimIso(dash.config.simulationIso || '');
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!user || !isAuthorized || !user.email) return;
    setLoading(true);
    try {
      const dash = await fetchAdminDashboard(user.email);
      setData(dash);
      syncConfigFields(dash);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error al cargar los datos del panel.',
      });
    } finally {
      setLoading(false);
    }
  }, [user, isAuthorized, syncConfigFields]);

  useEffect(() => {
    if (authReady && user && isAuthorized) {
      void loadDashboard();
    } else {
      setData(null);
    }
  }, [authReady, user, isAuthorized, loadDashboard]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const signedInUser = await signInAdminWithGoogle();
      const allowed = await checkIsUserAdmin(signedInUser);
      onAdminVerified(allowed);
      if (!allowed) {
        setAuthError(
          `La cuenta ${signedInUser.email || ''} no está autorizada para administrar este calendario. Inicia sesión con una cuenta autorizada.`
        );
      }
    } catch (err) {
      setAuthError(
        err instanceof Error && err.message.includes('popup')
          ? 'No se pudo completar la ventana de inicio de sesión con Google. Permite las ventanas emergentes e inténtalo de nuevo.'
          : 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.'
      );
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setFeedback(null);
    setAuthError(null);
    await signOutAdmin();
    onAdminVerified(false);
  };

  const handleSaveDoor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoor || !user) return;
    setFeedback(null);
    try {
      const updated = await updateAdminDoor(editingDoor.day, editTitle, editDesc, editCat, actorEmail);
      setData(updated);
      setEditingDoor(null);
      setFeedback({ type: 'ok', text: `Premio del día ${editingDoor.day} actualizado correctamente.` });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'No se pudo guardar el premio.',
      });
    }
  };

  const handleVoidClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (voidingDay === null || !user) return;
    setFeedback(null);
    try {
      const updated = await voidClaimByDay(voidingDay, voidReason, actorEmail);
      setData(updated);
      setVoidingDay(null);
      setVoidReason('');
      setFeedback({ type: 'ok', text: `Intervención excepcional registrada en el día ${voidingDay}.` });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'No se pudo anular la adjudicación.',
      });
    }
  };

  const handleLookupRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemSearchCode.trim()) return;
    setFeedback(null);
    setLookedUpClaim(null);
    try {
      const found = await lookupAdminClaim(redeemSearchCode);
      if (!found) {
        setFeedback({ type: 'err', text: 'Código no encontrado en los registros del calendario.' });
        return;
      }
      setLookedUpClaim(found);
    } catch {
      setFeedback({ type: 'err', text: 'Error al verificar el código.' });
    }
  };

  const handleMarkRedeemed = async (claimCode: string) => {
    if (!user) return;
    setFeedback(null);
    try {
      const updated = await markClaimRedeemed(claimCode, redeemNote, actorEmail);
      setData(updated);
      const found = updated.claims.find((c) => c.claimCode === claimCode) || null;
      setLookedUpClaim(found);
      setRedeemNote('');
      setFeedback({ type: 'ok', text: `Código ${claimCode} marcado como canjeado y bloqueado definitivamente.` });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'No se pudo registrar el canje.',
      });
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!data || !user) return;
    setFeedback(null);
    if (data.config.founderPhotoMode === 'fixed') {
      setFeedback({
        type: 'err',
        text: 'La fotografía está configurada como fija. Cámbiala a modo editable para subir una nueva imagen.',
      });
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setFeedback({ type: 'err', text: 'La imagen seleccionada supera el límite de 6 MB.' });
      return;
    }

    try {
      const compressedDataUrl = await compressPortraitToDataUrl(file);
      const updated = await saveAdminCampaignConfig(
        {
          ...data.config,
          founderPhotoUrl: compressedDataUrl,
        },
        actorEmail,
        'PHOTO_UPDATED',
        'Nueva fotografía de Alba actualizada desde el panel de administración.'
      );
      setData(updated);
      setFeedback({ type: 'ok', text: 'Fotografía de Alba actualizada en el calendario.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error al subir la fotografía.',
      });
    }
  };

  const handlePhotoModeChange = async (mode: 'fixed' | 'editable') => {
    if (!data || !user) return;
    setFeedback(null);
    try {
      const updated = await saveAdminCampaignConfig(
        {
          ...data.config,
          founderPhotoMode: mode,
        },
        actorEmail,
        'PHOTO_MODE_CHANGED',
        `Modo de fotografía actualizado a: ${mode === 'fixed' ? 'Imagen fija' : 'Editable'}.`
      );
      setData(updated);
      setFeedback({
        type: 'ok',
        text: mode === 'fixed' ? 'Fotografía fijada en portada.' : 'Fotografía habilitada para actualización.',
      });
    } catch {
      setFeedback({ type: 'err', text: 'Error al cambiar el modo de fotografía.' });
    }
  };

  const handleResetPhoto = async () => {
    if (!data || !user) return;
    setFeedback(null);
    try {
      const updated = await saveAdminCampaignConfig(
        {
          ...data.config,
          founderPhotoUrl: DEFAULT_FOUNDER_PHOTO,
        },
        actorEmail,
        'PHOTO_RESET',
        'Fotografía de Alba restaurada a la imagen de estudio original.'
      );
      setData(updated);
      setFeedback({ type: 'ok', text: 'Retrato restaurado a la fotografía original.' });
    } catch {
      setFeedback({ type: 'err', text: 'No se pudo restaurar la fotografía.' });
    }
  };

  const handleSaveConfig = async (overrideSimIso?: string | null, overrideTestUnlockAll?: boolean) => {
    if (!data || !user) return;
    setFeedback(null);

    if (
      cfgOpenHour < 0 ||
      cfgOpenHour > 23 ||
      cfgOpenMin < 0 ||
      cfgOpenMin > 59 ||
      cfgCloseHour < 0 ||
      cfgCloseHour > 23 ||
      cfgCloseMin < 0 ||
      cfgCloseMin > 59
    ) {
      setFeedback({ type: 'err', text: 'Horario de apertura o cierre no válido.' });
      return;
    }

    const cleanWhatsapp = cfgWhatsapp.replace(/[^0-9]/g, '');
    if (cleanWhatsapp.length < 9 || cleanWhatsapp.length > 15) {
      setFeedback({ type: 'err', text: 'El número de WhatsApp debe tener entre 9 y 15 dígitos.' });
      return;
    }

    const simValue = overrideSimIso !== undefined ? overrideSimIso : cfgSimIso || null;
    const testUnlock = overrideTestUnlockAll !== undefined ? overrideTestUnlockAll : data.config.testUnlockAll;
    const conditions = cfgConditionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    try {
      const updated = await saveAdminCampaignConfig(
        {
          ...data.config,
          openHour: cfgOpenHour,
          openMinute: cfgOpenMin,
          closeHour: cfgCloseHour,
          closeMinute: cfgCloseMin,
          validityEndDate: cfgValidity,
          whatsappNumber: cleanWhatsapp,
          instagramHandle: cfgInstagram.trim() || data.config.instagramHandle,
          tiktokHandle: cfgTiktok.trim() || data.config.tiktokHandle,
          locationText: cfgLocation.trim() || data.config.locationText,
          slogan: cfgSlogan.trim() || data.config.slogan,
          conditions: conditions.length > 0 ? conditions : data.config.conditions,
          simulationIso: simValue,
          testUnlockAll: testUnlock,
        },
        actorEmail
      );
      setData(updated);
      syncConfigFields(updated);
      setFeedback({ type: 'ok', text: 'Configuración guardada correctamente en Firebase.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'No se pudo guardar la configuración.',
      });
    }
  };

  const handleResetTestClaims = async () => {
    if (!user) return;
    setFeedback(null);
    try {
      const updated = await resetAllTestClaims(actorEmail);
      setData(updated);
      setConfirmResetAll(false);
      setLookedUpClaim(null);
      setFeedback({
        type: 'ok',
        text: 'Todas las adjudicaciones de prueba se eliminaron y las 24 casillas están disponibles.',
      });
    } catch {
      setFeedback({ type: 'err', text: 'Error al reiniciar las casillas.' });
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setFeedback(null);
    try {
      const updated = await addAuthorizedAdminEmail(newAdminEmail, actorEmail);
      setData(updated);
      setNewAdminEmail('');
      setFeedback({ type: 'ok', text: 'Cuenta Gmail autorizada correctamente para el panel de Alba.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'No se pudo autorizar el correo.',
      });
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    setFeedback(null);
    try {
      const updated = await removeAuthorizedAdminEmail(email, actorEmail);
      setData(updated);
      setFeedback({ type: 'ok', text: `Acceso retirado para ${email}.` });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'No se pudo retirar el acceso.',
      });
    }
  };

  if (!authReady) {
    return (
      <section className="py-12 sm:py-20 bg-[#FFF9FB] min-h-[75vh] flex items-center justify-center px-4">
        <div className="text-sm text-[#6B4C5E]">Comprobando sesión de Firebase...</div>
      </section>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <section className="py-12 sm:py-20 bg-[#FFF9FB] min-h-[75vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-[#F0C2D5] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#FFF0F5] border border-[#D4A853] text-[#BE185D]">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-[#231520]">Panel privado de Alba</h1>
            <p className="text-sm text-[#6B4C5E]">
              Inicia sesión con tu cuenta de Google autorizada para administrar premios, ganadoras, canjes y fotografía de la campaña.
            </p>
          </div>

          {user && !isAuthorized && (
            <div
              role="alert"
              className="rounded-xl bg-[#FDECEC] border border-[#F5C2C2] p-4 space-y-2 text-xs text-[#9D2A2A]"
            >
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Acceso restringido</span>
              </div>
              <p>
                Has iniciado sesión como <strong>{user.email}</strong>, pero esta cuenta no tiene permisos de administración.
              </p>
            </div>
          )}

          {authError && (
            <p role="alert" className="text-sm text-[#9D2A2A] bg-[#FDECEC] border border-[#F5C2C2] rounded-lg px-4 py-2.5">
              {authError}
            </p>
          )}

          <div className="space-y-3">
            <button
              type="button"
              disabled={authSubmitting}
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>{authSubmitting ? 'Conectando con Google...' : 'Acceder con Google'}</span>
            </button>

            {user && !isAuthorized && (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-lg border border-[#F0C2D5] text-xs font-medium text-[#5A3E4E] hover:bg-[#FFF0F5]"
              >
                Cerrar sesión y probar otra cuenta
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const navTabs: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Resumen general', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'winners', label: 'Ganadoras', icon: Trophy },
    { id: 'redemptions', label: 'Canjes', icon: ClipboardCheck },
    { id: 'photo', label: 'Fotografía', icon: Camera },
    { id: 'config', label: 'Configuración', icon: Settings },
  ];

  const filteredClaims = (data?.claims || []).filter((c) => {
    const q = winnerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.claimCode.toLowerCase().includes(q) ||
      c.prizeTitle.toLowerCase().includes(q) ||
      c.winnerRef.toLowerCase().includes(q) ||
      String(c.day) === q
    );
  });

  return (
    <section className="py-8 bg-[#FFF9FB] min-h-[82vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 shrink-0 space-y-4">
            <div className="rounded-xl bg-white border border-[#F2C6D8] p-4 space-y-4">
              <div className="pb-3 border-b border-[#F5D0DF]">
                <p className="text-xs text-[#BE185D] font-medium">Administración privada</p>
                <p className="font-display text-xl font-semibold text-[#231520] truncate">
                  {user.displayName || 'Alba'}
                </p>
                <p className="text-[11px] text-[#6B4C5E] truncate">{user.email}</p>
              </div>

              <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setFeedback(null);
                      }}
                      className={`option-tile flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium border whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#BE185D] border-[#BE185D] text-white'
                          : 'bg-white border-transparent text-[#5A3E4E] hover:bg-[#FFF0F5] hover:border-[#F0C2D5] hover:text-[#231520]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-[#F5D0DF]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#F0C2D5] text-xs font-medium text-[#6B4C5E] hover:text-[#231520] hover:bg-[#FFF0F5] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0 space-y-6">
            {feedback && (
              <div
                role="status"
                className={`rounded-xl px-4 py-3 text-sm border ${
                  feedback.type === 'ok'
                    ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                    : 'bg-[#FDECEC] border-[#F5C2C2] text-[#9D2A2A]'
                }`}
              >
                {feedback.text}
              </div>
            )}

            {loading && !data ? (
              <div className="rounded-xl bg-white border border-[#F2C6D8] p-8 text-center text-sm text-[#6B4C5E]">
                Cargando panel de administración en Firebase...
              </div>
            ) : data ? (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h2 className="font-display text-3xl font-semibold text-[#231520]">Resumen general</h2>
                        <p className="text-sm text-[#6B4C5E]">
                          Hora oficial ({data.config.timezone}):{' '}
                          <span className="font-mono tabular-nums text-[#231520]">
                            {data.time.madridDate} {data.time.madridTime}
                          </span>
                          {data.time.isSimulated && ' · Simulación de pruebas activa'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="option-tile rounded-xl bg-white border border-[#F2C6D8] hover:border-[#D4A853] p-4">
                        <span className="text-xs text-[#6B4C5E] block">Total de premios</span>
                        <span className="font-mono text-2xl font-semibold text-[#231520] tabular-nums mt-1 block">
                          {data.stats.totalPrizes}
                        </span>
                      </div>
                      <div className="option-tile rounded-xl bg-white border border-[#F2C6D8] hover:border-[#BE185D] p-4">
                        <span className="text-xs text-[#6B4C5E] block">Premios adjudicados</span>
                        <span className="font-mono text-2xl font-semibold text-[#BE185D] tabular-nums mt-1 block">
                          {data.stats.claimedCount}
                        </span>
                      </div>
                      <div className="option-tile rounded-xl bg-white border border-[#F2C6D8] hover:border-[#D4A853] p-4">
                        <span className="text-xs text-[#6B4C5E] block">Pendientes de adjudicar</span>
                        <span className="font-mono text-2xl font-semibold text-[#231520] tabular-nums mt-1 block">
                          {data.stats.pendingAwardCount}
                        </span>
                      </div>
                      <div className="option-tile rounded-xl bg-white border border-[#F2C6D8] hover:border-[#16A34A] p-4">
                        <span className="text-xs text-[#6B4C5E] block">Premios canjeados</span>
                        <span className="font-mono text-2xl font-semibold text-[#16A34A] tabular-nums mt-1 block">
                          {data.stats.redeemedCount}
                        </span>
                      </div>
                      <div className="option-tile rounded-xl bg-white border border-[#F2C6D8] hover:border-[#D97706] p-4 col-span-2 sm:col-span-1">
                        <span className="text-xs text-[#6B4C5E] block">Pendientes de canje</span>
                        <span className="font-mono text-2xl font-semibold text-[#D97706] tabular-nums mt-1 block">
                          {data.stats.pendingRedemptionCount}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white border border-[#F2C6D8] p-5 space-y-4">
                      <h3 className="font-display text-xl font-semibold text-[#231520]">
                        Registro de actividad administrativa
                      </h3>
                      {data.auditLogs.length === 0 ? (
                        <p className="text-sm text-[#6B4C5E]">Sin registros recientes.</p>
                      ) : (
                        <div className="divide-y divide-[#F5D0DF]">
                          {data.auditLogs.slice(0, 8).map((log) => (
                            <div
                              key={log.id}
                              className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-[#231520]">{log.action}</span>
                                <span className="text-[#5A3E4E]"> · {log.details}</span>
                              </div>
                              <span className="font-mono text-[#8C5E74] tabular-nums shrink-0">
                                {log.createdAtMadrid} ({log.actor})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'calendar' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-3xl font-semibold text-[#231520]">
                        Calendario (24 casillas)
                      </h2>
                      <p className="text-sm text-[#6B4C5E]">
                        Puedes editar el premio de cualquier casilla aún no adjudicada. Las casillas ya ganadas están bloqueadas contra modificaciones silenciosas.
                      </p>
                    </div>

                    {editingDoor && (
                      <form
                        onSubmit={handleSaveDoor}
                        className="rounded-xl bg-white border border-[#D4A853] p-5 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-display text-xl font-semibold text-[#231520]">
                            Editando premio · Día {editingDoor.day} de diciembre
                          </h3>
                          <button
                            type="button"
                            onClick={() => setEditingDoor(null)}
                            className="text-xs text-[#6B4C5E] hover:text-[#231520]"
                          >
                            Cancelar
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-[#5A3E4E] mb-1">
                              Nombre del premio
                            </label>
                            <input
                              type="text"
                              required
                              minLength={2}
                              maxLength={160}
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm text-[#231520]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#5A3E4E] mb-1">
                              Categoría
                            </label>
                            <input
                              type="text"
                              required
                              minLength={2}
                              maxLength={40}
                              value={editCat}
                              onChange={(e) => setEditCat(e.target.value)}
                              className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm text-[#231520]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#5A3E4E] mb-1">
                            Descripción del premio
                          </label>
                          <textarea
                            required
                            minLength={5}
                            maxLength={500}
                            rows={2}
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm text-[#231520]"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-[#BE185D] text-white text-xs font-medium hover:bg-[#9D174D]"
                          >
                            Guardar cambios
                          </button>
                        </div>
                      </form>
                    )}

                    {voidingDay !== null && (
                      <form
                        onSubmit={handleVoidClaim}
                        className="rounded-xl bg-[#FFFDFB] border border-[#D97706] p-5 space-y-3"
                      >
                        <h3 className="font-display text-xl font-semibold text-[#231520]">
                          Intervención excepcional · Día {voidingDay}
                        </h3>
                        <p className="text-xs text-[#5A3E4E]">
                          Esta acción libera la casilla y elimina el código emitido (por ejemplo, tras pruebas previas al lanzamiento). Quedará registrada permanentemente en la auditoría.
                        </p>
                        <input
                          type="text"
                          required
                          minLength={5}
                          placeholder="Motivo obligatorio de la intervención..."
                          value={voidReason}
                          onChange={(e) => setVoidReason(e.target.value)}
                          className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm text-[#231520]"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setVoidingDay(null);
                              setVoidReason('');
                            }}
                            className="px-3 py-2 rounded-lg border border-[#F0C2D5] text-xs font-medium text-[#5A3E4E]"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-[#B45309] text-white text-xs font-medium hover:bg-[#92400E]"
                          >
                            Confirmar anulación auditada
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="rounded-xl bg-white border border-[#F2C6D8] overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[#F5D0DF] bg-[#FFF0F5] text-xs text-[#6B4C5E]">
                            <th className="py-3 px-4 font-medium">Día</th>
                            <th className="py-3 px-4 font-medium">Categoría</th>
                            <th className="py-3 px-4 font-medium">Premio</th>
                            <th className="py-3 px-4 font-medium">Estado</th>
                            <th className="py-3 px-4 font-medium text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F5D0DF]">
                          {data.doors.map((door) => (
                            <tr key={door.day} className="hover:bg-[#FFF9FB]">
                              <td className="py-3 px-4 font-mono font-semibold tabular-nums text-[#231520]">
                                {String(door.day).padStart(2, '0')} dic
                              </td>
                              <td className="py-3 px-4 text-xs text-[#BE185D] whitespace-nowrap">
                                {door.prizeCategory}
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-medium text-[#231520]">{door.prizeTitle}</p>
                                <p className="text-xs text-[#6B4C5E] line-clamp-1">{door.prizeDescription}</p>
                              </td>
                              <td className="py-3 px-4 text-xs whitespace-nowrap">
                                {door.status === 'claimed' ? (
                                  <span className="text-[#BE185D] font-semibold">Adjudicada</span>
                                ) : door.state === 'available_now' ? (
                                  <span className="text-[#16A34A] font-semibold">Abierta ahora</span>
                                ) : door.state === 'expired' ? (
                                  <span className="text-[#8A727F]">Cerrada</span>
                                ) : (
                                  <span className="text-[#6B4C5E]">Programada</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                {door.status === 'available' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDoor(door);
                                      setEditTitle(door.prizeTitle);
                                      setEditDesc(door.prizeDescription);
                                      setEditCat(door.prizeCategory);
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-[#231520] hover:text-[#BE185D]"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Editar</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVoidingDay(door.day);
                                      setVoidReason('');
                                    }}
                                    className="text-xs font-medium text-[#8C5E74] hover:text-[#B45309]"
                                  >
                                    Anulación auditada
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'winners' && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-3xl font-semibold text-[#231520]">Ganadoras</h2>
                        <p className="text-sm text-[#6B4C5E]">
                          Registro oficial de adjudicaciones, códigos únicos y horas exactas (Europe/Madrid).
                        </p>
                      </div>
                      <div className="relative">
                        <Search className="w-4 h-4 text-[#8C5E74] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                        <input
                          type="text"
                          value={winnerSearch}
                          onChange={(e) => setWinnerSearch(e.target.value)}
                          placeholder="Buscar código, día o premio..."
                          className="pl-9 pr-3 py-2 rounded-lg border border-[#F0C2D5] bg-white text-sm text-[#231520] w-full sm:w-64"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl bg-white border border-[#F2C6D8] overflow-x-auto">
                      {filteredClaims.length === 0 ? (
                        <div className="p-8 text-center text-sm text-[#6B4C5E]">
                          Todavía no hay premios adjudicados que coincidan con la búsqueda.
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-[#F5D0DF] bg-[#FFF0F5] text-xs text-[#6B4C5E]">
                              <th className="py-3 px-4 font-medium">Día</th>
                              <th className="py-3 px-4 font-medium">Premio</th>
                              <th className="py-3 px-4 font-medium">Código único</th>
                              <th className="py-3 px-4 font-medium">ID Registro</th>
                              <th className="py-3 px-4 font-medium">Adjudicación</th>
                              <th className="py-3 px-4 font-medium">Canje</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F5D0DF]">
                            {filteredClaims.map((claim) => (
                              <tr key={claim.id} className="hover:bg-[#FFF9FB]">
                                <td className="py-3 px-4 font-mono font-semibold tabular-nums">
                                  {String(claim.day).padStart(2, '0')} dic
                                </td>
                                <td className="py-3 px-4 font-medium text-[#231520]">{claim.prizeTitle}</td>
                                <td className="py-3 px-4 font-mono text-xs font-semibold text-[#231520] tabular-nums">
                                  {claim.claimCode}
                                </td>
                                <td className="py-3 px-4 font-mono text-xs text-[#6B4C5E] tabular-nums">
                                  {claim.winnerRef}
                                </td>
                                <td className="py-3 px-4 font-mono text-xs text-[#6B4C5E] tabular-nums whitespace-nowrap">
                                  {claim.claimedAtMadrid}
                                </td>
                                <td className="py-3 px-4 text-xs whitespace-nowrap">
                                  {claim.redemptionStatus === 'redeemed' ? (
                                    <span className="text-[#16A34A] font-semibold">Canjeado</span>
                                  ) : (
                                    <span className="text-[#D97706] font-semibold">Pendiente de canje</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'redemptions' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display text-3xl font-semibold text-[#231520]">Control de canjes</h2>
                      <p className="text-sm text-[#6B4C5E]">
                        Verifica la validez de un código presentado por WhatsApp o en el salón y márcalo como utilizado. Una vez canjeado, queda bloqueado definitivamente.
                      </p>
                    </div>

                    <div className="rounded-xl bg-white border border-[#F2C6D8] p-5 space-y-4">
                      <form onSubmit={handleLookupRedeemCode} className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          value={redeemSearchCode}
                          onChange={(e) => setRedeemSearchCode(e.target.value)}
                          placeholder="Introduce el código (ej. ALBA26-D01-...)"
                          className="flex-1 rounded-lg border border-[#F0C2D5] px-3.5 py-2.5 font-mono text-sm uppercase text-[#231520]"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-sm font-medium whitespace-nowrap"
                        >
                          <Search className="w-4 h-4" aria-hidden="true" />
                          <span>Comprobar validez</span>
                        </button>
                      </form>

                      {lookedUpClaim && (
                        <div className="rounded-xl bg-[#FFF0F5] border border-[#D4A853] p-5 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-base font-semibold text-[#231520] tabular-nums">
                              {lookedUpClaim.claimCode}
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                lookedUpClaim.redemptionStatus === 'redeemed' ? 'text-[#6B4C5E]' : 'text-[#16A34A]'
                              }`}
                            >
                              {lookedUpClaim.redemptionStatus === 'redeemed'
                                ? `Canjeado el ${lookedUpClaim.redeemedAtMadrid}`
                                : 'Válido · Pendiente de canje'}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs text-[#BE185D]">Día {lookedUpClaim.day} de diciembre</p>
                            <p className="font-display text-2xl font-semibold text-[#231520]">
                              {lookedUpClaim.prizeTitle}
                            </p>
                            <p className="text-xs text-[#6B4C5E] mt-1">
                              Adjudicado: {lookedUpClaim.claimedAtMadrid} · Registro: {lookedUpClaim.winnerRef}
                            </p>
                          </div>

                          {lookedUpClaim.redemptionStatus === 'pending' ? (
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                              <input
                                type="text"
                                maxLength={240}
                                value={redeemNote}
                                onChange={(e) => setRedeemNote(e.target.value)}
                                placeholder="Nota opcional (ej. Cita 18 dic 17:30)"
                                className="flex-1 rounded-lg border border-[#F0C2D5] bg-white px-3 py-2 text-sm text-[#231520]"
                              />
                              <button
                                type="button"
                                onClick={() => handleMarkRedeemed(lookedUpClaim.claimCode)}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-medium whitespace-nowrap"
                              >
                                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                                <span>Marcar como canjeado</span>
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-[#5A3E4E] bg-white rounded-lg p-3 border border-[#F5D0DF]">
                              Este código ya fue utilizado y está bloqueado definitivamente.
                              {lookedUpClaim.redeemedNote ? ` Nota registrada: ${lookedUpClaim.redeemedNote}` : ''}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-white border border-[#F2C6D8] p-5 space-y-3">
                      <h3 className="font-display text-xl font-semibold text-[#231520]">
                        Códigos pendientes de canje ({data.stats.pendingRedemptionCount})
                      </h3>
                      {data.claims.filter((c) => c.redemptionStatus === 'pending').length === 0 ? (
                        <p className="text-sm text-[#6B4C5E]">No hay códigos pendientes de canje en este momento.</p>
                      ) : (
                        <div className="divide-y divide-[#F5D0DF]">
                          {data.claims
                            .filter((c) => c.redemptionStatus === 'pending')
                            .map((c) => (
                              <div
                                key={c.id}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div>
                                  <span className="font-mono text-sm font-semibold text-[#231520] tabular-nums">
                                    {c.claimCode}
                                  </span>
                                  <p className="text-xs text-[#6B4C5E]">
                                    Día {c.day} · {c.prizeTitle}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleMarkRedeemed(c.claimCode)}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-xs font-medium whitespace-nowrap self-start sm:self-center"
                                >
                                  Marcar canjeado
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'photo' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display text-3xl font-semibold text-[#231520]">Fotografía de Alba</h2>
                      <p className="text-sm text-[#6B4C5E]">
                        Gestiona el retrato de la fundadora que aparece en el marco arquitectónico tipo arco de la portada.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      <div className="md:col-span-5 flex justify-center">
                        <div className="w-64 rounded-t-full rounded-b-xl border border-[#D4A853] bg-white p-2.5">
                          <div className="rounded-t-full rounded-b-lg overflow-hidden aspect-[3/4] bg-[#FFF0F5]">
                            <img
                              src={resolveAssetPath(data.config.founderPhotoUrl)}
                              alt="Vista previa actual del retrato de Alba"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-7 rounded-xl bg-white border border-[#F2C6D8] p-5 space-y-5">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-[#5A3E4E]">Modo de gestión</p>
                          <div className="inline-flex rounded-lg bg-[#FFF0F5] p-1 border border-[#F5D0DF]">
                            <button
                              type="button"
                              onClick={() => handlePhotoModeChange('editable')}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                data.config.founderPhotoMode === 'editable'
                                  ? 'bg-white text-[#231520] shadow-xs'
                                  : 'text-[#6B4C5E]'
                              }`}
                            >
                              Permitir cambios
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePhotoModeChange('fixed')}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                data.config.founderPhotoMode === 'fixed'
                                  ? 'bg-white text-[#231520] shadow-xs'
                                  : 'text-[#6B4C5E]'
                              }`}
                            >
                              Mantener imagen fija
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-[#5A3E4E]">
                            Subir nueva fotografía (JPG, PNG o WebP; se optimiza automáticamente)
                          </label>
                          <label
                            className={`flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#D4A853] bg-[#FFF9FB] px-4 py-6 text-sm font-medium text-[#231520] cursor-pointer hover:bg-[#FFF0F5] transition-colors ${
                              data.config.founderPhotoMode === 'fixed' ? 'opacity-50 pointer-events-none' : ''
                            }`}
                          >
                            <Upload className="w-4 h-4 text-[#BE185D]" aria-hidden="true" />
                            <span>Seleccionar fotografía desde tu dispositivo</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              disabled={data.config.founderPhotoMode === 'fixed'}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handlePhotoUpload(file);
                              }}
                            />
                          </label>
                        </div>

                        <div className="pt-2 border-t border-[#F5D0DF]">
                          <button
                            type="button"
                            onClick={handleResetPhoto}
                            className="inline-flex items-center gap-2 text-xs font-medium text-[#6B4C5E] hover:text-[#BE185D]"
                          >
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Restaurar retrato original</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'config' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display text-3xl font-semibold text-[#231520]">Configuración</h2>
                      <p className="text-sm text-[#6B4C5E]">
                        Administra horarios, vigencia de premios, contacto, condiciones, accesos y pruebas previas al lanzamiento.
                      </p>
                    </div>

                    <div className="rounded-xl bg-white border border-[#F2C6D8] p-5 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#5A3E4E] mb-1">
                            Hora de apertura (0–23)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={0}
                              max={23}
                              value={cfgOpenHour}
                              onChange={(e) => setCfgOpenHour(Number(e.target.value))}
                              className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm font-mono tabular-nums"
                            />
                            <input
                              type="number"
                              min={0}
                              max={59}
                              value={cfgOpenMin}
                              onChange={(e) => setCfgOpenMin(Number(e.target.value))}
                              className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm font-mono tabular-nums"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#5A3E4E] mb-1">
                            Hora de cierre diario (0–23)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={0}
                              max={23}
                              value={cfgCloseHour}
                              onChange={(e) => setCfgCloseHour(Number(e.target.value))}
                              className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm font-mono tabular-nums"
                            />
                            <input
                              type="number"
                              min={0}
                              max={59}
                              value={cfgCloseMin}
                              onChange={(e) => setCfgCloseMin(Number(e.target.value))}
                              className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm font-mono tabular-nums"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#5A3E4E] mb-1">
                            Vigencia máxima de premios
                          </label>
                          <input
                            type="date"
                            value={cfgValidity}
                            onChange={(e) => setCfgValidity(e.target.value)}
                            className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm font-mono tabular-nums"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#5A3E4E] mb-1">
                            WhatsApp (sin +, ej. 34624531323)
                          </label>
                          <input
                            type="text"
                            value={cfgWhatsapp}
                            onChange={(e) => setCfgWhatsapp(e.target.value)}
                            className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#5A3E4E] mb-1">Instagram</label>
                          <input
                            type="text"
                            maxLength={60}
                            value={cfgInstagram}
                            onChange={(e) => setCfgInstagram(e.target.value)}
                            className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#5A3E4E] mb-1">TikTok</label>
                          <input
                            type="text"
                            maxLength={60}
                            value={cfgTiktok}
                            onChange={(e) => setCfgTiktok(e.target.value)}
                            className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#5A3E4E] mb-1">Ubicación</label>
                          <input
                            type="text"
                            maxLength={80}
                            value={cfgLocation}
                            onChange={(e) => setCfgLocation(e.target.value)}
                            className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#5A3E4E] mb-1">Lema de campaña</label>
                          <input
                            type="text"
                            maxLength={220}
                            value={cfgSlogan}
                            onChange={(e) => setCfgSlogan(e.target.value)}
                            className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#5A3E4E] mb-1">
                          Condiciones de los premios (una condición por línea)
                        </label>
                        <textarea
                          rows={6}
                          value={cfgConditionsText}
                          onChange={(e) => setCfgConditionsText(e.target.value)}
                          className="w-full rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm leading-relaxed"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleSaveConfig()}
                          className="px-5 py-2.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-sm font-medium"
                        >
                          Guardar configuración
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#FFF0F5] border border-[#D4A853]/70 p-5 space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-display text-xl font-semibold text-[#231520]">
                          Modo pruebas y simulación (revisión previa al lanzamiento)
                        </h3>
                        <p className="text-xs text-[#5A3E4E]">
                          Con el bloqueo de calendario deshabilitado puedes abrir cualquier día para probar la entrega de código, el enlace de WhatsApp y el cierre automático cuando una casilla ya está cobrada/adjudicada. Antes de publicar el enlace definitivo, vuelve al modo oficial y reinicia las pruebas.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSaveConfig(undefined, true)}
                          className={`option-tile px-3.5 py-2 rounded-lg border text-xs font-medium ${
                            data.config.testUnlockAll
                              ? 'bg-[#BE185D] border-[#BE185D] text-white'
                              : 'bg-white border-[#F0C2D5] text-[#231520] hover:border-[#BE185D]'
                          }`}
                        >
                          Deshabilitar bloqueo (todas las casillas abiertas)
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveConfig(null, false)}
                          className={`option-tile px-3.5 py-2 rounded-lg border text-xs font-medium ${
                            !data.config.testUnlockAll && !data.config.simulationIso
                              ? 'bg-[#BE185D] border-[#BE185D] text-white'
                              : 'bg-white border-[#F0C2D5] text-[#231520] hover:border-[#BE185D]'
                          }`}
                        >
                          Activar modo oficial (1–24 dic · 22:00 h)
                        </button>
                      </div>

                      <div className="pt-3 border-t border-[#F0C2D5] flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSaveConfig('2026-12-01T21:05:00.000Z', false)}
                          className="option-tile px-3.5 py-2 rounded-lg bg-white hover:bg-[#FCE7F3] border border-[#F0C2D5] text-xs font-medium text-[#231520]"
                        >
                          Simular 1 dic 2026 · 22:05 (Madrid)
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveConfig('2026-12-05T21:15:00.000Z', false)}
                          className="option-tile px-3.5 py-2 rounded-lg bg-white hover:bg-[#FCE7F3] border border-[#F0C2D5] text-xs font-medium text-[#231520]"
                        >
                          Simular 5 dic 2026 · 22:15 (Madrid)
                        </button>
                      </div>

                      <div className="pt-3 border-t border-[#F0C2D5] flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-[#5A3E4E]">
                          Estado actual:{' '}
                          <strong className="text-[#231520]">
                            {data.config.testUnlockAll
                              ? 'Pruebas abiertas (cualquier día disponible)'
                              : data.config.simulationIso
                                ? `Simulación (${data.time.madridDate} ${data.time.madridTime})`
                                : 'Modo oficial estricto (Europe/Madrid 22:00 h)'}
                          </strong>
                        </div>

                        {!confirmResetAll ? (
                          <button
                            type="button"
                            onClick={() => setConfirmResetAll(true)}
                            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#FDECEC] border border-[#F5C2C2] text-xs font-medium text-[#9D2A2A]"
                          >
                            Reiniciar 24 casillas tras pruebas
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmResetAll(false)}
                              className="px-3 py-1.5 rounded-lg border border-[#F0C2D5] bg-white text-xs text-[#5A3E4E]"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleResetTestClaims}
                              className="px-3.5 py-1.5 rounded-lg bg-[#9D2A2A] hover:bg-[#7F1D1D] text-white text-xs font-medium"
                            >
                              Confirmar reinicio completo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white border border-[#F2C6D8] p-5 space-y-4">
                      <div>
                        <h3 className="font-display text-xl font-semibold text-[#231520]">
                          Cuentas Google autorizadas al panel
                        </h3>
                        <p className="text-xs text-[#5A3E4E]">
                          Puedes autorizar la cuenta Gmail personal de Alba para que acceda directamente desde cualquier móvil u ordenador.
                        </p>
                      </div>

                      <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          required
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="alba.salon@gmail.com"
                          className="flex-1 rounded-lg border border-[#F0C2D5] px-3 py-2 text-sm"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-xs font-medium whitespace-nowrap"
                        >
                          <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Autorizar correo</span>
                        </button>
                      </form>

                      <div className="divide-y divide-[#F5D0DF]">
                        {data.admins.map((email) => (
                          <div key={email} className="py-2 flex items-center justify-between text-xs">
                            <span className="font-mono text-[#231520]">{email}</span>
                            {email === BOOTSTRAPPED_ADMIN_EMAIL ? (
                              <span className="text-[#8C5E74]">Principal</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleRemoveAdmin(email)}
                                className="inline-flex items-center gap-1 text-[#9D2A2A] hover:underline"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Revocar</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </main>
        </div>
      </div>
    </section>
  );
}
