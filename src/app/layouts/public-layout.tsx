import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Calendar, GraduationCap, Lock, Building, MapPin } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Institutional Top Ribbon */}
      <div className="bg-[#091E3A] text-slate-300 text-xs py-1.5 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">UNIVERSIDAD NACIONAL DE LA AMAZONÍA PERUANA</span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:inline text-amber-300 font-medium">ESCUELA DE POSTGRADO</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-slate-400">Iquitos, Loreto - Perú</span>
            <NavLink
              to="/admin"
              className="inline-flex items-center gap-1 text-slate-300 hover:text-white hover:underline text-xs"
            >
              <Lock className="h-3 w-3" />
              <span>Acceso Administrativo</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Main Institutional Header */}
      <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-[#0B2545] text-amber-300 flex items-center justify-center font-black text-xl shadow-md border-2 border-amber-400/40">
              EPG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-none">
                  Agenda de Sustentaciones
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                  Oficial
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Programación pública de grados y títulos de maestría y doctorado — UNAP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs h-9">
              <NavLink to="/agenda">
                <Calendar className="h-3.5 w-3.5 text-slate-600" />
                <span>Ver Agenda Completa</span>
              </NavLink>
            </Button>
            <Button asChild variant="unap" size="sm" className="gap-1.5 text-xs h-9">
              <NavLink to="/admin">
                <Lock className="h-3.5 w-3.5" />
                <span>Panel Interno</span>
              </NavLink>
            </Button>
          </div>
        </div>
      </header>

      {/* Public Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        <Outlet />
      </main>

      {/* Institutional Footer */}
      <footer className="bg-[#091E3A] text-slate-400 text-xs py-8 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <div className="font-bold text-white text-sm">Escuela de Postgrado — UNAP</div>
            <div className="mt-1 flex items-center justify-center md:justify-start gap-1 text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
              <span>Calle Los Lirios 125, San Juan Bautista, Iquitos - Loreto, Perú</span>
            </div>
            <div className="mt-0.5 text-slate-500">
              Contacto: posgrado@unapiquitos.edu.pe | Teléfono: +51 (065) 24-1512
            </div>
          </div>

          <div className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} Escuela de Postgrado de la Universidad Nacional de la Amazonía Peruana.<br />
            Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};
