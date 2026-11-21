import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  salonName: string;
  isAdminView: boolean;
  isAuthenticated: boolean;
  onOpenAdmin: () => void;
  onBackToCalendar: () => void;
}

export function Navbar({
  salonName,
  isAdminView,
  isAuthenticated,
  onOpenAdmin,
  onBackToCalendar,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Calendario', href: '#calendario' },
    { label: 'Sobre Alba', href: '#sobre-alba' },
    { label: 'Condiciones', href: '#condiciones' },
    { label: 'Privacidad', href: '#privacidad' },
  ];

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (isAdminView) {
      onBackToCalendar();
      setTimeout(() => {
        const el = document.querySelector(href);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFF9FB]/92 backdrop-blur-md border-b border-[#F5D0DF]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="#inicio"
          onClick={(e) => {
            if (isAdminView) {
              e.preventDefault();
              onBackToCalendar();
            }
          }}
          className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#231520] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853] rounded"
        >
          {salonName}
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6B4C5E]">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => handleNavClick(item.href)}
              className="hover:text-[#BE185D] hover:underline underline-offset-4 decoration-[#D4A853] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853] rounded px-1 py-0.5"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {isAdminView ? (
            <button
              type="button"
              onClick={onBackToCalendar}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-[#231520] bg-[#FFF0F5] hover:bg-[#FCE4EE] border border-[#F0C2D5] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
            >
              Volver al calendario
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#BE185D] hover:bg-[#9D174D] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
            >
              {isAuthenticated ? 'Panel de Alba' : 'Acceso Alba'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="md:hidden p-2 text-[#231520] hover:bg-[#FFF0F5] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-[#F5D0DF] bg-[#FFF9FB] px-6 py-4 flex flex-col gap-3 text-sm font-medium text-[#6B4C5E]">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => handleNavClick(item.href)}
              className="py-1.5 hover:text-[#BE185D] transition-colors whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
