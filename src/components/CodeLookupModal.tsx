import { useState } from 'react';
import { Check, Copy, ExternalLink, Search, X } from 'lucide-react';
import { lookupReceiptByCode } from '../lib/firebaseCalendar.ts';
import type { WinnerReceipt } from '../types/calendar.ts';

interface CodeLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CodeLookupModal({ isOpen, onClose }: CodeLookupModalProps) {
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<WinnerReceipt | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = codeInput.trim();
    if (!trimmed) {
      setErrorMsg('Introduce tu código de canje (por ejemplo, ALBA26-D01-...).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setReceipt(null);
    try {
      const data = await lookupReceiptByCode(trimmed);
      if (!data) {
        setErrorMsg('No se encontró ningún premio asociado a ese código.');
        return;
      }
      setReceipt(data);
    } catch {
      setErrorMsg('No se pudo consultar el código en este momento.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(receipt.claimCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lookup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231520]/55 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#FFF9FB] border border-[#F0C2D5] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5D0DF] bg-[#FFF0F5]">
          <h3 id="lookup-modal-title" className="font-display text-2xl font-semibold text-[#231520]">
            Consultar mi código
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar consulta"
            className="p-2 rounded-lg text-[#6B4C5E] hover:text-[#231520] hover:bg-[#FCE4EE] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <form onSubmit={handleLookup} className="space-y-3">
            <label htmlFor="receipt-code-input" className="block text-sm font-medium text-[#231520]">
              Introduce el código obtenido al abrir tu casilla
            </label>
            <div className="flex gap-2">
              <input
                id="receipt-code-input"
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="ALBA26-D01-XXXXXX"
                className="flex-1 rounded-lg border border-[#F0C2D5] bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-[#231520] focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span>{loading ? 'Buscando...' : 'Buscar'}</span>
              </button>
            </div>
          </form>

          {errorMsg && (
            <p role="alert" className="text-sm text-[#9D2A2A] bg-[#FDECEC] border border-[#F5C2C2] rounded-lg px-4 py-2.5">
              {errorMsg}
            </p>
          )}

          {receipt && (
            <div className="rounded-xl bg-white border border-[#D4A853]/75 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#BE185D]">Día {receipt.day} de diciembre</span>
                <span
                  className={`font-medium ${
                    receipt.redemptionStatus === 'redeemed' ? 'text-[#6B4C5E]' : 'text-[#16A34A]'
                  }`}
                >
                  {receipt.redemptionStatus === 'redeemed' ? 'Ya canjeado' : 'Pendiente de canje'}
                </span>
              </div>
              <p className="font-display text-xl font-semibold text-[#231520]">{receipt.prizeTitle}</p>
              <p className="text-xs text-[#6B4C5E] leading-relaxed">{receipt.prizeDescription}</p>
              <div className="flex items-center justify-between rounded-lg bg-[#FFF0F5] px-3 py-2 border border-[#F5D0DF]">
                <span className="font-mono text-sm font-semibold text-[#231520] tabular-nums">
                  {receipt.claimCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#231520] hover:text-[#BE185D]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              {receipt.redemptionStatus === 'pending' && (
                <a
                  href={receipt.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-xs font-medium transition-colors"
                >
                  <span>Reservar cita por WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
