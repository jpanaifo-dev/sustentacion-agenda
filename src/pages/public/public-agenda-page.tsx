import React, { useState } from 'react';
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
  Building2,
  Filter,
  List,
  CalendarDays,
  ExternalLink,
} from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

export const PublicAgendaPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
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
  const filteredDefenses = defenses.filter((d) => {
    if (selectedUnit !== 'ALL' && d.unit_id !== selectedUnit) return false;
    if (search) {
      const q = search.toLowerCase();
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

  // Prepare events for FullCalendar
  const calendarEvents = filteredDefenses.map((d) => {
    const student = d.participants?.find((p) => p.participant_type === 'STUDENT');
    const studentName = student ? ` - ${student.person.first_name} ${student.person.last_name}` : '';

    let color = '#0B2545';
    if (d.status === 'CONFIRMED') color = '#047857';
    if (d.status === 'RESCHEDULED') color = '#1D4ED8';
    if (d.status === 'COMPLETED') color = '#6D28D9';

    return {
      id: d.id,
      title: `${d.code}: ${d.title}${studentName}`,
      start: `${d.scheduled_date}T${d.start_time}`,
      end: `${d.scheduled_date}T${d.estimated_end_time}`,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      extendedProps: { defense: d },
    };
  });

  return (
    <div className="space-y-6">
      {/* Intro Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0B2545] via-[#091E3A] to-[#134E4A] p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-slate-950 mb-3">
            Programación Oficial EPG UNAP
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Agenda Institucional de Sustentaciones
          </h2>
          <p className="mt-2 text-sm text-slate-200 leading-relaxed">
            Consulte las sustentaciones de tesis y defensas de grado programadas para maestrías y doctorados de la Universidad Nacional de la Amazonía Peruana.
          </p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Buscar por tesis, código o sustentante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm bg-slate-50 border-slate-200"
            />
          </div>

          {/* Unit dropdown */}
          <div className="sm:w-64">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-unap-navy"
            >
              <option value="ALL">Todas las Unidades de Posgrado</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.acronym ? `[${u.acronym}] ${u.name}` : u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1.5 self-end sm:self-center border border-slate-200 rounded-lg p-1 bg-slate-50">
          <Button
            size="sm"
            variant={viewMode === 'calendar' ? 'unap' : 'ghost'}
            className="h-7 text-xs px-2.5 gap-1.5"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Calendario</span>
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'unap' : 'ghost'}
            className="h-7 text-xs px-2.5 gap-1.5"
            onClick={() => setViewMode('list')}
          >
            <List className="h-3.5 w-3.5" />
            <span>Listado</span>
          </Button>
        </div>
      </div>

      {/* Main View Area */}
      {isLoadingDefenses ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          Cargando agenda de sustentaciones...
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm overflow-hidden">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
            }}
            events={calendarEvents}
            eventClick={(info) => {
              const defense = info.event.extendedProps.defense;
              setSelectedDefense(defense);
            }}
            height="auto"
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              list: 'Lista',
            }}
          />
        </div>
      ) : (
        /* List Mode View */
        <div className="space-y-4">
          {filteredDefenses.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              No se encontraron sustentaciones programadas con los filtros seleccionados.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredDefenses.map((defense) => {
                const students = (defense.participants || []).filter((p) => p.participant_type === 'STUDENT');

                return (
                  <div
                    key={defense.id}
                    onClick={() => setSelectedDefense(defense)}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-unap-navy bg-slate-100 px-2 py-0.5 rounded">
                          {defense.code}
                        </span>
                        <StatusBadge status={defense.status} />
                        <span className="text-xs text-slate-500 font-medium">
                          {defense.unit?.acronym || defense.unit?.name}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-slate-900 leading-snug">
                        {defense.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDate(defense.scheduled_date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatTime(defense.start_time)} - {formatTime(defense.estimated_end_time)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{defense.space?.name || defense.modality}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            Sustentante(s): {students.map((s) => `${s.person.first_name} ${s.person.last_name}`).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <Button variant="outline" size="sm" className="text-xs">
                        Ver Detalle
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Public Defense Detail Modal */}
      {selectedDefense && (
        <Dialog open={!!selectedDefense} onOpenChange={() => setSelectedDefense(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-unap-navy bg-slate-100 px-2 py-0.5 rounded">
                  {selectedDefense.code}
                </span>
                <StatusBadge status={selectedDefense.status} />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 leading-snug">
                {selectedDefense.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {selectedDefense.unit?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-5 text-sm">
              {/* Programación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <div>
                  <div className="text-xs font-medium text-slate-500">Fecha Programada</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {formatDate(selectedDefense.scheduled_date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Horario de Sustentación</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {formatTime(selectedDefense.start_time)} a {formatTime(selectedDefense.estimated_end_time)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Modalidad</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedDefense.modality}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Lugar / Espacio</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedDefense.space?.name || 'Por definir'} ({selectedDefense.facility?.name || 'Sede Central'})
                  </div>
                </div>
              </div>

              {/* Virtual link if hybrid or virtual */}
              {selectedDefense.virtual_url && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-700" />
                    <span>Plataforma virtual: <strong>{selectedDefense.virtual_platform || 'Enlace oficial'}</strong></span>
                  </div>
                  <a
                    href={selectedDefense.virtual_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                  >
                    <span>Ingresar</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Sustentantes */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                  Sustentante(s)
                </h4>
                <div className="space-y-1.5">
                  {(selectedDefense.participants || [])
                    .filter((p) => p.participant_type === 'STUDENT')
                    .map((s) => (
                      <div key={s.id} className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-100">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-900">
                          {s.person.first_name} {s.person.last_name}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Jurados */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                  Jurado Calificador
                </h4>
                <div className="space-y-1.5">
                  {(selectedDefense.participants || [])
                    .filter((p) => p.participant_type === 'JUROR')
                    .map((j) => (
                      <div key={j.id} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                        <span className="font-medium text-slate-900">
                          {j.person.first_name} {j.person.last_name}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {j.role || 'Miembro'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Asesores */}
              {(selectedDefense.participants || []).some((p) => p.participant_type === 'ADVISOR') && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                    Asesor(a) de Tesis
                  </h4>
                  <div className="space-y-1.5">
                    {(selectedDefense.participants || [])
                      .filter((p) => p.participant_type === 'ADVISOR')
                      .map((a) => (
                        <div key={a.id} className="p-2 rounded bg-slate-50 border border-slate-100">
                          <span className="font-medium text-slate-900">
                            {a.person.first_name} {a.person.last_name}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
