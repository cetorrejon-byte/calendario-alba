import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase.ts';
import type {
  AdminAuditLog,
  AdminClaimRecord,
  AdminDashboardResponse,
  AdminDoorRecord,
  ClaimAttemptResponse,
  PublicCalendarResponse,
  PublicCampaignConfig,
  PublicDoorView,
  WinnerReceipt,
} from '../types/calendar.ts';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  buildWhatsappRedeemUrl,
  DEFAULT_CAMPAIGN_CONFIG,
  DEFAULT_CONDITIONS,
  DEFAULT_FOUNDER_PHOTO,
  SEED_PRIZES,
} from './calendarDefaults.ts';
import { buildMadridSnapshot, evaluateDoorState, formatMadridTimestamp } from './calendarTime.ts';

interface FirestoreDoorDoc {
  day: number;
  prizeTitle: string;
  prizeDescription: string;
  prizeCategory: string;
  status: 'available' | 'claimed';
  claimCode: string | null;
  updatedAt?: Timestamp;
}

interface FirestoreClaimDoc {
  day: number;
  prizeTitle: string;
  prizeDescription: string;
  prizeCategory: string;
  claimCode: string;
  winnerRef: string;
  claimedAt?: Timestamp;
  claimedAtMadrid: string;
  redemptionStatus: 'pending' | 'redeemed';
  redeemedAt?: Timestamp | null;
  redeemedAtMadrid: string | null;
  redeemedNote: string | null;
}

export function doorIdForDay(day: number): string {
  return String(day).padStart(2, '0');
}

function isValidClaimCodeFormat(code: string): boolean {
  return /^ALBA26-D(0[1-9]|1[0-9]|2[0-4])-[A-Z0-9]{6}$/.test(code);
}

