import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { defensesService } from '../../../services/defenses.service';
import { unitsService } from '../../../services/units.service';
import { spacesService } from '../../../services/spaces.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatusBadge } from '../../../components/shared/status-badge';
import { ConfirmModal } from '../../../components/shared/confirm-modal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatDate, formatTime } from '../../../lib/utils';
import { DefenseStatus, DefenseWithRelations } from '../../../types';
import {
  Plus,
  Search,
  Eye,
  CheckCircle2,
  CalendarClock,
  CheckCheck,
  XCircle,
  FileEdit,
  Filter,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';

export const DefensesListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');

  // Action modals state
  const [confirmModalState, setConfirmModalState] = useState<{ open: boolean; defense: DefenseWithRelations | null }>({
    open: false,
    defense: null,
  });
  const [cancelModalState, setCancelModalState] = useState<{ open: boolean; defense: DefenseWithRelations | null; reason: string }>({
    open: false,
    defense: null,
    reason: '',
  });
  const [completeModalState, setCompleteModalState] = useState<{ open: boolean; defense: DefenseWithRelations | null; observations: string }>({
    open: false,
    defense: null,
    observations: '',
  });
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: defenses = [], isLoading } = useQuery({
    queryKey: ['defenses'],
    queryFn: () => defensesService.getDefenses(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsService.getUnits(),
  });

  // Filter list
  const filtered = defenses.filter((d) => {
    if (selectedStatus !== 'ALL' && d.status !== selectedStatus) return false;
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

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: (id: string) => defensesService.confirmDefense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defenses'] });
      setConfirmModalState({ open: false, defense: null });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Error al confirmar la sustentación');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (params: { id: string; reason: string }) =>
      defensesService.cancelDefense({ defenseId: params.id, cancellation_reason: params.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defenses'] });
      setCancelModalState({ open: false, defense: null, reason: '' });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Error al cancelar la sustentación');
    },
  });

  const completeMutation = useMutation({
    mutationFn: (params: { id: string; observations: string }) =>
      defensesService.completeDefense({ defenseId: params.id, final_observations: params.observations }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defenses'] });
      setCompleteModalState({ open: false, defense: null, observations: '' });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Error al finalizar la sustentación');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Sustentaciones"
        description="Listado general de defensas de tesis, jurados y programación"
      >
        <Button asChild variant="default" className="gap-2">
          <NavLink to="/admin/defenses/new">
            <Plus className="h-4 w-4" />
            <span>Nueva Sustentación</span>
          </NavLink>
        </Button>
      </PageHeader>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Buscar por código, título o sustentante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm bg-slate-50 border-slate-200"
            />
          </div>

          <div className="sm:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-unap-navy"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="DRAFT">Borrador</option>
              <option value="CONFIRMED">Confirmada</option>
              <option value="RESCHEDULED">Reprogramada</option>
              <option value="COMPLETED">Completada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>

          <div className="sm:w-56">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-unap-navy"
            >
              <option value="ALL">Todas las Unidades</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.acronym || u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Cargando sustentaciones...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No se encontraron sustentaciones con los criterios de búsqueda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">Código</TableHead>
                <TableHead className="min-w-[280px]">Título de Tesis & Sustentante</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Fecha & Hora</TableHead>
                <TableHead>Espacio / Lugar</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((defense) => {
                const student = defense.participants?.find((p) => p.participant_type === 'STUDENT');

                return (
                  <TableRow key={defense.id}>
                    <TableCell className="font-mono font-bold text-xs text-unap-navy">
                      <NavLink to={`/admin/defenses/${defense.id}`} className="hover:underline">
                        {defense.code}
                      </NavLink>
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-slate-900 leading-snug line-clamp-2">
                        {defense.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {student ? (
                          <span>Sustentante: <strong>{student.person.first_name} {student.person.last_name}</strong></span>
                        ) : (
                          <span className="text-amber-600 italic">Sin sustentante asignado</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      {defense.unit?.acronym || defense.unit?.name || '-'}
                    </TableCell>

                    <TableCell className="text-xs whitespace-nowrap">
                      <div className="font-medium text-slate-900">{formatDate(defense.scheduled_date)}</div>
                      <div className="text-slate-500">{formatTime(defense.start_time)} - {formatTime(defense.estimated_end_time)}</div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      <div>{defense.space?.name || '-'}</div>
                      <div className="text-[11px] text-slate-400">{defense.facility?.name}</div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <span className="font-medium text-slate-700">{defense.modality}</span>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={defense.status} />
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900" title="Ver Detalle">
                          <NavLink to={`/admin/defenses/${defense.id}`}>
                            <Eye className="h-4 w-4" />
                          </NavLink>
                        </Button>

                        {/* Edit button */}
                        {defense.status !== 'COMPLETED' && defense.status !== 'CANCELLED' && (
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900" title="Editar Sustentación">
                            <NavLink to={`/admin/defenses/${defense.id}/edit`}>
                              <FileEdit className="h-4 w-4" />
                            </NavLink>
                          </Button>
                        )}

                        {/* Confirm action if DRAFT */}
                        {defense.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Confirmar Sustentación"
                            onClick={() => {
                              setActionError(null);
                              setConfirmModalState({ open: true, defense });
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Complete action if CONFIRMED/RESCHEDULED */}
                        {['CONFIRMED', 'RESCHEDULED'].includes(defense.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            title="Marcar como Completada"
                            onClick={() => {
                              setActionError(null);
                              setCompleteModalState({ open: true, defense, observations: '' });
                            }}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Cancel action */}
                        {defense.status !== 'COMPLETED' && defense.status !== 'CANCELLED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            title="Cancelar Sustentación"
                            onClick={() => {
                              setActionError(null);
                              setCancelModalState({ open: true, defense, reason: '' });
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Confirm Defense Modal */}
      {confirmModalState.defense && (
        <Dialog open={confirmModalState.open} onOpenChange={(open) => setConfirmModalState({ open, defense: open ? confirmModalState.defense : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Sustentación</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-slate-600 space-y-3">
              <p>
                ¿Está seguro de confirmar la sustentación <strong>{confirmModalState.defense.code}</strong>: "{confirmModalState.defense.title}"?
              </p>
              <div className="bg-slate-50 p-3 rounded-md text-xs space-y-1 text-slate-700 border border-slate-200">
                <div><strong>Fecha:</strong> {formatDate(confirmModalState.defense.scheduled_date)}</div>
                <div><strong>Hora:</strong> {formatTime(confirmModalState.defense.start_time)}</div>
                <div><strong>Espacio:</strong> {confirmModalState.defense.space?.name || confirmModalState.defense.modality}</div>
              </div>
              <p className="text-xs text-slate-500">
                Al confirmar, se enviará automáticamente una notificación por correo electrónico vía Resend a la coordinación y participantes.
              </p>
              {actionError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {actionError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmModalState({ open: false, defense: null })}>
                Cancelar
              </Button>
              <Button
                variant="unap"
                onClick={() => confirmMutation.mutate(confirmModalState.defense!.id)}
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar y Notificar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Defense Modal */}
      {cancelModalState.defense && (
        <Dialog open={cancelModalState.open} onOpenChange={(open) => setCancelModalState({ open, defense: open ? cancelModalState.defense : null, reason: '' })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-rose-700">Cancelar Sustentación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <p className="text-slate-600">
                Esta acción marcará la sustentación <strong>{cancelModalState.defense.code}</strong> como cancelada. No se eliminará del registro histórico.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="cancel-reason" className="text-xs font-semibold">Motivo de cancelación *</Label>
                <Textarea
                  id="cancel-reason"
                  placeholder="Especifique la justificación institucional de la cancelación..."
                  value={cancelModalState.reason}
                  onChange={(e) => setCancelModalState({ ...cancelModalState, reason: e.target.value })}
                  rows={3}
                />
              </div>
              {actionError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {actionError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelModalState({ open: false, defense: null, reason: '' })}>
                Volver
              </Button>
              <Button
                variant="destructive"
                disabled={cancelModalState.reason.trim().length < 5 || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ id: cancelModalState.defense!.id, reason: cancelModalState.reason })}
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelación'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Complete Defense Modal */}
      {completeModalState.defense && (
        <Dialog open={completeModalState.open} onOpenChange={(open) => setCompleteModalState({ open, defense: open ? completeModalState.defense : null, observations: '' })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-purple-800">Finalizar Sustentación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <p className="text-slate-600">
                Marcar como completada la defensa de grado <strong>{completeModalState.defense.code}</strong>.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="complete-obs" className="text-xs font-semibold">Observaciones finales / Calificación</Label>
                <Textarea
                  id="complete-obs"
                  placeholder="Ej: Aprobado por unanimidad con mención sobresaliente. Acta N° 045-2026 firmada."
                  value={completeModalState.observations}
                  onChange={(e) => setCompleteModalState({ ...completeModalState, observations: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteModalState({ open: false, defense: null, observations: '' })}>
                Cancelar
              </Button>
              <Button
                className="bg-purple-700 hover:bg-purple-800 text-white"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate({ id: completeModalState.defense!.id, observations: completeModalState.observations })}
              >
                {completeMutation.isPending ? 'Finalizando...' : 'Completar Sustentación'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
