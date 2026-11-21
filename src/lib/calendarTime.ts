import type { DoorAvailabilityState, MadridTimeSnapshot, PublicCampaignConfig } from '../types/calendar.ts';

export function getMadridParts(date: Date, timeZone = 'Europe/Madrid') {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour === '24' ? '0' : map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);

  const madridDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const madridTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

  return { year, month, day, hour, minute, second, madridDate, madridTime };
}

export function formatMadridTimestamp(date: Date, timeZone = 'Europe/Madrid'): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function madridWallTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone = 'Europe/Madrid'
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const guessDate = new Date(utcGuess);
  const parts = getMadridParts(guessDate, timeZone);
  const madridAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMs = madridAsUtc - utcGuess;
  return new Date(utcGuess - offsetMs);
}

export function evaluateDoorState(
  doorDay: number,
  isClaimed: boolean,
  nowDate: Date,
  config: PublicCampaignConfig
): DoorAvailabilityState {
  if (isClaimed) {
    return 'claimed';
  }

  if (config.testUnlockAll) {
    return 'available_now';
  }

  const parts = getMadridParts(nowDate, config.timezone);
  const campaignYear = config.campaignYear;
  const campaignMonth = 12;

  const currentComparable = parts.year * 10000 + parts.month * 100 + parts.day;
  const doorComparable = campaignYear * 10000 + campaignMonth * 100 + doorDay;

  if (currentComparable < doorComparable) {
    return parts.year === campaignYear && parts.month === campaignMonth && parts.day === doorDay
      ? 'opens_today'
      : 'future';
  }

  if (currentComparable > doorComparable) {
    return 'expired';
  }

  const currentSecondsOfDay = parts.hour * 3600 + parts.minute * 60 + parts.second;
  const openSeconds = config.openHour * 3600 + config.openMinute * 60;
  const closeSeconds = config.closeHour * 3600 + config.closeMinute * 60 + 59;

  if (currentSecondsOfDay < openSeconds) {
    return 'opens_today';
  }

  if (currentSecondsOfDay <= closeSeconds) {
    return 'available_now';
  }

  return 'expired';
}

export function buildMadridSnapshot(config: PublicCampaignConfig): {
  effectiveNow: Date;
  snapshot: MadridTimeSnapshot;
} {
  let effectiveNow = new Date();
  let isSimulated = false;

  if (config.simulationIso) {
    const parsed = new Date(config.simulationIso);
    if (!Number.isNaN(parsed.getTime())) {
      effectiveNow = parsed;
      isSimulated = true;
    }
  }

  const parts = getMadridParts(effectiveNow, config.timezone);
  const campaignYear = config.campaignYear;
  const campaignMonth = 12;

  let nextOpenIso: string | null = null;
  let nextOpenDay: number | null = null;

  const currentComparable = parts.year * 10000 + parts.month * 100 + parts.day;
  const firstDayComparable = campaignYear * 10000 + campaignMonth * 100 + 1;
  const lastDayComparable = campaignYear * 10000 + campaignMonth * 100 + 24;

  if (currentComparable < firstDayComparable) {
    nextOpenDay = 1;
    nextOpenIso = madridWallTimeToDate(
      campaignYear,
      12,
      1,
      config.openHour,
      config.openMinute,
      0,
      config.timezone
    ).toISOString();
  } else if (currentComparable <= lastDayComparable) {
    const currentSec = parts.hour * 3600 + parts.minute * 60 + parts.second;
    const openSec = config.openHour * 3600 + config.openMinute * 60;
    if (currentSec < openSec) {
      nextOpenDay = parts.day;
      nextOpenIso = madridWallTimeToDate(
        campaignYear,
        12,
        parts.day,
        config.openHour,
        config.openMinute,
        0,
        config.timezone
      ).toISOString();
    } else if (parts.day < 24) {
      nextOpenDay = parts.day + 1;
      nextOpenIso = madridWallTimeToDate(
        campaignYear,
        12,
        parts.day + 1,
        config.openHour,
        config.openMinute,
        0,
        config.timezone
      ).toISOString();
    }
  }

  return {
    effectiveNow,
    snapshot: {
      isoNow: effectiveNow.toISOString(),
      madridDate: parts.madridDate,
      madridTime: parts.madridTime,
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
      isSimulated,
      nextOpenIso,
      nextOpenDay,
    },
  };
}
