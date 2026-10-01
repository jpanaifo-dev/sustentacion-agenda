import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { defensesService } from '../../services/defenses.service';
import { unitsService } from '../../services/units.service';
import { DefenseWithRelations } from '../../types';
import { StatusBadge } from '../../components/shared/status-badge';
import { formatDate, formatTime } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Search,
  Users,
  Video,
  List,
  CalendarDays,
  ExternalLink,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  CalendarCheck,
  Building,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
  subDays,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

function parseDateParts(dateStr: string) {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayStr = String(day).padStart(2, '0');
    const monthStr = date.toLocaleString('es-PE', { month: 'short' }).toUpperCase().replace('.', '');
    const weekdayStr = date.toLocaleString('es-PE', { weekday: 'short' }).toUpperCase().replace('.', '');
    return { dayStr, monthStr, weekdayStr, year };
  } catch {
    return { dayStr: '--', monthStr: '---', weekdayStr: '---', year: '' };
  }
}

type ViewMode = 'month' | 'day' | 'list';

export const PublicAgendaPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedModality, setSelectedModality] = useState<string>('ALL');
  const [selectedDefense, setSelectedDefense] = useState<DefenseWithRelations | null>(null);

  const { data: defenses = [], isLoading: isLoadingDefenses } = useQuery({
    queryKey: ['public-defenses'],
    queryFn: () => defensesService.getPublicDefenses(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsService.getUnits(),
  });

  // Filtered public defenses
  const filteredDefenses = useMemo(() => {
    return defenses.filter((d) => {
      if (selectedUnit !== 'ALL' && d.unit_id !== selectedUnit) return false;
      if (selectedModality !== 'ALL' && d.modality !== selectedModality) return false;
      if (search) {
        const q = search.toLowerCase().trim();
        const codeMatch = d.code?.toLowerCase().includes(q);
        const titleMatch = d.title.toLowerCase().includes(q);
        const studentMatch = d.participants?.some(
          (p) =>
            p.participant_type === 'STUDENT' &&
            `${p.person.first_name} ${p.person.last_name}`.toLowerCase().includes(q)
        );
        if (!codeMatch && !titleMatch && !studentMatch) return false;
      }
      return true;
    });
  }, [defenses, selectedUnit, selectedModality, search]);

  // Map defenses by scheduled_date (YYYY-MM-DD)
  const defensesByDate = useMemo(() => {
    const map = new Map<string, DefenseWithRelations[]>();
    filteredDefenses.forEach((d) => {
      const existing = map.get(d.scheduled_date) || [];
      existing.push(d);
      map.set(d.scheduled_date, existing);
    });
    return map;
  }, [filteredDefenses]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = defenses.length;
    const confirmed = defenses.filter((d) => d.status === 'CONFIRMED').length;
    const virtual = defenses.filter((d) => d.modality === 'VIRTUAL' || d.modality === 'HYBRID').length;
    const presencial = defenses.filter((d) => d.modality === 'PRESENTIAL').length;
    return { total, confirmed, virtual, presencial };
  }, [defenses]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => subMonths(prev, 1));
    } else if (viewMode === 'day') {
      setSelectedDay((prev) => {
        const next = subDays(prev, 1);
        setCurrentDate(next);
        return next;
      });
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => addMonths(prev, 1));
    } else if (viewMode === 'day') {
      setSelectedDay((prev) => {
        const next = addDays(prev, 1);
        setCurrentDate(next);
        return next;
      });
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(now);
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedUnit('ALL');
    setSelectedModality('ALL');
  };

  // Month grid days
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Defenses on selected day for "Diario" view
  const selectedDayKey = format(selectedDay, 'yyyy-MM-dd');
  const defensesForSelectedDay = useMemo(() => {
    const list = defensesByDate.get(selectedDayKey) || [];
    return [...list].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [defensesByDate, selectedDayKey]);

  // Mini week strip for "Diario" view
  const currentWeekDays = useMemo(() => {
    const start = startOfWeek(selectedDay, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDay, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDay]);

  return (
    <div className="space-y-6 w-full pb-12 font-sans">
      {/* Editorial High-Impact Hero Banner */}
      <section className="bg-[#091E3A] border-2 border-[#091E3A] text-white p-6 sm:p-10 relative overflow-hidden rounded-sm">
        {/* Solid architectural accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#C59B27]" />

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-3 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#C59B27] text-slate-950 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider rounded-sm">
                UNAP · EPG
              </span>
              <span className="border border-slate-700 bg-slate-900/80 text-slate-300 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider rounded-sm">
                PROGRAMACIÓN PÚBLICA OFICIAL
              </span>
              <span className="border border-emerald-500/50 bg-emerald-950/60 text-emerald-300 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1 rounded-sm">
                <span className="h-1.5 w-1.5 bg-emerald-400 inline-block animate-pulse rounded-full" />
                EN TIEMPO REAL
              </span>
            </div>

            <h1 className="font-extrabold text-3xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-tight">
              AGENDA DE SUSTENTACIONES
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-sans max-w-3xl leading-relaxed pt-1">
              Registro público y oficial de sustentaciones de tesis de maestría y defensas doctorales de la Escuela de Postgrado de la Universidad Nacional de la Amazonía Peruana.
            </p>
          </div>

          {/* Metric KPI Block strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3 shrink-0">
            <div className="bg-[#061528] border border-slate-800 p-3 sm:p-4 min-w-[120px] rounded-sm">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                TOTAL AGENDA
              </div>
              <div className="font-bold text-2xl sm:text-3xl text-white mt-1 leading-none">
                {stats.total.toString().padStart(2, '0')}
              </div>
              <div className="text-[10px] font-mono text-amber-400 mt-1 uppercase">
                Actos Académicos
              </div>
            </div>

            <div className="bg-[#061528] border border-slate-800 p-3 sm:p-4 min-w-[120px] rounded-sm">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                CONFIRMADAS
              </div>
              <div className="font-bold text-2xl sm:text-3xl text-emerald-400 mt-1 leading-none">
                {stats.confirmed.toString().padStart(2, '0')}
              </div>
              <div className="text-[10px] font-mono text-emerald-300 mt-1 uppercase">
                Listas para acto
              </div>
            </div>

            <div className="bg-[#061528] border border-slate-800 p-3 sm:p-4 min-w-[120px] rounded-sm">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                PRESENCIALES
              </div>
              <div className="font-bold text-2xl sm:text-3xl text-blue-400 mt-1 leading-none">
                {stats.presencial.toString().padStart(2, '0')}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase">
                Auditorios UNAP
              </div>
            </div>

            <div className="bg-[#061528] border border-slate-800 p-3 sm:p-4 min-w-[120px] rounded-sm">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                VIRTUAL / HÍBRIDA
              </div>
              <div className="font-bold text-2xl sm:text-3xl text-amber-300 mt-1 leading-none">
                {stats.virtual.toString().padStart(2, '0')}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase">
                Acceso en línea
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Control & Filter Strip - Subtle rounded-sm, zero shadows */}
      <section className="bg-white border-2 border-slate-900 p-4 sm:p-5 rounded-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search, Unit, and Modality filters */}
          <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
              <Input
                placeholder="Buscar por tesis, código, tesista..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-sm border border-slate-300 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:border-slate-900 focus:bg-white"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-900 font-mono"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Unit Selector */}
            <div className="sm:w-72">
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full h-10 rounded-sm border border-slate-300 bg-slate-50 px-3 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white cursor-pointer"
              >
                <option value="ALL">TODAS LAS UNIDADES DE POSGRADO</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.acronym ? `[${u.acronym}] ${u.name}` : u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Modality Selector */}
            <div className="sm:w-44">
              <select
                value={selectedModality}
                onChange={(e) => setSelectedModality(e.target.value)}
                className="w-full h-10 rounded-sm border border-slate-300 bg-slate-50 px-3 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white cursor-pointer uppercase"
              >
                <option value="ALL">MODALIDAD: TODAS</option>
                <option value="PRESENTIAL">PRESENCIAL</option>
                <option value="VIRTUAL">VIRTUAL</option>
                <option value="HYBRID">HÍBRIDA</option>
              </select>
            </div>

            {(search || selectedUnit !== 'ALL' || selectedModality !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="h-10 px-3 rounded-sm border border-slate-300 text-slate-600 hover:text-slate-900 text-xs font-mono uppercase"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          {/* View Mode Switcher (Mes / Diario / Agenda) */}
          <div className="flex items-center gap-1 border-2 border-slate-900 p-0.5 bg-slate-100 self-start sm:self-auto shrink-0 rounded-sm">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors rounded-sm ${
                viewMode === 'month'
                  ? 'bg-[#091E3A] text-amber-400 border border-[#091E3A]'
                  : 'bg-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>Mes</span>
            </button>
            <button
              onClick={() => {
                setViewMode('day');
                setSelectedDay(currentDate);
              }}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors rounded-sm ${
                viewMode === 'day'
                  ? 'bg-[#091E3A] text-amber-400 border border-[#091E3A]'
                  : 'bg-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Diario</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors rounded-sm ${
                viewMode === 'list'
                  ? 'bg-[#091E3A] text-amber-400 border border-[#091E3A]'
                  : 'bg-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Agenda ({filteredDefenses.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Date Navigation Bar for Month and Day Views */}
      {viewMode !== 'list' && (
        <section className="bg-white border-2 border-slate-900 p-4 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              className="h-9 w-9 p-0 rounded-sm border-2 border-slate-900 hover:bg-[#091E3A] hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-9 px-3 rounded-sm border-2 border-slate-900 font-mono text-xs font-bold uppercase hover:bg-[#091E3A] hover:text-white"
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="h-9 w-9 p-0 rounded-sm border-2 border-slate-900 hover:bg-[#091E3A] hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Current Period Display in Poppins font */}
          <div className="text-center sm:text-left">
            <div className="font-bold text-2xl sm:text-3xl text-[#091E3A] uppercase tracking-tight leading-none">
              {viewMode === 'month'
                ? format(currentDate, 'MMMM yyyy', { locale: es })
                : format(selectedDay, 'EEEE, d MMMM yyyy', { locale: es })}
            </div>
            <div className="text-[11px] font-mono text-slate-500 uppercase mt-0.5">
              {viewMode === 'month'
                ? `Vista mensual institucional · ${filteredDefenses.length} sustentaciones programadas`
                : `Programación diaria · ${defensesForSelectedDay.length} sustentaciones para esta jornada`}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 px-2 py-0.5 border border-emerald-600 bg-emerald-50 text-emerald-950 font-bold rounded-sm">
              <span className="h-2 w-2 bg-emerald-600 rounded-sm" /> CONFIRMADA
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 border border-blue-600 bg-blue-50 text-blue-950 font-bold rounded-sm">
              <span className="h-2 w-2 bg-blue-600 rounded-sm" /> REPROGRAMADA
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 border border-purple-600 bg-purple-50 text-purple-950 font-bold rounded-sm">
              <span className="h-2 w-2 bg-purple-600 rounded-sm" /> COMPLETADA
            </span>
          </div>
        </section>
      )}

      {/* Main Content Area: 100% Bespoke Month Grid, Daily Schedule, or Agenda List */}
      {isLoadingDefenses ? (
        <div className="p-16 text-center bg-white border-2 border-slate-900 rounded-sm">
          <div className="font-bold text-xl text-slate-800 uppercase tracking-tight">
            CARGANDO PROGRAMACIÓN INSTITUCIONAL...
          </div>
          <p className="text-xs font-mono text-slate-500 mt-2 uppercase">
            Sincronizando con base de datos de la Escuela de Postgrado UNAP
          </p>
        </div>
      ) : viewMode === 'month' ? (
        /* ========================================================================= */
        /* 1. BESPOKE CUSTOM MONTH VIEW (Zero external library, full editorial grid) */
        /* ========================================================================= */
        <div className="bg-white border-2 border-slate-900 rounded-sm overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 bg-[#091E3A] border-b-2 border-slate-900 text-white text-center font-mono text-xs font-bold uppercase tracking-wider py-2.5">
            <div>Lunes</div>
            <div>Martes</div>
            <div>Miércoles</div>
            <div>Jueves</div>
            <div>Viernes</div>
            <div className="text-amber-400">Sábado</div>
            <div className="text-amber-400">Domingo</div>
          </div>

          {/* Month Days 7x5 or 7x6 Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 border-b border-slate-200">
            {monthDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayDefenses = defensesByDate.get(dateKey) || [];
              const isCurrMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isSelected = isSameDay(day, selectedDay);

              return (
                <div
                  key={dateKey}
                  onClick={() => {
                    setSelectedDay(day);
                  }}
                  className={`min-h-[120px] sm:min-h-[140px] p-1.5 sm:p-2.5 transition-colors flex flex-col justify-between cursor-pointer ${
                    !isCurrMonth ? 'bg-slate-50/70 text-slate-400' : 'bg-white text-slate-900'
                  } ${isCurrentDay ? 'bg-amber-50/40 ring-2 ring-inset ring-amber-400' : ''} ${
                    isSelected ? 'ring-2 ring-inset ring-[#091E3A]' : ''
                  } hover:bg-slate-100/70`}
                >
                  {/* Day cell top bar */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-bold text-lg sm:text-xl leading-none ${
                        isCurrentDay ? 'text-[#091E3A]' : isCurrMonth ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    {isCurrentDay && (
                      <span className="font-mono text-[9px] font-bold bg-[#C59B27] text-slate-950 px-1 py-0.2 rounded-sm uppercase">
                        Hoy
                      </span>
                    )}

                    {dayDefenses.length > 0 && !isCurrentDay && (
                      <span className="font-mono text-[9px] font-bold bg-[#091E3A] text-amber-400 px-1 py-0.2 rounded-sm">
                        {dayDefenses.length}
                      </span>
                    )}
                  </div>

                  {/* Defense pills inside the day cell */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {dayDefenses.slice(0, 3).map((defense) => {
                      let statusBorder = 'border-slate-900 bg-slate-900 text-white';
                      if (defense.status === 'CONFIRMED') {
                        statusBorder = 'border-emerald-700 bg-emerald-900 text-emerald-100';
                      } else if (defense.status === 'RESCHEDULED') {
                        statusBorder = 'border-blue-700 bg-blue-900 text-blue-100';
                      } else if (defense.status === 'COMPLETED') {
                        statusBorder = 'border-purple-700 bg-purple-900 text-purple-100';
                      }

                      return (
                        <div
                          key={defense.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDefense(defense);
                          }}
                          title={`${defense.code}: ${defense.title}`}
                          className={`px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium truncate rounded-sm border cursor-pointer hover:opacity-90 flex items-center gap-1 ${statusBorder}`}
                        >
                          <span className="font-mono text-[9px] font-bold opacity-80 shrink-0">
                            {formatTime(defense.start_time).replace(/:\d\d /, ' ')}
                          </span>
                          <span className="truncate">{defense.code}</span>
                        </div>
                      );
                    })}

                    {dayDefenses.length > 3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(day);
                          setViewMode('day');
                        }}
                        className="text-[10px] font-mono font-bold text-[#091E3A] hover:underline block text-left"
                      >
                        +{dayDefenses.length - 3} más (Ver diario)
                      </button>
                    )}
                  </div>

                  {/* Bottom Day Action Shortcut */}
                  <div className="pt-1 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDay(day);
                        setViewMode('day');
                      }}
                      className="text-[9px] font-mono text-slate-400 hover:text-slate-900 uppercase tracking-wider"
                    >
                      Ver día →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'day' ? (
        /* ========================================================================= */
        /* 2. BESPOKE CUSTOM DAILY VIEW ("DIARIO" timeline with hour-by-hour layout) */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Mini week calendar strip for fast day selection */}
          <div className="bg-white border-2 border-slate-900 p-3 rounded-sm flex items-center justify-between gap-2 overflow-x-auto">
            <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest px-2 shrink-0 hidden md:block">
              SEMANA ACTUAL:
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-around">
              {currentWeekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const count = (defensesByDate.get(dateKey) || []).length;
                const isSelected = isSameDay(day, selectedDay);
                const isCurrentDay = isToday(day);

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-1 py-2 px-2 text-center rounded-sm border-2 transition-all min-w-[50px] ${
                      isSelected
                        ? 'border-[#091E3A] bg-[#091E3A] text-white'
                        : isCurrentDay
                        ? 'border-amber-400 bg-amber-50 text-slate-900'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div
                      className={`text-[10px] font-mono font-bold uppercase ${
                        isSelected ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      {format(day, 'EEE', { locale: es })}
                    </div>
                    <div className="font-bold text-lg leading-none mt-1">
                      {format(day, 'd')}
                    </div>
                    {count > 0 && (
                      <div className="mt-1 flex justify-center">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected ? 'bg-amber-400' : 'bg-emerald-600'
                          }`}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily Schedule Board */}
          <div className="bg-white border-2 border-slate-900 rounded-sm overflow-hidden">
            {/* Day Header Banner */}
            <div className="bg-[#091E3A] text-white p-5 border-b-2 border-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono text-amber-400 uppercase tracking-widest">
                  CRONOGRAMA DE LA JORNADA
                </div>
                <h2 className="font-bold text-2xl sm:text-3xl uppercase text-white mt-0.5 leading-tight">
                  {format(selectedDay, 'EEEE, d MMMM yyyy', { locale: es })}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-1 bg-[#061528] border border-slate-700 text-slate-200 rounded-sm">
                  {defensesForSelectedDay.length} Sustentaciones
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="rounded-sm border-2 border-slate-700 bg-white text-slate-900 hover:bg-slate-100 text-xs font-mono uppercase"
                >
                  Volver al Mes
                </Button>
              </div>
            </div>

            {/* Daily Schedule List */}
            {defensesForSelectedDay.length === 0 ? (
              <div className="p-16 text-center">
                <CalendarCheck className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <div className="font-bold text-xl text-slate-800 uppercase">
                  NO HAY SUSTENTACIONES PROGRAMADAS PARA ESTE DÍA
                </div>
                <p className="text-xs font-mono text-slate-500 mt-2 uppercase">
                  Puede consultar los demás días de la semana con la barra superior o volver al calendario mensual.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToday}
                    className="rounded-sm border-2 border-slate-900 font-mono text-xs uppercase"
                  >
                    Ir al día de Hoy
                  </Button>
                  <Button
                    variant="unap"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-sm font-mono text-xs uppercase"
                  >
                    Ver todas en Agenda
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {defensesForSelectedDay.map((defense) => {
                  const students = (defense.participants || []).filter((p) => p.participant_type === 'STUDENT');
                  const jurors = (defense.participants || []).filter((p) => p.participant_type === 'JUROR');
                  const advisors = (defense.participants || []).filter((p) => p.participant_type === 'ADVISOR');

                  return (
                    <div
                      key={defense.id}
                      onClick={() => setSelectedDefense(defense)}
                      className="p-5 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                    >
                      {/* Left Time Box */}
                      <div className="flex items-center gap-4 lg:w-64 shrink-0 border-b lg:border-b-0 pb-3 lg:pb-0">
                        <div className="bg-[#091E3A] text-white p-3 text-center min-w-[80px] rounded-sm border-2 border-[#091E3A]">
                          <Clock className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                          <div className="font-bold text-lg leading-none text-white">
                            {formatTime(defense.start_time).replace(/:\d\d /, ' ')}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {defense.estimated_duration_minutes || 120} min
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-mono font-bold text-slate-900">
                            {formatTime(defense.start_time)} a {formatTime(defense.estimated_end_time)}
                          </div>
                          <div className="text-xs font-mono text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {defense.space?.name || defense.modality}
                            </span>
                          </div>
                          <span className="inline-block border border-slate-300 bg-slate-100 text-slate-800 text-[10px] font-mono uppercase font-bold px-1.5 py-0.2 rounded-sm">
                            {defense.modality}
                          </span>
                        </div>
                      </div>

                      {/* Middle Thesis Details */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white bg-[#091E3A] px-2 py-0.5 rounded-sm">
                            {defense.code}
                          </span>
                          <StatusBadge status={defense.status} />
                          <span className="text-xs font-mono font-bold text-slate-600 uppercase">
                            {defense.unit?.acronym ? `[${defense.unit.acronym}]` : ''} {defense.unit?.name}
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-slate-950 leading-snug">
                          {defense.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 font-sans">
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="h-4 w-4 text-slate-700 shrink-0" />
                            <span>
                              <strong className="text-slate-900 font-semibold">Sustentante:</strong>{' '}
                              {students.length > 0
                                ? students.map((s) => `${s.person.first_name} ${s.person.last_name}`).join(', ')
                                : 'No especificado'}
                            </span>
                          </div>

                          {advisors.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">•</span>
                              <span>
                                <strong className="text-slate-900 font-semibold">Asesor:</strong>{' '}
                                {advisors.map((a) => `${a.person.first_name} ${a.person.last_name}`).join(', ')}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">•</span>
                            <span>
                              <strong className="text-slate-900 font-semibold">Jurado:</strong>{' '}
                              {jurors.length} miembros
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-sm border-2 border-slate-900 hover:bg-[#091E3A] hover:text-white text-xs font-bold uppercase tracking-wider h-9"
                        >
                          Ver Ficha
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 3. BESPOKE CHRONOLOGICAL AGENDA LIST VIEW (Editorial Brutalist Cards)      */
        /* ========================================================================= */
        <div className="space-y-3">
          {filteredDefenses.length === 0 ? (
            <div className="p-16 text-center bg-white border-2 border-slate-900 rounded-sm">
              <div className="font-bold text-xl text-slate-800 uppercase">
                NO HAY SUSTENTACIONES REGISTRADAS CON ESTOS FILTROS
              </div>
              <p className="text-xs font-mono text-slate-500 mt-2 uppercase">
                Pruebe seleccionando otra unidad académica o quitando los términos de búsqueda.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="mt-4 rounded-sm border-2 border-slate-900 font-mono text-xs uppercase"
              >
                Restablecer Filtros
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredDefenses.map((defense) => {
                const students = (defense.participants || []).filter((p) => p.participant_type === 'STUDENT');
                const jurors = (defense.participants || []).filter((p) => p.participant_type === 'JUROR');
                const advisors = (defense.participants || []).filter((p) => p.participant_type === 'ADVISOR');
                const { dayStr, monthStr, weekdayStr, year } = parseDateParts(defense.scheduled_date);

                return (
                  <article
                    key={defense.id}
                    onClick={() => setSelectedDefense(defense)}
                    className="bg-white border-2 border-slate-200 hover:border-[#091E3A] transition-colors cursor-pointer p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-sm"
                  >
                    {/* Left Date Block */}
                    <div className="flex items-center gap-4 sm:gap-6 border-b lg:border-b-0 lg:border-r border-slate-200 pb-3 lg:pb-0 lg:pr-6 shrink-0">
                      <div className="bg-[#091E3A] text-white p-2.5 sm:p-3 text-center min-w-[76px] sm:min-w-[84px] border-2 border-[#091E3A] rounded-sm">
                        <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest leading-none">
                          {weekdayStr}
                        </div>
                        <div className="font-bold text-2xl sm:text-3xl text-white leading-none my-1">
                          {dayStr}
                        </div>
                        <div className="text-[11px] font-mono text-slate-300 font-bold leading-none">
                          {monthStr} {year}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900">
                          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>
                            {formatTime(defense.start_time)} – {formatTime(defense.estimated_end_time)}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 uppercase flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {defense.space?.name || defense.facility?.name || defense.modality}
                          </span>
                        </div>
                        <div className="pt-0.5">
                          <span className="inline-block border border-slate-300 bg-slate-100 text-slate-700 text-[10px] font-mono uppercase font-bold px-1.5 py-0.2 rounded-sm">
                            MODALIDAD: {defense.modality}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Core Thesis Info */}
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white bg-[#091E3A] px-2 py-0.5 border border-[#091E3A] rounded-sm">
                          {defense.code}
                        </span>
                        <StatusBadge status={defense.status} />
                        <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wide">
                          {defense.unit?.acronym ? `[${defense.unit.acronym}]` : ''} {defense.unit?.name}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-950 leading-snug tracking-tight">
                        {defense.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 font-sans">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4 text-slate-700 shrink-0" />
                          <span>
                            <strong className="text-slate-900 font-semibold">Sustentante:</strong>{' '}
                            {students.length > 0
                              ? students.map((s) => `${s.person.first_name} ${s.person.last_name}`).join(', ')
                              : 'No especificado'}
                          </span>
                        </div>

                        {advisors.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">•</span>
                            <span>
                              <strong className="text-slate-900 font-semibold">Asesor:</strong>{' '}
                              {advisors.map((a) => `${a.person.first_name} ${a.person.last_name}`).join(', ')}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">•</span>
                          <span>
                            <strong className="text-slate-900 font-semibold">Jurado:</strong>{' '}
                            {jurors.length} miembros
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Button */}
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0 pt-2 lg:pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-sm border-2 border-slate-900 hover:bg-slate-900 hover:text-white text-xs font-bold uppercase tracking-wider h-9"
                      >
                        Ver Ficha Completa
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Public Defense Detail Modal - Subtle rounded-sm architectural layout */}
      {selectedDefense && (
        <Dialog open={!!selectedDefense} onOpenChange={() => setSelectedDefense(null)}>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 rounded-sm border-2 border-slate-900 bg-white">
            {/* Modal Header */}
            <div className="bg-[#091E3A] text-white p-5 border-b-2 border-amber-400 rounded-t-sm">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold bg-amber-400 text-slate-950 px-2 py-0.5 uppercase rounded-sm">
                  {selectedDefense.code}
                </span>
                <StatusBadge status={selectedDefense.status} />
                <span className="font-mono text-xs text-slate-300 uppercase">
                  {selectedDefense.unit?.acronym || selectedDefense.unit?.name}
                </span>
              </div>
              <h2 className="font-bold text-xl sm:text-2xl text-white uppercase leading-tight tracking-tight">
                {selectedDefense.title}
              </h2>
              <div className="text-xs font-mono text-slate-400 mt-2 uppercase">
                {selectedDefense.unit?.name} · Escuela de Postgrado UNAP
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Programación & Sede Grid */}
              <div>
                <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">
                  DATOS DE CONVOCATORIA Y LOGÍSTICA
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-sm">
                  <div>
                    <div className="text-[11px] font-mono text-slate-500 uppercase">Fecha</div>
                    <div className="font-bold text-slate-950 text-sm mt-0.5">
                      {formatDate(selectedDefense.scheduled_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-500 uppercase">Horario</div>
                    <div className="font-bold text-slate-950 text-sm mt-0.5">
                      {formatTime(selectedDefense.start_time)} – {formatTime(selectedDefense.estimated_end_time)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-500 uppercase">Modalidad</div>
                    <div className="font-bold text-slate-950 text-sm mt-0.5 uppercase">
                      {selectedDefense.modality}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-500 uppercase">Lugar / Aula</div>
                    <div className="font-bold text-slate-950 text-sm mt-0.5">
                      {selectedDefense.space?.name || 'Por asignar'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Virtual Access Box if virtual or hybrid */}
              {selectedDefense.virtual_url && (
                <div className="border-2 border-blue-900 bg-blue-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-900 text-white flex items-center justify-center shrink-0 rounded-sm">
                      <Video className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold uppercase text-blue-950">
                        AUDIENCIA VIRTUAL DISPONIBLE
                      </div>
                      <div className="text-xs text-blue-800">
                        Plataforma: <strong>{selectedDefense.virtual_platform || 'Enlace Oficial de Transmisión'}</strong>
                      </div>
                    </div>
                  </div>
                  <a
                    href={selectedDefense.virtual_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider border border-blue-900 transition-colors rounded-sm"
                  >
                    <span>Ingresar a la Sala</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {/* Sustentantes */}
              <div>
                <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">
                  SUSTENTANTE(S) / CANDIDATO(S) AL GRADO
                </div>
                <div className="border border-slate-200 divide-y divide-slate-200 rounded-sm overflow-hidden">
                  {(selectedDefense.participants || [])
                    .filter((p) => p.participant_type === 'STUDENT')
                    .map((s) => (
                      <div key={s.id} className="p-3 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <GraduationCap className="h-4 w-4 text-[#091E3A]" />
                          <div>
                            <span className="font-bold text-slate-900 text-sm">
                              {s.person.first_name} {s.person.last_name}
                            </span>
                            {s.person.email && (
                              <div className="text-xs font-mono text-slate-500">{s.person.email}</div>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 border border-slate-300 bg-slate-100 text-slate-800 rounded-sm">
                          Tesista
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Jurado Calificador */}
              <div>
                <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">
                  JURADO CALIFICADOR DESIGNADO
                </div>
                <div className="border border-slate-200 divide-y divide-slate-200 rounded-sm overflow-hidden">
                  {(selectedDefense.participants || [])
                    .filter((p) => p.participant_type === 'JUROR')
                    .map((j) => (
                      <div key={j.id} className="p-3 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Users className="h-4 w-4 text-slate-600" />
                          <div>
                            <span className="font-bold text-slate-900 text-sm">
                              {j.person.first_name} {j.person.last_name}
                            </span>
                            {j.person.email && (
                              <div className="text-xs font-mono text-slate-500">
                                {j.person.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 border border-slate-900 bg-slate-900 text-amber-300 rounded-sm">
                          {j.role || 'Miembro de Jurado'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Asesores */}
              {(selectedDefense.participants || []).some((p) => p.participant_type === 'ADVISOR') && (
                <div>
                  <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">
                    ASESOR(A) DE TESIS
                  </div>
                  <div className="border border-slate-200 divide-y divide-slate-200 rounded-sm overflow-hidden">
                    {(selectedDefense.participants || [])
                      .filter((p) => p.participant_type === 'ADVISOR')
                      .map((a) => (
                        <div key={a.id} className="p-3 bg-white flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">
                            {a.person.first_name} {a.person.last_name}
                          </span>
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 border border-slate-300 bg-slate-100 text-slate-800 rounded-sm">
                            Asesor Principal
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end rounded-b-sm">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDefense(null)}
                className="rounded-sm border-2 border-slate-900 text-xs font-mono uppercase font-bold"
              >
                Cerrar Detalle
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
