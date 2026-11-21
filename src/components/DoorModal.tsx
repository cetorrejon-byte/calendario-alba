import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Clock, Copy, ExternalLink, Gift, Lock, X } from 'lucide-react';
import giftBoxImage from '../assets/images/beauty_gift_box_1795218709067.jpg';
import { attemptAtomicClaim, lookupReceiptByCode } from '../lib/firebaseCalendar.ts';
import type { ClaimAttemptResponse, PublicCampaignConfig, PublicDoorView, WinnerReceipt } from '../types/calendar.ts';

interface DoorModalProps {
  door: PublicDoorView | null;
  savedReceiptForDoor: WinnerReceipt | null;
  config: PublicCampaignConfig;
  onClose: () => void;
  onClaimSuccess: (receipt: WinnerReceipt) => void;
}

const GIFT_BOX_IMAGE = giftBoxImage;

export function DoorModal({
  door,
  savedReceiptForDoor,
  config,
  onClose,
  onClaimSuccess,
}: DoorModalProps) {
  const [claiming, setClaiming] = useState(false);
  const [attemptResult, setAttemptResult] = useState<ClaimAttemptResponse | null>(null);
  const [liveReceipt, setLiveReceipt] = useState<WinnerReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setAttemptResult(null);
    setLiveReceipt(null);
    setErrorMsg(null);
    setCopied(false);
    setClaiming(false);
  }, [door?.day]);

  useEffect(() => {
    if (!door || !savedReceiptForDoor || attemptResult?.won) return;
    let active = true;
    lookupReceiptByCode(savedReceiptForDoor.claimCode)
      .then((fresh) => {
        if (active && fresh) {
          setLiveReceipt(fresh);
        }
      })
      .catch(() => {
        // Ignore network errors when refreshing cached receipt
      });
    return () => {
      active = false;
    };
  }, [door, savedReceiptForDoor, attemptResult?.won]);

  if (!door) return null;

  const openTimeLabel = `${String(config.openHour).padStart(2, '0')}:${String(config.openMinute).padStart(2, '0')} h`;
  const activeReceipt =
    attemptResult?.won && attemptResult.receipt
      ? attemptResult.receipt
      : liveReceipt || savedReceiptForDoor;

  const handleAttemptClaim = async () => {
    setClaiming(true);
    setErrorMsg(null);
    try {
      const data = await attemptAtomicClaim(door.day);
      setAttemptResult(data);
      if (data.won && data.receipt) {
        onClaimSuccess(data.receipt);
      }
    } catch {
      setErrorMsg('No se pudo conectar con la base de datos. Inténtalo de nuevo.');
    } finally {
      setClaiming(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="door-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231520]/55 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#FFF9FB] border border-[#F0C2D5] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5D0DF] bg-[#FFF0F5]">
          <div>
            <p className="text-xs font-medium text-[#BE185D]">Calendario de Adviento 2026</p>
            <h3 id="door-modal-title" className="font-display text-2xl font-semibold text-[#231520]">
              Día {door.day} de diciembre
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-2 rounded-lg text-[#6B4C5E] hover:text-[#231520] hover:bg-[#FCE4EE] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {activeReceipt ? (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FCE7F3] border border-[#D4A853] text-[#BE185D]">
                  <Gift className="w-6 h-6" aria-hidden="true" />
                </div>
                <h4 className="font-display text-3xl font-bold tracking-tight text-[#231520]">
                  ¡FELICIDADES!
                </h4>
                <p className="text-sm sm:text-base text-[#5A3E4E]">
                  Has sido la primera persona en descubrir la sorpresa de hoy. Alba tiene un regalo especial para ti.
                </p>
              </div>

              <div className="rounded-xl bg-white border border-[#D4A853]/75 p-5 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#BE185D]">{activeReceipt.prizeCategory}</p>
                  <p className="font-display text-2xl font-semibold text-[#231520]">
                    {activeReceipt.prizeTitle}
                  </p>
                  <p className="text-sm text-[#6B4C5E] leading-relaxed">
                    {activeReceipt.prizeDescription}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F5D0DF] space-y-2">
                  <p className="text-xs font-medium text-[#6B4C5E]">Tu código exclusivo de canje</p>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-[#FFF0F5] border border-[#F0C2D5] px-4 py-3">
                    <span className="font-mono text-base sm:text-lg font-semibold tracking-wider text-[#231520] tabular-nums">
                      {activeReceipt.claimCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(activeReceipt.claimCode)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-[#FCE7F3] border border-[#F0C2D5] text-xs font-medium text-[#231520] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#16A34A]" aria-hidden="true" />
                          <span>Código copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copiar código</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs text-[#6B4C5E]">
                  <div>
                    <span className="block text-[#8C5E74]">Registro ganadora</span>
                    <span className="font-mono font-medium text-[#231520] tabular-nums">
                      {activeReceipt.winnerRef}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[#8C5E74]">Válido hasta</span>
                    <span className="font-mono font-medium text-[#231520] tabular-nums">
                      {activeReceipt.validityEndDate}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {activeReceipt.redemptionStatus === 'redeemed' ? (
                  <div className="rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-3 text-center space-y-1">
                    <p className="text-sm font-semibold text-[#166534]">
                      Premio ya canjeado / cobrado
                    </p>
                    <p className="text-xs text-[#15803D]">
                      Este código ya fue validado en Alba’s Beauty Salón y la casilla queda cerrada definitivamente.
                    </p>
                  </div>
                ) : (
                  <>
                    <a
                      href={activeReceipt.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
                    >
                      <span>Contactar con Alba por WhatsApp</span>
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </a>
                    <p className="text-xs text-center text-[#6B4C5E]">
                      El mensaje de WhatsApp incluye automáticamente tu código. Guarda también una captura como respaldo.
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : attemptResult && !attemptResult.won ? (
            <div className="text-center space-y-4 py-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FCE7F3] border border-[#F0C2D5] text-[#DB2777]">
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <h4 className="font-display text-2xl font-semibold text-[#231520]">
                {attemptResult.reason === 'already_claimed' ? 'Regalo ya adjudicado' : 'Casilla no disponible'}
              </h4>
              <p className="text-sm sm:text-base text-[#5A3E4E] leading-relaxed max-w-md mx-auto">
                {attemptResult.message}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-sm font-medium transition-colors"
              >
                Entendido
              </button>
            </div>
          ) : door.state === 'available_now' ? (
            <div className="space-y-5">
              <div className="rounded-xl overflow-hidden border border-[#F2C6D8] aspect-[4/3] bg-[#FFF0F5]">
                {imgFailed ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#FFF0F5]">
                    <Gift className="w-10 h-10 text-[#BE185D]" aria-hidden="true" />
                    <span className="mt-2 font-display text-xl text-[#231520]">Sorpresa del día {door.day}</span>
                  </div>
                ) : (
                  <img
                    src={GIFT_BOX_IMAGE}
                    alt={`Caja regalo de Alba’s Beauty Salón para el día ${door.day}`}
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="space-y-2 text-center">
                <p className="text-xs font-medium text-[#BE185D]">Categoría · {door.prizeCategoryHint}</p>
                <h4 className="font-display text-2xl font-semibold text-[#231520]">
                  La sorpresa de hoy está lista para abrirse
                </h4>
                <p className="text-sm text-[#6B4C5E] leading-relaxed">
                  La primera persona en pulsar el botón recibirá el código exclusivo de canje. No solicitamos datos personales innecesarios para participar.
                </p>
              </div>

              {errorMsg && (
                <p role="alert" className="text-sm text-[#9D2A2A] bg-[#FDECEC] border border-[#F5C2C2] rounded-lg px-4 py-2.5">
                  {errorMsg}
                </p>
              )}

              <button
                type="button"
                disabled={claiming}
                onClick={handleAttemptClaim}
                className="w-full py-3.5 px-6 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] disabled:opacity-60 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
              >
                {claiming ? 'Comprobando disponibilidad...' : 'Abrir regalo de hoy'}
              </button>
            </div>
          ) : door.state === 'claimed' ? (
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FCE7F3] border border-[#F0C2D5] text-[#DB2777]">
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <h4 className="font-display text-2xl font-semibold text-[#231520]">
                Este regalo ya tiene ganadora
              </h4>
              <p className="text-sm sm:text-base text-[#5A3E4E] leading-relaxed">
                ¡Qué pena! El regalo de hoy ya tiene ganadora. Pero mañana te espera una nueva sorpresa. ¡Vuelve a visitarnos!
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-sm font-medium transition-colors"
              >
                Volver al calendario
              </button>
            </div>
          ) : door.state === 'opens_today' || door.state === 'future' ? (
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FFF0F5] border border-[#F0C2D5] text-[#B6862C]">
                <Clock className="w-6 h-6" aria-hidden="true" />
              </div>
              <h4 className="font-display text-2xl font-semibold text-[#231520]">
                {door.state === 'opens_today'
                  ? `Se abre hoy a las ${openTimeLabel}`
                  : `Disponible el ${door.day} de diciembre`}
              </h4>
              <p className="text-sm sm:text-base text-[#5A3E4E] leading-relaxed">
                Las puertas del calendario se habilitan puntualmente a las <strong className="font-semibold">{openTimeLabel}</strong> (hora de España, {config.timezone}). ¡Vuelve a esa hora para ser la primera en abrirla!
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F9F4F6] border border-[#EADCE2] text-[#8A727F]">
                <Lock className="w-6 h-6" aria-hidden="true" />
              </div>
              <h4 className="font-display text-2xl font-semibold text-[#231520]">
                Fecha pasada
              </h4>
              <p className="text-sm sm:text-base text-[#5A3E4E] leading-relaxed">
                Esta casilla estuvo disponible únicamente el {door.day} de diciembre entre las {openTimeLabel} y las 23:59 h. Las fechas anteriores no pueden recuperarse, pero te esperamos en las próximas sorpresas.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-sm font-medium transition-colors"
              >
                Volver al calendario
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