function randomCodeSuffix(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function randomHex4Bytes(): string {
  const bytes = new Uint8Array(4);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function generateUniqueCode(day: number): string {
  return `ALBA26-D${doorIdForDay(day)}-${randomCodeSuffix(6)}`;
}

function generateWinnerRef(day: number): string {
  return `GAN-${doorIdForDay(day)}-${randomHex4Bytes()}`;
}

function makeAuditLogId(): string {
  return `log_${Date.now()}_${randomCodeSuffix(6)}`;
}

function sanitizeConfigFromDoc(raw: Record<string, unknown> | undefined): PublicCampaignConfig {
  if (!raw) return DEFAULT_CAMPAIGN_CONFIG;
  const rawConditions = Array.isArray(raw.conditions)
    ? raw.conditions.map((c) => String(c).trim()).filter(Boolean).slice(0, 20)
    : [];

  return {
    salonName:
      typeof raw.salonName === 'string' && raw.salonName.trim().length >= 2
        ? raw.salonName.trim().slice(0, 80)
        : DEFAULT_CAMPAIGN_CONFIG.salonName,
    campaignYear:
      typeof raw.campaignYear === 'number' && Number.isInteger(raw.campaignYear)
        ? raw.campaignYear
        : DEFAULT_CAMPAIGN_CONFIG.campaignYear,
    startDate:
      typeof raw.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate)
        ? raw.startDate
        : DEFAULT_CAMPAIGN_CONFIG.startDate,
    endDate:
      typeof raw.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.endDate)
        ? raw.endDate
        : DEFAULT_CAMPAIGN_CONFIG.endDate,
    openHour:
      typeof raw.openHour === 'number' && Number.isInteger(raw.openHour)
        ? raw.openHour
        : DEFAULT_CAMPAIGN_CONFIG.openHour,
    openMinute:
      typeof raw.openMinute === 'number' && Number.isInteger(raw.openMinute)
        ? raw.openMinute
        : DEFAULT_CAMPAIGN_CONFIG.openMinute,
    closeHour:
      typeof raw.closeHour === 'number' && Number.isInteger(raw.closeHour)
        ? raw.closeHour
        : DEFAULT_CAMPAIGN_CONFIG.closeHour,
    closeMinute:
      typeof raw.closeMinute === 'number' && Number.isInteger(raw.closeMinute)
        ? raw.closeMinute
        : DEFAULT_CAMPAIGN_CONFIG.closeMinute,
    timezone:
      typeof raw.timezone === 'string' && raw.timezone.trim().length >= 3
        ? raw.timezone.trim().slice(0, 40)
        : DEFAULT_CAMPAIGN_CONFIG.timezone,
    validityEndDate:
      typeof raw.validityEndDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.validityEndDate)
        ? raw.validityEndDate
        : DEFAULT_CAMPAIGN_CONFIG.validityEndDate,
    whatsappNumber:
      typeof raw.whatsappNumber === 'string' && /^[0-9]{9,15}$/.test(raw.whatsappNumber)
        ? raw.whatsappNumber
        : DEFAULT_CAMPAIGN_CONFIG.whatsappNumber,
    instagramHandle:
      typeof raw.instagramHandle === 'string' && raw.instagramHandle.trim().length >= 2
        ? raw.instagramHandle.trim().slice(0, 60)
        : DEFAULT_CAMPAIGN_CONFIG.instagramHandle,
    tiktokHandle:
      typeof raw.tiktokHandle === 'string' && raw.tiktokHandle.trim().length >= 2
        ? raw.tiktokHandle.trim().slice(0, 60)
        : DEFAULT_CAMPAIGN_CONFIG.tiktokHandle,
    locationText:
      typeof raw.locationText === 'string' && raw.locationText.trim().length >= 2
        ? raw.locationText.trim().slice(0, 80)
        : DEFAULT_CAMPAIGN_CONFIG.locationText,
    slogan:
      typeof raw.slogan === 'string' && raw.slogan.trim().length >= 5
        ? raw.slogan.trim().slice(0, 220)
        : DEFAULT_CAMPAIGN_CONFIG.slogan,
    conditions: rawConditions.length > 0 ? rawConditions : DEFAULT_CONDITIONS,
    founderPhotoUrl:
      typeof raw.founderPhotoUrl === 'string' && raw.founderPhotoUrl.trim().length >= 5
        ? raw.founderPhotoUrl.trim().slice(0, 200000)
        : DEFAULT_FOUNDER_PHOTO,
    founderPhotoMode: raw.founderPhotoMode === 'fixed' ? 'fixed' : 'editable',
    simulationIso: typeof raw.simulationIso === 'string' ? raw.simulationIso : null,
    testUnlockAll: typeof raw.testUnlockAll === 'boolean' ? raw.testUnlockAll : DEFAULT_CAMPAIGN_CONFIG.testUnlockAll,
  };
}

function buildConfigPayload(cfg: PublicCampaignConfig) {
  const cleanConditions = cfg.conditions
    .map((c) => c.trim().slice(0, 400))
    .filter(Boolean)
    .slice(0, 20);

  return {
    salonName: cfg.salonName.trim().slice(0, 80),
    campaignYear: cfg.campaignYear,
    startDate: cfg.startDate,
    endDate: cfg.endDate,
    openHour: cfg.openHour,
    openMinute: cfg.openMinute,
    closeHour: cfg.closeHour,
    closeMinute: cfg.closeMinute,
    timezone: cfg.timezone.trim().slice(0, 40),
    validityEndDate: cfg.validityEndDate,
    whatsappNumber: cfg.whatsappNumber.replace(/[^0-9]/g, '').slice(0, 15),
    instagramHandle: cfg.instagramHandle.trim().slice(0, 60),
    tiktokHandle: cfg.tiktokHandle.trim().slice(0, 60),
    locationText: cfg.locationText.trim().slice(0, 80),
    slogan: cfg.slogan.trim().slice(0, 220),
    conditions: cleanConditions.length > 0 ? cleanConditions : DEFAULT_CONDITIONS,
    founderPhotoUrl: cfg.founderPhotoUrl.trim().slice(0, 200000),
    founderPhotoMode: cfg.founderPhotoMode,
    simulationIso: cfg.simulationIso ? cfg.simulationIso.slice(0, 40) : null,
    testUnlockAll: Boolean(cfg.testUnlockAll),
    updatedAt: serverTimestamp(),
  };
}

