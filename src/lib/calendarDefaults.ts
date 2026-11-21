import type { PublicCampaignConfig } from '../types/calendar.ts';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'cetorrejon@gmail.com';
export const DEFAULT_FOUNDER_PHOTO = './assets/aistudio/Alba_2f553937.png';

export function resolveAssetPath(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return `${import.meta.env.BASE_URL}assets/aistudio/Alba_2f553937.png`;
  }
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const normalized = trimmed.replace(/^\.?\//, '');
  return `${import.meta.env.BASE_URL}${normalized}`;
}

export const DEFAULT_CONDITIONS: string[] = [
  'Cada premio se adjudica exclusivamente a una sola persona (la primera en completar la apertura de la casilla correspondiente).',
  'Cada código es único, personal y no transferible.',
  'El código deberá presentarse por WhatsApp (+34 624 531 323) o directamente en el salón antes de la fecha límite de vigencia.',
  'La reserva estará sujeta a disponibilidad de agenda de Alba’s Beauty Salón.',
  'Los descuentos no serán acumulables con otras promociones, salvo autorización expresa de Alba.',
  'Los premios no podrán cambiarse por dinero en efectivo ni por otros servicios no especificados.',
  'Los servicios gratuitos deberán disfrutarse previa reserva.',
  'La ganadora deberá confirmar su cita indicando el código único recibido en el momento de la adjudicación.',
];

export const SEED_PRIZES: Array<{ day: number; title: string; description: string; category: string }> = [
  {
    day: 1,
    title: '10% de descuento en higiene facial',
    description: 'Disfruta de un 10% de descuento exclusivo en nuestro tratamiento de higiene facial personalizada.',
    category: 'Facial',
  },
  {
    day: 2,
    title: 'Cepillito de pestañas de regalo',
    description: 'Llévate de regalo un cepillito profesional para peinar y mantener impecables tus pestañas y cejas cada día.',
    category: 'Pestañas',
  },
  {
    day: 3,
    title: '10% de descuento en laminado de cejas',
    description: 'Vale del 10% de descuento en tu sesión de laminado de cejas para lucir una mirada definida y natural.',
    category: 'Cejas',
  },
  {
    day: 4,
    title: 'Depilación de cejas gratis',
    description: 'Sesión gratuita de diseño y depilación de cejas adaptada a la armonía de tu rostro.',
    category: 'Cejas',
  },
  {
    day: 5,
    title: '5% de descuento lifting de pestañas',
    description: 'Aprovecha un 5% de descuento en nuestro tratamiento de lifting de pestañas para elevar y curvar tu mirada.',
    category: 'Pestañas',
  },
  {
    day: 6,
    title: '50% de descuento higiene facial',
    description: 'Gran sorpresa de Adviento: 50% de descuento en una sesión completa de higiene facial.',
    category: 'Facial',
  },
  {
    day: 7,
    title: '10% de descuento laminado de cejas',
    description: 'Vale exclusivo del 10% de descuento en laminado de cejas para un acabado pulido y duradero.',
    category: 'Cejas',
  },
  {
    day: 8,
    title: '10% de descuento higiene facial',
    description: 'Disfruta de un 10% de descuento en nuestra higiene facial para renovar y purificar tu piel.',
    category: 'Facial',
  },
  {
    day: 9,
    title: '10% de descuento lifting de pestañas',
    description: 'Vale del 10% de descuento en lifting de pestañas para potenciar la curvatura natural sin extensiones.',
    category: 'Pestañas',
  },
  {
    day: 10,
    title: '10% de descuento laminado de cejas',
    description: 'Benefíciate de un 10% de descuento en nuestro servicio de laminado de cejas.',
    category: 'Cejas',
  },
  {
    day: 11,
    title: '10% de descuento higiene facial',
    description: '10% de descuento para mimar tu rostro con una sesión de higiene facial profunda.',
    category: 'Facial',
  },
  {
    day: 12,
    title: 'Depilación de cejas gratis',
    description: 'Servicio gratuito de depilación de cejas con diseño personalizado en Alba’s Beauty Salón.',
    category: 'Cejas',
  },
  {
    day: 13,
    title: 'Mascarilla de skin care de regalo',
    description: 'Llévate de regalo una mascarilla de skin care para continuar tu ritual de hidratación y luminosidad en casa.',
    category: 'Skin Care',
  },
  {
    day: 14,
    title: '10% de descuento en laminado de cejas',
    description: 'Vale del 10% de descuento en laminado de cejas para unas cejas peinadas, suaves y definidas.',
    category: 'Cejas',
  },
  {
    day: 15,
    title: 'Depilación de cejas gratis',
    description: 'Sesión gratuita de depilación de cejas para perfilar y realzar tu expresión natural.',
    category: 'Cejas',
  },
  {
    day: 16,
    title: 'Depilación de cejas gratis',
    description: 'Regalo directo de una depilación de cejas gratuita realizada en nuestro salón.',
    category: 'Cejas',
  },
  {
    day: 17,
    title: '50% de descuento higiene facial',
    description: 'Descuento especial del 50% en higiene facial para dejar tu piel limpia, suave y luminosa.',
    category: 'Facial',
  },
  {
    day: 18,
    title: '10% de descuento laminado de cejas',
    description: 'Disfruta de un 10% de descuento en nuestro tratamiento de laminado de cejas.',
    category: 'Cejas',
  },
  {
    day: 19,
    title: '10% de descuento higiene facial',
    description: 'Vale del 10% de descuento en higiene facial para preparar tu piel antes de las celebraciones.',
    category: 'Facial',
  },
  {
    day: 20,
    title: '50% de descuento higiene facial',
    description: 'Sorpresa especial del día 20: 50% de descuento en una sesión de higiene facial.',
    category: 'Facial',
  },
  {
    day: 21,
    title: 'Depilación de cejas gratis',
    description: 'Depilación de cejas gratuita para lucir una mirada limpia y equilibrada estas fiestas.',
    category: 'Cejas',
  },
  {
    day: 22,
    title: 'Depilación de cejas gratis',
    description: 'Disfruta de una sesión gratuita de depilación de cejas previa reserva en el salón.',
    category: 'Cejas',
  },
  {
    day: 23,
    title: 'Depilación de cejas gratis',
    description: 'Último día de cejas perfectas pre-Nochebuena: depilación de cejas gratis en Alba’s Beauty Salón.',
    category: 'Cejas',
  },
  {
    day: 24,
    title: 'Higiene facial completa gratis',
    description: 'Gran regalo de Nochebuena: una sesión completa de higiene facial gratuita para comenzar el año con piel radiante.',
    category: 'Especial Navidad',
  },
];

