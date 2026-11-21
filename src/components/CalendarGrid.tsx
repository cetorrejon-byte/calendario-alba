import { CheckCircle2, Clock, Gift, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import type { PublicDoorView } from '../types/calendar.ts';

interface CalendarGridProps {
  doors: PublicDoorView[];
  openHour: number;
  openMinute: number;
  onSelectDoor: (door: PublicDoorView) => void;
}

export function CalendarGrid({ doors, openHour, openMinute, onSelectDoor }: CalendarGridProps) {
  const openTimeLabel = `${String(openHour).padStart(2, '0')}:${String(openMinute).padStart(2, '0')} h`;
  const claimedTotal = doors.filter((d) => d.state === 'claimed').length;

  return (
    <section id="calendario" className="py-12 sm:py-16 bg-[#FFF9FB]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-[#F5D0DF]">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs sm:text-sm font-medium text-[#BE185D]">
              Edición Navidad 2026 · {claimedTotal} de 24 sorpresas adjudicadas
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#231520] tracking-tight">
              Las 24 puertas de belleza
            </h2>
            <p className="text-sm sm:text-base text-[#6B4C5E]">
              Cada casilla corresponde a un día de diciembre y se habilita exclusivamente a las {openTimeLabel} hasta las 23:59 h.
            </p>
          </div>

          {/* Unboxed typographic status guide */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#6B4C5E]">
            <span className="inline-flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-[#BE185D]" aria-hidden="true" />
              <span>Disponible hoy</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#DB2777]" aria-hidden="true" />
              <span>Ya adjudicada</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#B6862C]" aria-hidden="true" />
              <span>Abre a las {openTimeLabel}</span>
            </span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
          {doors.map((door) => {
            const isAvailable = door.state === 'available_now';
            const isClaimed = door.state === 'claimed';
            const isOpensToday = door.state === 'opens_today';
            const isExpired = door.state === 'expired';
            const isCompleted = isClaimed || isExpired;

            let containerStyles =
              'bg-white border border-[#F5D0DF] hover:border-[#D4A853] text-[#231520]';
            let statusText = door.opensAtLabel;
            let statusIcon = <Lock className="w-3.5 h-3.5 text-[#B48A9E]" aria-hidden="true" />;
            let statusTextColor = 'text-[#7E5A6E]';

            if (isAvailable) {
              containerStyles =
                'bg-gradient-to-b from-white to-[#FFF0F6] border-2 border-[#DB2777] shadow-sm ring-2 ring-[#D4A853]/40 text-[#231520]';
              statusText = 'Disponible ahora';
              statusIcon = <Gift className="w-3.5 h-3.5 text-[#BE185D]" aria-hidden="true" />;
              statusTextColor = 'text-[#BE185D] font-semibold';
            } else if (isClaimed) {
              containerStyles =
                'bg-gradient-to-b from-[#FDF2F8] to-[#FCE7F3] border-2 door-completed-claimed text-[#5A3E4E]';
              statusText = 'Adjudicada';
              statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-[#DB2777]" aria-hidden="true" />;
              statusTextColor = 'text-[#9D174D] font-medium';
            } else if (isOpensToday) {
              containerStyles =
                'bg-[#FFFDF7] border-2 border-[#E2B459] hover:border-[#C89B3C] text-[#231520]';
              statusText = `Hoy · ${openTimeLabel}`;
              statusIcon = <Clock className="w-3.5 h-3.5 text-[#B6862C]" aria-hidden="true" />;
              statusTextColor = 'text-[#9A6E18] font-medium';
            } else if (isExpired) {
              containerStyles =
                'bg-[#F7F1FA] border-2 door-completed-expired text-[#6E5A7A]';
              statusText = 'Día realizado';
              statusIcon = <Lock className="w-3.5 h-3.5 text-[#9376A8]" aria-hidden="true" />;
              statusTextColor = 'text-[#7D5E94] font-medium';
            }

            return (
              <motion.button
                key={door.day}
                type="button"
                onClick={() => onSelectDoor(door)}
                aria-label={`Casilla día ${door.day} de diciembre: ${statusText}`}
                animate={
                  isCompleted
                    ? { y: [0, -2.5, 0] }
                    : isAvailable
                      ? { y: [0, -2, 0] }
                      : { y: 0 }
                }
                transition={
                  isCompleted || isAvailable
                    ? {
                        duration: 3.4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: (door.day % 6) * 0.28,
                      }
                    : { duration: 0.16, ease: [0.16, 1, 0.3, 1] }
                }
                whileHover={{
                  y: -5,
                  scale: 1.02,
                  transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
                }}
                whileTap={{
                  scale: 0.98,
                  transition: { duration: 0.1 },
                }}
                className={`option-tile group relative flex flex-col justify-between rounded-t-3xl rounded-b-xl p-4 min-h-[154px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853] ${containerStyles}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-medium text-[#8C5E74] truncate">
                    {door.prizeCategoryHint}
                  </span>
                  {statusIcon}
                </div>

                <div className="my-2">
                  <span className="font-display text-4xl sm:text-[42px] leading-none font-semibold tabular-nums tracking-tight">
                    {String(door.day).padStart(2, '0')}
                  </span>
                  <span className="block text-[11px] text-[#8C5E74] mt-1">diciembre</span>
                </div>

                <div className="pt-2 border-t border-[#F5D0DF]/70">
                  <span className={`text-xs block truncate ${statusTextColor}`}>{statusText}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