function timestampToIso(ts: Timestamp | null | undefined, fallback = new Date().toISOString()): string {
  if (ts && typeof ts.toDate === 'function') {
    return ts.toDate().toISOString();
  }
  return fallback;
}

export function subscribeToPublicCalendar(
  onData: (response: PublicCalendarResponse) => void,
  onError: (err: unknown) => void
): () => void {
  let latestConfig: PublicCampaignConfig = DEFAULT_CAMPAIGN_CONFIG;
  let configSeeded = false;
  let doorsSeeded = false;
  let doorMap = new Map<number, FirestoreDoorDoc>();
  let gotConfigSnap = false;
  let gotDoorsSnap = false;

  const emit = () => {
    if (!gotConfigSnap || !gotDoorsSnap) return;
    const { effectiveNow, snapshot } = buildMadridSnapshot(latestConfig);
    const openTimeFormatted = `${String(latestConfig.openHour).padStart(2, '0')}:${String(latestConfig.openMinute).padStart(2, '0')} h`;

    const doors: PublicDoorView[] = SEED_PRIZES.map((seed) => {
      const stored = doorMap.get(seed.day);
      const isClaimed = stored?.status === 'claimed';
      const state = evaluateDoorState(seed.day, isClaimed, effectiveNow, latestConfig);
      return {
        day: seed.day,
        state,
        isClaimed,
        opensAtLabel: `${seed.day} dic · ${openTimeFormatted}`,
        prizeCategoryHint: stored?.prizeCategory || seed.category,
      };
    });

    onData({
      config: latestConfig,
      time: snapshot,
      doors,
      isSeeded: configSeeded && doorsSeeded,
    });
  };

  const unsubConfig = onSnapshot(
    doc(db, 'campaign', 'config'),
    (snap) => {
      gotConfigSnap = true;
      configSeeded = snap.exists();
      latestConfig = snap.exists()
        ? sanitizeConfigFromDoc(snap.data() as Record<string, unknown>)
        : DEFAULT_CAMPAIGN_CONFIG;
      emit();
    },
    (error) => {
      onError(error);
      handleFirestoreError(error, OperationType.GET, 'campaign/config');
    }
  );

  const unsubDoors = onSnapshot(
    collection(db, 'doors'),
    (snap) => {
      gotDoorsSnap = true;
      doorsSeeded = snap.size === 24;
      const nextMap = new Map<number, FirestoreDoorDoc>();
      snap.forEach((docSnap) => {
        const d = docSnap.data() as FirestoreDoorDoc;
        if (typeof d.day === 'number') {
          nextMap.set(d.day, d);
        }
      });
      doorMap = nextMap;
      emit();
    },
    (error) => {
      onError(error);
      handleFirestoreError(error, OperationType.LIST, 'doors');
    }
  );

  return () => {
    unsubConfig();
    unsubDoors();
  };
}

