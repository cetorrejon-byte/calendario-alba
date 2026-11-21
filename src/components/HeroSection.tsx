import { useEffect, useState } from 'react';
import { Clock, Gift, Search, Sparkles } from 'lucide-react';
import { resolveAssetPath } from '../lib/calendarDefaults.ts';
import type { MadridTimeSnapshot, PublicCampaignConfig, WinnerReceipt } from '../types/calendar.ts';

interface HeroSectionProps {
  config: PublicCampaignConfig;
  time: MadridTimeSnapshot;
  availableTodayDay: number | null;
  savedReceipts: WinnerReceipt[];
  onExploreCalendar: () => void;
  onOpenLookup: () => void;
  onOpenSavedReceipt: (receipt: WinnerReceipt) => void;
}

function formatCountdown(targetIso: string | null, baseIso: string, elapsedMs: number): string {
  if (!targetIso) return 'Campaña finalizada';
  const targetMs = new Date(targetIso).getTime();
  const currentMs = new Date(baseIso).getTime() + elapsedMs;
  const diff = Math.max(0, targetMs - currentMs);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function HeroSection({
  config,
  time,
  availableTodayDay,
  savedReceipts,
  onExploreCalendar,
  onOpenLookup,
  onOpenSavedReceipt,
}: HeroSectionProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setElapsedMs(0);
    const interval = setInterval(() => {
      setElapsedMs((prev) => prev + 1000);
    }, 1000);
    return () => clearInterval(interval);
  }, [time.isoNow]);

  useEffect(() => {
    setImgFailed(false);
  }, [config.founderPhotoUrl]);

  const openTimeText = `${String(config.openHour).padStart(2, '0')}:${String(config.openMinute).padStart(2, '0')} h`;
  const countdownText = formatCountdown(time.nextOpenIso, time.isoNow, elapsedMs);

  return (
    <section
      id="inicio"
      className="relative overflow-hidden border-b border-[#F5D0DF] bg-gradient-to-br from-[#FFF9FB] via-[#FFF0F5] to-[#FFE4EE]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Editorial Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm font-medium text-[#9D174D]">
              <span>{config.locationText}</span>
              <span aria-hidden="true">·</span>
              <span>1 al 24 de diciembre de {config.campaignYear}</span>
              <span aria-hidden="true">·</span>
              <span>Apertura diaria {openTimeText}</span>
            </div>

            <h1 className="font-display text-[clamp(2.4rem,4.5vw,3.9rem)] leading-[1.06] font-semibold tracking-tight text-[#231520] text-balance">
              Esta Navidad, abre una puerta a la belleza.
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-[#5A3E4E] max-w-xl">
              {config.slogan} Cada noche a las <strong className="font-semibold text-[#231520]">{openTimeText}</strong>{' '}
              (hora peninsular española) se desbloquea una única sorpresa. La primera clienta o seguidora en abrir la casilla del día se lleva el regalo.
            </p>

            {/* Live Schedule / Countdown Strip */}
            <div className="bg-white/85 backdrop-blur-md border border-[#F2C6D8] rounded-xl p-4 sm:p-5 max-w-xl shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#6B4C5E]">
                    <Clock className="w-4 h-4 text-[#C89B3C]" aria-hidden="true" />
                    <span>Hora oficial España ({config.timezone})</span>
                    {(time.isSimulated || config.testUnlockAll) && (
                      <span className="text-[#BE185D] font-semibold">· Modo prueba activo</span>
                    )}
                  </div>
                  <p className="font-mono text-sm sm:text-base font-medium text-[#231520] tabular-nums">
                    {time.madridDate} · {time.madridTime}
                  </p>
                </div>

                <div className="sm:text-right space-y-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#F5D0DF]">
                  {config.testUnlockAll ? (
                    <>
                      <p className="text-xs font-medium text-[#BE185D] flex items-center sm:justify-end gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Pruebas abiertas (sin bloqueo)</span>
                      </p>
                      <p className="font-mono text-sm sm:text-base font-semibold text-[#231520] tabular-nums">
                        Todas las casillas habilitadas
                      </p>
                    </>
                  ) : availableTodayDay !== null ? (
                    <>
                      <p className="text-xs font-medium text-[#BE185D] flex items-center sm:justify-end gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Casilla {availableTodayDay} disponible</span>
                      </p>
                      <p className="font-mono text-sm sm:text-base font-semibold text-[#231520] tabular-nums">
                        Abierta hasta las {String(config.closeHour).padStart(2, '0')}:{String(config.closeMinute).padStart(2, '0')} h
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-[#6B4C5E]">
                        {time.nextOpenDay
                          ? `Próxima apertura · Día ${time.nextOpenDay} de diciembre`
                          : 'Calendario completado'}
                      </p>
                      <p className="font-mono text-sm sm:text-base font-semibold text-[#231520] tabular-nums">
                        {countdownText}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Primary CTA Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onExploreCalendar}
                className="option-tile px-6 py-3 bg-[#BE185D] hover:bg-[#9D174D] text-white text-sm font-medium rounded-lg whitespace-nowrap shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
              >
                {config.testUnlockAll
                  ? 'Probar las 24 casillas'
                  : availableTodayDay !== null
                    ? `Abrir casilla del día ${availableTodayDay}`
                    : 'Ver las 24 casillas'}
              </button>

              <button
                type="button"
                onClick={onOpenLookup}
                className="option-tile inline-flex items-center gap-2 px-4 py-3 bg-white/90 hover:bg-white text-[#231520] border border-[#F0C2D5] hover:border-[#D4A853] text-sm font-medium rounded-lg whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
              >
                <Search className="w-4 h-4 text-[#BE185D]" aria-hidden="true" />
                <span>Consultar mi código</span>
              </button>

              {savedReceipts.length > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenSavedReceipt(savedReceipts[savedReceipts.length - 1])}
                  className="option-tile inline-flex items-center gap-2 px-4 py-3 bg-[#FCE7F3] hover:bg-[#FBCFE8] text-[#831843] border border-[#F472B6]/60 hover:border-[#BE185D] text-sm font-medium rounded-lg whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
                >
                  <Gift className="w-4 h-4 text-[#BE185D]" aria-hidden="true" />
                  <span>Ver mi premio ({savedReceipts.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Alba's Portrait in Champagne-Gold Architectural Arch */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[320px] sm:max-w-[350px]">
              {/* Soft warm illumination behind arch */}
              <div
                aria-hidden="true"
                className="absolute -inset-5 rounded-t-full rounded-b-2xl bg-gradient-to-b from-[#F9A8D4]/30 via-[#FDE68A]/25 to-transparent blur-2xl"
              />

              {/* Subtle outer champagne architectural halo & double border */}
              <div className="relative rounded-t-full rounded-b-xl border border-[#D4A853]/75 bg-white/95 p-2.5 shadow-sm ring-1 ring-[#F3D89B]/60 ring-offset-4 ring-offset-[#FFF2F7]">
                <div className="relative rounded-t-full rounded-b-lg overflow-hidden border border-[#F3D89B]/85 aspect-[3/4] bg-[#FFF0F5]">
                  {imgFailed ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#FFF0F5] to-[#FCE7F3]">
                      <span className="font-display text-4xl font-semibold text-[#BE185D]">A</span>
                      <span className="mt-2 text-sm font-medium text-[#5A3E4E]">Alba’s Beauty Salón</span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={resolveAssetPath(config.founderPhotoUrl)}
                        alt="Alba, fundadora de Alba’s Beauty Salón en Alicante"
                        referrerPolicy="no-referrer"
                        onError={() => setImgFailed(true)}
                        className="w-full h-full object-cover object-top"
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_28px_rgba(212,168,83,0.18)]"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 text-center space-y-1">
                <p className="font-display text-xl font-semibold text-[#231520]">Alba · Fundadora</p>
                <div aria-hidden="true" className="w-10 h-px bg-[#D4A853]/75 mx-auto" />
                <p className="text-xs sm:text-sm italic text-[#6B4C5E]">
                  “Esta Navidad, regálate un momento para ti.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
