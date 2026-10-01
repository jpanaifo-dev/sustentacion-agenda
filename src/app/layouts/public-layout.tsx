import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Calendar, GraduationCap, Lock, Building, MapPin } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Institutional Top Ribbon */}
      <div className="bg-[#091E3A] text-slate-300 text-xs py-2 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-wide">UNIVERSIDAD NACIONAL DE LA AMAZONÍA PERUANA</span>
            <span className="hidden sm:inline text-slate-600">/</span>
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px]">ESCUELA DE POSTGRADO</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hidden md:inline text-slate-400">Iquitos, Loreto — Perú</span>
            <NavLink
              to="/admin"
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-amber-400 transition-colors uppercase font-mono tracking-wider text-[10px] border border-slate-700 hover:border-amber-400/60 px-2 py-0.5 rounded-sm"
            >
              <Lock className="h-3 w-3" />
              <span>Acceso Administrativo</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Main Institutional Header */}
      <header className="bg-white border-b-2 border-[#091E3A] sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-[#091E3A] text-amber-400 flex items-center justify-center font-anton text-2xl border-2 border-amber-400 shrink-0 rounded-sm">
              EPG
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-anton text-[#091E3A] uppercase tracking-tight leading-none">
                  Agenda de Sustentaciones
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-400 text-slate-950 uppercase border border-amber-500 rounded-sm">
                  OFICIAL
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-mono">
                SISTEMA PÚBLICO DE PROGRAMACIÓN DE DEFENSAS DE GRADO — UNAP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-sm border-2 border-slate-300 hover:border-[#091E3A] text-xs h-9 font-semibold uppercase tracking-wider">
              <NavLink to="/agenda">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                <span>Ver Agenda</span>
              </NavLink>
            </Button>
            <Button asChild variant="unap" size="sm" className="rounded-sm bg-[#091E3A] hover:bg-slate-900 border-2 border-[#091E3A] text-amber-400 text-xs h-9 font-semibold uppercase tracking-wider">
              <NavLink to="/admin">
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                <span>Panel Interno</span>
              </NavLink>
            </Button>
          </div>
        </div>
      </header>

      {/* Public Content Body - Container without max-w constraint */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <Outlet />
      </main>

      {/* Institutional Footer */}
      <footer className="bg-[#091E3A] text-slate-400 text-xs py-8 border-t-2 border-amber-400 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <div className="font-anton text-white text-xl uppercase tracking-wider">
              Escuela de Postgrado — UNAP
            </div>
            <div className="mt-1 flex items-center justify-center md:justify-start gap-1.5 text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Calle Los Lirios 125, San Juan Bautista, Iquitos - Loreto, Perú</span>
            </div>
            <div className="mt-1 text-slate-400 font-mono text-[11px]">
              Contacto: posgrado@unapiquitos.edu.pe | Teléfono: +51 (065) 24-1512
            </div>
          </div>

          <div className="text-slate-400 text-[11px] font-mono border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
            © {new Date().getFullYear()} Escuela de Postgrado de la Universidad Nacional de la Amazonía Peruana.<br />
            Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};