export async function attemptAtomicClaim(day: number): Promise<ClaimAttemptResponse> {
  if (!Number.isInteger(day) || day < 1 || day > 24) {
    return {
      won: false,
      reason: 'invalid_day',
      message: 'La casilla solicitada no es válida.',
    };
  }

  const dayId = doorIdForDay(day);
  const doorRef = doc(db, 'doors', dayId);
  const configRef = doc(db, 'campaign', 'config');

  try {
    return await runTransaction(db, async (tx) => {
      const [configSnap, doorSnap] = await Promise.all([tx.get(configRef), tx.get(doorRef)]);

      if (!configSnap.exists() || !doorSnap.exists()) {
        return {
          won: false,
          reason: 'not_open_yet',
          message:
            'El calendario aún está pendiente de activación inicial en la nube. Alba debe iniciar sesión una primera vez en "Acceso Alba" para activar las 24 casillas.',
        };
      }

      const config = sanitizeConfigFromDoc(configSnap.data() as Record<string, unknown>);
      const door = doorSnap.data() as FirestoreDoorDoc;

      if (door.status === 'claimed') {
        return {
          won: false,
          reason: 'already_claimed',
          message:
            '¡Qué pena! El regalo de hoy ya tiene ganadora. Pero mañana te espera una nueva sorpresa. ¡Vuelve a visitarnos!',
        };
      }

      const { effectiveNow } = buildMadridSnapshot(config);
      const state = evaluateDoorState(day, false, effectiveNow, config);

      if (state === 'opens_today' || state === 'future') {
        const openLabel = `${String(config.openHour).padStart(2, '0')}:${String(config.openMinute).padStart(2, '0')}`;
        return {
          won: false,
          reason: 'not_open_yet',
          message: `Esta casilla aún está cerrada. Se abrirá el ${day} de diciembre a las ${openLabel} h (hora peninsular española).`,
        };
      }

      if (state === 'expired') {
        return {
          won: false,
          reason: 'expired',
          message: 'El plazo de esta casilla ya finalizó y las fechas anteriores no pueden recuperarse.',
        };
      }

      const claimCode = generateUniqueCode(day);
      const winnerRef = generateWinnerRef(day);
      const claimedAtIso = effectiveNow.toISOString();
      const claimedAtMadrid = formatMadridTimestamp(effectiveNow, config.timezone);
      const claimRef = doc(db, 'claims', claimCode);

      tx.update(doorRef, {
        status: 'claimed',
        claimCode,
        updatedAt: serverTimestamp(),
      });

      tx.set(claimRef, {
        day,
        prizeTitle: door.prizeTitle,
        prizeDescription: door.prizeDescription,
        prizeCategory: door.prizeCategory,
        claimCode,
        winnerRef,
        claimedAt: serverTimestamp(),
        claimedAtMadrid,
        redemptionStatus: 'pending',
        redeemedAt: null,
        redeemedAtMadrid: null,
        redeemedNote: null,
      });

      const receipt: WinnerReceipt = {
        day,
        prizeTitle: door.prizeTitle,
        prizeDescription: door.prizeDescription,
        prizeCategory: door.prizeCategory,
        claimCode,
        winnerRef,
        claimedAtMadrid,
        claimedAtIso,
        redemptionStatus: 'pending',
        validityEndDate: config.validityEndDate,
        whatsappUrl: buildWhatsappRedeemUrl(config.whatsappNumber, day, door.prizeTitle, claimCode),
      };

      return {
        won: true,
        message: 'Has sido la primera persona en descubrir la sorpresa de hoy. Alba tiene un regalo especial para ti.',
        receipt,
      };
    });
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, `doors/${dayId}`);
  }
}

export async function lookupReceiptByCode(code: string): Promise<WinnerReceipt | null> {
  const normalized = code.trim().toUpperCase();
  if (!isValidClaimCodeFormat(normalized)) {
    return null;
  }

  try {
    const [claimSnap, configSnap] = await Promise.all([
      getDoc(doc(db, 'claims', normalized)),
      getDoc(doc(db, 'campaign', 'config')),
    ]);

    if (!claimSnap.exists()) {
      return null;
    }

    const claim = claimSnap.data() as FirestoreClaimDoc;
    const config = sanitizeConfigFromDoc(
      configSnap.exists() ? (configSnap.data() as Record<string, unknown>) : undefined
    );

    return {
      day: claim.day,
      prizeTitle: claim.prizeTitle,
      prizeDescription: claim.prizeDescription,
      prizeCategory: claim.prizeCategory,
      claimCode: claim.claimCode,
      winnerRef: claim.winnerRef,
      claimedAtMadrid: claim.claimedAtMadrid,
      claimedAtIso: timestampToIso(claim.claimedAt),
      redemptionStatus: claim.redemptionStatus,
      validityEndDate: config.validityEndDate,
      whatsappUrl: buildWhatsappRedeemUrl(config.whatsappNumber, claim.day, claim.prizeTitle, claim.claimCode),
    };
  } catch (error) {
    return handleFirestoreError(error, OperationType.GET, `claims/${normalized}`);
  }
}

export async function signInAdminWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth);
}

