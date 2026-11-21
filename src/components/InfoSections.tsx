import { useState } from 'react';
import { Check, ExternalLink, Instagram, Share2, ShieldCheck } from 'lucide-react';
import salonHeroImage from '../assets/images/salon_holiday_hero_1795218708499.jpg';
import type { PublicCampaignConfig } from '../types/calendar.ts';

interface InfoSectionsProps {
  config: PublicCampaignConfig;
}

const SALON_HERO_IMG = salonHeroImage;

function formatSpanishDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  const year = parts[0];
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  return `${day} de ${months[monthIdx] || parts[1]} de ${year}`;
}

export function InfoSections({ config }: InfoSectionsProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const cleanIg = config.instagramHandle.replace(/^@/, '');
  const cleanTt = config.tiktokHandle.replace(/^@/, '');
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `¡Descubre el Calendario de Adviento 2026 de ${config.salonName}! Cada día a las 22:00 h hay una nueva sorpresa de belleza: ${window.location.href}`
  )}`;
  const directWhatsappUrl = `https://wa.me/${config.whatsappNumber.replace(/[^0-9]/g, '')}`;

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <>
      {/* Sobre Alba & Difusión */}
      <section id="sobre-alba" className="py-12 sm:py-16 border-t border-[#F5D0DF] bg-[#FFF2F7]/75">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-[#F0C2D5] bg-[#FFF0F5] min-h-[260px]">
              {imgFailed ? (
                <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center p-8 text-center">
                  <span className="font-display text-3xl font-semibold text-[#231520]">{config.salonName}</span>
                  <span className="mt-1 text-sm text-[#6B4C5E]">{config.locationText}</span>
                </div>
              ) : (
                <img
                  src={SALON_HERO_IMG}
                  alt="Interior de Alba’s Beauty Salón en Alicante con detalles navideños"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
              <p className="text-xs sm:text-sm font-medium text-[#BE185D]">
                {config.locationText} · Belleza y cuidado personalizado
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#231520] tracking-tight">
                Un detalle navideño pensado para nuestras clientas
              </h2>
              <p className="text-sm sm:text-base text-[#5A3E4E] leading-relaxed">
                En <strong>{config.salonName}</strong> celebramos la Navidad agradeciendo tu confianza durante todo el año. Sigue nuestros recordatorios diarios antes de las {String(config.openHour).padStart(2, '0')}:{String(config.openMinute).padStart(2, '0')} h en redes sociales para no perderte ninguna sorpresa.
              </p>

              <div className="pt-2 border-t border-[#F2C6D8] space-y-3">
                <p className="text-xs font-medium text-[#8C5E74]">Canales oficiales y difusión</p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`https://www.instagram.com/${encodeURIComponent(cleanIg)}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="option-tile inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-[#FFF0F5] border border-[#F0C2D5] hover:border-[#BE185D] text-xs sm:text-sm font-medium text-[#231520] whitespace-nowrap"
                  >
                    <Instagram className="w-4 h-4 text-[#BE185D]" aria-hidden="true" />
                    <span>Instagram {config.instagramHandle}</span>
                  </a>

                  <a
                    href={`https://www.tiktok.com/@${encodeURIComponent(cleanTt)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="option-tile inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-[#FFF0F5] border border-[#F0C2D5] hover:border-[#D4A853] text-xs sm:text-sm font-medium text-[#231520] whitespace-nowrap"
                  >
                    <ExternalLink className="w-4 h-4 text-[#BE185D]" aria-hidden="true" />
                    <span>TikTok {config.tiktokHandle}</span>
                  </a>

                  <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="option-tile inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-[#FFF0F5] border border-[#F0C2D5] hover:border-[#BE185D] text-xs sm:text-sm font-medium text-[#231520] whitespace-nowrap"
                  >
                    <Share2 className="w-4 h-4 text-[#BE185D]" aria-hidden="true" />
                    <span>Compartir por WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="option-tile inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] border border-transparent hover:border-[#D4A853] text-white text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    {copiedLink ? <Check className="w-4 h-4" aria-hidden="true" /> : <Share2 className="w-4 h-4" aria-hidden="true" />}
                    <span>{copiedLink ? 'Enlace copiado' : 'Copiar enlace'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Condiciones de los Premios y Canjes */}
      <section id="condiciones" className="py-12 sm:py-16 border-t border-[#F5D0DF] bg-[#FFF9FB]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-4">
              <p className="text-xs sm:text-sm font-medium text-[#BE185D]">Reglamento oficial</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#231520] tracking-tight">
                Condiciones de premios y canjes
              </h2>
              <p className="text-sm text-[#5A3E4E] leading-relaxed">
                Los premios obtenidos entre el 1 y el 24 de diciembre de {config.campaignYear} podrán disfrutarse hasta el{' '}
                <strong className="font-semibold text-[#231520]">{formatSpanishDate(config.validityEndDate)}</strong>.
              </p>
              <div className="pt-2">
                <a
                  href={directWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#231520] underline underline-offset-4 decoration-[#D4A853] hover:text-[#BE185D]"
                >
                  <span>WhatsApp de atención: +{config.whatsappNumber}</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-8">
              <ol className="divide-y divide-[#F5D0DF] border-y border-[#F5D0DF]">
                {config.conditions.map((rule, index) => (
                  <li key={index} className="py-4 flex items-start gap-4">
                    <span className="font-mono text-xs font-semibold text-[#BE185D] pt-0.5 tabular-nums shrink-0">
                      {String(index + 1).padStart(2, '0')}.
                    </span>
                    <p className="text-sm sm:text-base text-[#4A2E3F] leading-relaxed">{rule}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Protección de Datos y Privacidad (RGPD) */}
      <section id="privacidad" className="py-12 sm:py-16 border-t border-[#F5D0DF] bg-[#FFF0F5]/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-2.5 text-[#BE185D]">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium">Cumplimiento RGPD y normativa española</span>
            </div>

            <h2 className="font-display text-3xl font-semibold text-[#231520] tracking-tight">
              Protección de datos y privacidad
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-[#5A3E4E] leading-relaxed">
              <div className="space-y-3">
                <h3 className="font-sans text-sm font-semibold text-[#231520]">
                  Principio de minimización de datos
                </h3>
                <p>
                  Para abrir una casilla del Calendario de Adviento no solicitamos nombre, correo electrónico ni teléfono en la web. Únicamente se genera en el servidor un identificador técnico anónimo de adjudicación y el código único de canje para garantizar que cada premio tenga una sola ganadora.
                </p>
                <h3 className="font-sans text-sm font-semibold text-[#231520] pt-2">
                  Confidencialidad de las ganadoras
                </h3>
                <p>
                  No se publican nombres, teléfonos ni datos personales de las ganadoras en el sitio web ni en redes sociales sin autorización expresa previa.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-sans text-sm font-semibold text-[#231520]">
                  Finalidad, conservación y derechos
                </h3>
                <p>
                  Cuando la ganadora contacta voluntariamente por WhatsApp o acude presencialmente al salón en {config.locationText} para reservar su cita con el código obtenido, los datos facilitados se utilizan exclusivamente para gestionar la cita y verificar el canje del premio.
                </p>
                <p>
                  Los registros de adjudicación y códigos de la campaña se conservarán únicamente durante el periodo necesario para gestionar los canjes (hasta el {formatSpanishDate(config.validityEndDate)}) y atender posibles responsabilidades legales, procediendo posteriormente a su supresión o anonimización.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