export const DEFAULT_CAMPAIGN_CONFIG: PublicCampaignConfig = {
  salonName: 'Alba’s Beauty Salón',
  campaignYear: 2026,
  startDate: '2026-12-01',
  endDate: '2026-12-24',
  openHour: 22,
  openMinute: 0,
  closeHour: 23,
  closeMinute: 59,
  timezone: 'Europe/Madrid',
  validityEndDate: '2027-01-31',
  whatsappNumber: '34624531323',
  instagramHandle: '@albas.beauttysalon',
  tiktokHandle: '@albas.beauttysalon',
  locationText: 'Alicante, España',
  slogan: 'Esta Navidad, abre una puerta a la belleza. 24 días, 24 sorpresas y un regalo especial cada día.',
  conditions: DEFAULT_CONDITIONS,
  founderPhotoUrl: DEFAULT_FOUNDER_PHOTO,
  founderPhotoMode: 'editable',
  simulationIso: null,
  testUnlockAll: true,
};

export function buildWhatsappRedeemUrl(
  whatsappNumber: string,
  day: number,
  prizeTitle: string,
  claimCode: string
): string {
  const cleanDigits = whatsappNumber.replace(/[^0-9]/g, '');
  const text = `¡Hola Alba! He ganado la sorpresa del día ${day} de diciembre en el Calendario de Adviento de Alba’s Beauty Salón: "${prizeTitle}". Mi código exclusivo de canje es: ${claimCode}. Me gustaría confirmar mi cita.`;
  return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(text)}`;
}