export async function checkIsUserAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified || !user.email) {
    return false;
  }
  const normalizedEmail = user.email.toLowerCase();
  if (normalizedEmail === BOOTSTRAPPED_ADMIN_EMAIL) {
    return true;
  }
  try {
    const snap = await getDoc(doc(db, 'admins', normalizedEmail));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function ensureFirestoreSeeded(actorEmail: string): Promise<boolean> {
  try {
    const configRef = doc(db, 'campaign', 'config');
    const [configSnap, doorsSnap] = await Promise.all([
      getDoc(configRef),
      getDocs(collection(db, 'doors')),
    ]);

    const existingDays = new Set<number>();
    doorsSnap.forEach((d) => {
      const data = d.data() as FirestoreDoorDoc;
      if (typeof data.day === 'number') existingDays.add(data.day);
    });

    if (configSnap.exists() && existingDays.size === 24) {
      return false;
    }

    const batch = writeBatch(db);
    if (!configSnap.exists()) {
      batch.set(configRef, buildConfigPayload(DEFAULT_CAMPAIGN_CONFIG));
    }

    for (const prize of SEED_PRIZES) {
      if (!existingDays.has(prize.day)) {
        batch.set(doc(db, 'doors', doorIdForDay(prize.day)), {
          day: prize.day,
          prizeTitle: prize.title,
          prizeDescription: prize.description,
          prizeCategory: prize.category,
          status: 'available',
          claimCode: null,
          updatedAt: serverTimestamp(),
        });
      }
    }

    const now = new Date();
    batch.set(doc(db, 'audit_logs', makeAuditLogId()), {
      action: 'CAMPAIGN_INITIALIZED',
      details: 'Inicialización de configuración y 24 casillas del Calendario de Adviento 2026 en Firebase Firestore.',
      actor: actorEmail.slice(0, 120),
      createdAt: serverTimestamp(),
      createdAtMadrid: formatMadridTimestamp(now, DEFAULT_CAMPAIGN_CONFIG.timezone),
    });

    await batch.commit();
    return true;
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, 'campaign/config');
  }
}

export async function fetchAdminDashboard(actorEmail: string): Promise<AdminDashboardResponse> {
  await ensureFirestoreSeeded(actorEmail);

  try {
    const [configSnap, doorsSnap, claimsSnap, auditSnap, adminsSnap] = await Promise.all([
      getDoc(doc(db, 'campaign', 'config')),
      getDocs(collection(db, 'doors')),
      getDocs(collection(db, 'claims')),
      getDocs(query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(100))),
      getDocs(collection(db, 'admins')),
    ]);

    const config = sanitizeConfigFromDoc(
      configSnap.exists() ? (configSnap.data() as Record<string, unknown>) : undefined
    );
    const { effectiveNow, snapshot } = buildMadridSnapshot(config);

    const doorRows: FirestoreDoorDoc[] = [];
    doorsSnap.forEach((d) => doorRows.push(d.data() as FirestoreDoorDoc));
    doorRows.sort((a, b) => a.day - b.day);

    const doors: AdminDoorRecord[] = doorRows.map((row) => ({
      day: row.day,
      prizeTitle: row.prizeTitle,
      prizeDescription: row.prizeDescription,
      prizeCategory: row.prizeCategory,
      status: row.status,
      state: evaluateDoorState(row.day, row.status === 'claimed', effectiveNow, config),
    }));

    const claims: AdminClaimRecord[] = [];
    claimsSnap.forEach((c) => {
      const data = c.data() as FirestoreClaimDoc;
      claims.push({
        id: c.id,
        day: data.day,
        prizeTitle: data.prizeTitle,
        claimCode: data.claimCode,
        winnerRef: data.winnerRef,
        claimedAtIso: timestampToIso(data.claimedAt),
        claimedAtMadrid: data.claimedAtMadrid,
        redemptionStatus: data.redemptionStatus,
        redeemedAtIso: data.redeemedAt ? timestampToIso(data.redeemedAt) : null,
        redeemedAtMadrid: data.redeemedAtMadrid ?? null,
        redeemedNote: data.redeemedNote ?? null,
      });
    });
    claims.sort((a, b) => a.day - b.day);

    const auditLogs: AdminAuditLog[] = [];
    auditSnap.forEach((a) => {
      const data = a.data() as {
        action: string;
        details: string;
        actor: string;
        createdAt?: Timestamp;
        createdAtMadrid: string;
      };
      auditLogs.push({
        id: a.id,
        action: data.action,
        details: data.details,
        actor: data.actor,
        createdAtIso: timestampToIso(data.createdAt),
        createdAtMadrid: data.createdAtMadrid,
      });
    });

    const admins: string[] = [BOOTSTRAPPED_ADMIN_EMAIL];
    adminsSnap.forEach((ad) => {
      const email = ad.id.toLowerCase();
      if (!admins.includes(email)) {
        admins.push(email);
      }
    });

    const claimedCount = claims.length;
    const redeemedCount = claims.filter((c) => c.redemptionStatus === 'redeemed').length;

    return {
      config,
      time: snapshot,
      stats: {
        totalPrizes: 24,
        claimedCount,
        pendingAwardCount: 24 - claimedCount,
        redeemedCount,
        pendingRedemptionCount: claimedCount - redeemedCount,
      },
      doors,
      claims,
      auditLogs,
      admins,
    };
  } catch (error) {
    return handleFirestoreError(error, OperationType.GET, 'admin_dashboard');
  }
}

