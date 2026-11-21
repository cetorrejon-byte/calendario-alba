export type DoorAvailabilityState =
  | 'available_now'
  | 'claimed'
  | 'opens_today'
  | 'future'
  | 'expired';

export type RedemptionStatus = 'pending' | 'redeemed';

export interface PublicCampaignConfig {
  salonName: string;
  campaignYear: number;
  startDate: string;
  endDate: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  timezone: string;
  validityEndDate: string;
  whatsappNumber: string;
  instagramHandle: string;
  tiktokHandle: string;
  locationText: string;
  slogan: string;
  conditions: string[];
  founderPhotoUrl: string;
  founderPhotoMode: 'fixed' | 'editable';
  simulationIso: string | null;
  testUnlockAll: boolean;
}

export interface PublicDoorView {
  day: number;
  state: DoorAvailabilityState;
  isClaimed: boolean;
  opensAtLabel: string;
  prizeCategoryHint: string;
}

export interface MadridTimeSnapshot {
  isoNow: string;
  madridDate: string; // YYYY-MM-DD
  madridTime: string; // HH:MM:SS
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  isSimulated: boolean;
  nextOpenIso: string | null;
  nextOpenDay: number | null;
}

export interface PublicCalendarResponse {
  config: PublicCampaignConfig;
  time: MadridTimeSnapshot;
  doors: PublicDoorView[];
  isSeeded?: boolean;
}

export interface WinnerReceipt {
  day: number;
  prizeTitle: string;
  prizeDescription: string;
  prizeCategory: string;
  claimCode: string;
  winnerRef: string;
  claimedAtMadrid: string;
  claimedAtIso: string;
  redemptionStatus: RedemptionStatus;
  validityEndDate: string;
  whatsappUrl: string;
}

export interface ClaimAttemptResponse {
  won: boolean;
  reason?: 'already_claimed' | 'not_open_yet' | 'expired' | 'invalid_day';
  message: string;
  receipt?: WinnerReceipt;
}

export interface AdminDoorRecord {
  day: number;
  prizeTitle: string;
  prizeDescription: string;
  prizeCategory: string;
  status: 'available' | 'claimed';
  state: DoorAvailabilityState;
}

export interface AdminClaimRecord {
  id: string;
  day: number;
  prizeTitle: string;
  claimCode: string;
  winnerRef: string;
  claimedAtIso: string;
  claimedAtMadrid: string;
  redemptionStatus: RedemptionStatus;
  redeemedAtIso: string | null;
  redeemedAtMadrid: string | null;
  redeemedNote: string | null;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  details: string;
  actor: string;
  createdAtIso: string;
  createdAtMadrid: string;
}

export interface AdminOverviewStats {
  totalPrizes: number;
  claimedCount: number;
  pendingAwardCount: number;
  redeemedCount: number;
  pendingRedemptionCount: number;
}

export interface AdminDashboardResponse {
  config: PublicCampaignConfig;
  time: MadridTimeSnapshot;
  stats: AdminOverviewStats;
  doors: AdminDoorRecord[];
  claims: AdminClaimRecord[];
  auditLogs: AdminAuditLog[];
  admins: string[];
}