export async function updateAdminDoor(
  day: number,
  prizeTitle: string,
  prizeDescription: string,
  prizeCategory: string,
  actorEmail: string
): Promise<AdminDashboardResponse> {
  const cleanTitle = prizeTitle.trim().slice(0, 160);
  const cleanDesc = prizeDescription.trim().slice(0, 500);
  const cleanCat = prizeCategory.trim().slice(0, 40);

  if (cleanTitle.length < 2 || cleanDesc.length < 5 || cleanCat.length < 2) {
    throw new Error('Título (mín. 2), descripción (mín. 5) y categoría (mín. 2) son obligatorios.');
  }

  const dayId = doorIdForDay(day);
  const doorRef = doc(db, 'doors', dayId);

  try {
    const snap = await getDoc(doorRef);
    if (!snap.exists()) {
      throw new Error('Casilla no encontrada.');
    }
    const existing = snap.data() as FirestoreDoorDoc;
    if (existing.status === 'claimed') {
      throw new Error(
        'Esta casilla ya ha sido adjudicada. Por integridad de la campaña, no se puede modificar silenciosamente un premio ya ganado.'
      );
    }

    const batch = writeBatch(db);
    batch.update(doorRef, {
      prizeTitle: cleanTitle,
      prizeDescription: cleanDesc,
      prizeCategory: cleanCat,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', makeAuditLogId()), {
      action: 'PRIZE_UPDATED',
      details: `Casilla ${day}: "${existing.prizeTitle}" actualizada a "${cleanTitle}".`.slice(0, 500),
      actor: actorEmail.slice(0, 120),
      createdAt: serverTimestamp(),
      createdAtMadrid: formatMadridTimestamp(new Date(), 'Europe/Madrid'),
    });
    await batch.commit();
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission') && !error.message.includes('Missing')) {
      throw error;
    }
    return handleFirestoreError(error, OperationType.UPDATE, `doors/${dayId}`);
  }

  return fetchAdminDashboard(actorEmail);
}

export async function lookupAdminClaim(code: string): Promise<AdminClaimRecord | null> {
  const normalized = code.trim().toUpperCase();
  if (!isValidClaimCodeFormat(normalized)) {
    return null;
  }

  try {
    const snap = await getDoc(doc(db, 'claims', normalized));
    if (!snap.exists()) return null;
    const data = snap.data() as FirestoreClaimDoc;
    return {
      id: snap.id,
      day: data.day,
      prizeTitle: data.prizeTitle,
      claimCode: data.claimCode,
      winnerRef: data.winnerRef,
      claimedAtIso: timestampToIso(data.claimedAt),
      claimedAtMadrid: data.claimedAtMadrid,
      redemptionStatus: data.redemptionStatus,
      redeemedAtIso: data.redeemedAt ? timestampToIso(data.redeemedAt) : null,
      redeemedAtMadrid: data.redeemedAtMadrid ?? null,
      redeemedNote: data.redeemedNote ?? null,
    };
  } catch (error) {
    return handleFirestoreError(error, OperationType.GET, `claims/${normalized}`);
  }
}

export async function markClaimRedeemed(
  claimCode: string,
  note: string,
  actorEmail: string
): Promise<AdminDashboardResponse> {
  const normalized = claimCode.trim().toUpperCase();
  if (!isValidClaimCodeFormat(normalized)) {
    throw new Error('Código de canje no válido.');
  }

  const cleanNote = note.trim().slice(0, 240);
  const claimRef = doc(db, 'claims', normalized);

  try {
    const snap = await getDoc(claimRef);
    if (!snap.exists()) {
      throw new Error('Código no encontrado.');
    }
    const existing = snap.data() as FirestoreClaimDoc;
    if (existing.redemptionStatus === 'redeemed') {
      throw new Error('Este código ya fue marcado como canjeado y está bloqueado definitivamente.');
    }

    const nowMadrid = formatMadridTimestamp(new Date(), 'Europe/Madrid');
    const batch = writeBatch(db);
    batch.update(claimRef, {
      redemptionStatus: 'redeemed',
      redeemedAt: serverTimestamp(),
      redeemedAtMadrid: nowMadrid,
      redeemedNote: cleanNote || null,
    });
    batch.set(doc(db, 'audit_logs', makeAuditLogId()), {
      action: 'PRIZE_REDEEMED',
      details: `Código ${normalized} (Día ${existing.day} · ${existing.prizeTitle}) marcado como canjeado.${cleanNote ? ` Nota: ${cleanNote}` : ''}`.slice(0, 500),
      actor: actorEmail.slice(0, 120),
      createdAt: serverTimestamp(),
      createdAtMadrid: nowMadrid,
    });
    await batch.commit();
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission') && !error.message.includes('Missing')) {
      throw error;
    }
    return handleFirestoreError(error, OperationType.UPDATE, `claims/${normalized}`);
  }

  return fetchAdminDashboard(actorEmail);
}

export async function voidClaimByDay(
  day: number,
  reason: string,
  actorEmail: string
): Promise<AdminDashboardResponse> {
  const cleanReason = reason.trim();
  if (cleanReason.length < 5) {
    throw new Error('Toda intervención excepcional requiere un motivo detallado (mínimo 5 caracteres).');
  }

  const dayId = doorIdForDay(day);
  const doorRef = doc(db, 'doors', dayId);

  try {
    const doorSnap = await getDoc(doorRef);
    if (!doorSnap.exists()) {
      throw new Error('Casilla no encontrada.');
    }
    const door = doorSnap.data() as FirestoreDoorDoc;
    if (door.status !== 'claimed' || !door.claimCode) {
      throw new Error('No existe ninguna adjudicación registrada para esa casilla.');
    }

    const claimCode = door.claimCode;
    const batch = writeBatch(db);
    batch.update(doorRef, {
      status: 'available',
      claimCode: null,
      updatedAt: serverTimestamp(),
    });
    batch.delete(doc(db, 'claims', claimCode));
    batch.set(doc(db, 'audit_logs', makeAuditLogId()), {
      action: 'EXCEPTIONAL_CLAIM_VOID',
      details: `Intervención excepcional en Día ${day} (Código anulado: ${claimCode}, Premio: "${door.prizeTitle}"). Motivo: ${cleanReason}`.slice(0, 500),
      actor: actorEmail.slice(0, 120),
      createdAt: serverTimestamp(),
      createdAtMadrid: formatMadridTimestamp(new Date(), 'Europe/Madrid'),
    });
    await batch.commit();
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission') && !error.message.includes('Missing')) {
      throw error;
    }
    return handleFirestoreError(error, OperationType.DELETE, `doors/${dayId}`);
  }

  return fetchAdminDashboard(actorEmail);
}

export async function resetAllTestClaims(actorEmail: string): Promise<AdminDashboardResponse> {
  try {
    const [doorsSnap, claimsSnap] = await Promise.all([
      getDocs(collection(db, 'doors')),
      getDocs(collection(db, 'claims')),
    ]);

    const batch = writeBatch(db);
    let clearedCount = 0;

    doorsSnap.forEach((d) => {
      const data = d.data() as FirestoreDoorDoc;
      if (data.status === 'claimed' || data.claimCode !== null) {
        batch.update(d.ref, {
          status: 'available',
          claimCode: null,
          updatedAt: serverTimestamp(),
        });
      }
    });

    claimsSnap.forEach((c) => {
      clearedCount += 1;
      batch.delete(c.ref);
    });

    batch.set(doc(db, 'audit_logs', makeAuditLogId()), {
      action: 'TEST_CLAIMS_RESET',
      details: `Reinicio completo de pruebas: ${clearedCount} adjudicaciones eliminadas y 24 casillas restablecidas a disponibles.`,
      actor: actorEmail.slice(0, 120),
      createdAt: serverTimestamp(),
      createdAtMadrid: formatMadridTimestamp(new Date(), 'Europe/Madrid'),
    });

    await batch.commit();
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, 'test_reset');
  }

  return fetchAdminDashboard(actorEmail);
}

export async function saveAdminCampaignConfig(
  nextConfig: PublicCampaignConfig,
  actorEmail: string,
  auditAction = 'CONFIG_UPDATED',
  auditDetails?: string
): Promise<AdminDashboardResponse> {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'campaign', 'config'), buildConfigPayload(nextConfig));
    batch.set(doc(db, 'audit_logs', makeAuditLogId()), {
      action: auditAction.slice(0, 60),
      details: (
        auditDetails ||
        `Configuración actualizada (Horario ${String(nextConfig.openHour).padStart(2, '0')}:${String(nextConfig.openMinute).padStart(2, '0')}–${String(nextConfig.closeHour).padStart(2, '0')}:${String(nextConfig.closeMinute).padStart(2, '0')}, Vigencia ${nextConfig.validityEndDate}, Modo pruebas abierto: ${nextConfig.testUnlockAll ? 'Sí' : 'No'}).`
      ).slice(0, 500),
      actor: actorEmail.slice(0, 120),
      createdAt: serverTimestamp(),
      createdAtMadrid: formatMadridTimestamp(new Date(), nextConfig.timezone),
    });
    await batch.commit();
  } catch (error) {
    return handleFirestoreError(error, OperationType.UPDATE, 'campaign/config');
  }

  return fetchAdminDashboard(actorEmail);
}

export async function addAuthorizedAdminEmail(
  emailToAdd: string,
  actorEmail: string
): Promise<AdminDashboardResponse> {
  const normalized = emailToAdd.trim().toLowerCase();
  if (!/^[^/\s@]+@[^/\s@]+\.[^/\s@]+$/.test(normalized) || normalized.length > 120) {
    throw new Error('Introduce un correo Gmail válido.');
  }

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'admins', normalized), {
      email: normalized,
      addedBy: actorEmail.slice(0, 120),
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', makeAuditLogId()), {
      action: 'ADMIN_AUTHORIZED',
      details: `Cuenta autorizada para el panel privado: ${normalized}.`.slice(0, 500),
      actor: actorEmail.slice(0, 120),
      createdAt: serverTimestamp(),
      createdAtMadrid: formatMadridTimestamp(new Date(), 'Europe/Madrid'),
    });
    await batch.commit();
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, `admins/${normalized}`);
  }

  return fetchAdminDashboard(actorEmail);
}

export async function removeAuthorizedAdminEmail(
  emailToRemove: string,
  actorEmail: string
): Promise<AdminDashboardResponse> {
  const normalized = emailToRemove.trim().toLowerCase();
  if (normalized === BOOTSTRAPPED_ADMIN_EMAIL) {
    throw new Error('La cuenta principal del proyecto no puede eliminarse.');
  }

  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'admins', normalized));
    batch.set(doc(db, 'audit_logs', makeAuditLogId()), {
      action: 'ADMIN_REVOKED',
      details: `Acceso administrativo revocado para: ${normalized}.`.slice(0, 500),
      actor: actorEmail.slice(0, 120),
      createdAt: serverTimestamp(),
      createdAtMadrid: formatMadridTimestamp(new Date(), 'Europe/Madrid'),
    });
    await batch.commit();
  } catch (error) {
    return handleFirestoreError(error, OperationType.DELETE, `admins/${normalized}`);
  }

  return fetchAdminDashboard(actorEmail);
}
