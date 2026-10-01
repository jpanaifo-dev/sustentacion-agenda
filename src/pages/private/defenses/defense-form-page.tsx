import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { defensesService, CreateDefensePayload } from '../../../services/defenses.service';
import { unitsService } from '../../../services/units.service';
import { facilitiesService } from '../../../services/facilities.service';
import { spacesService } from '../../../services/spaces.service';
import { personsService } from '../../../services/persons.service';
import { detectScheduleConflicts } from '../../../services/conflictChecker';
import { defenseDraftSchema, defenseConfirmSchema, DefenseDraftInput } from '../../../schemas';
import { PageHeader } from '../../../components/shared/page-header';
import { ConflictCheckerAlert } from '../../../components/shared/conflict-checker-alert';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { calculateEndTime } from '../../../lib/utils';
import {
  Save,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Building2,
  MapPin,
  Users,
  Video,
} from 'lucide-react';
import { JurorRole, ParticipantType } from '../../../types';

export const DefenseFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => unitsService.getUnits() });
  const { data: facilities = [] } = useQuery({ queryKey: ['facilities'], queryFn: () => facilitiesService.getFacilities() });
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => spacesService.getSpaces() });
  const { data: persons = [] } = useQuery({ queryKey: ['persons'], queryFn: () => personsService.getPersons() });
  const { data: allDefenses = [] } = useQuery({ queryKey: ['defenses'], queryFn: () => defensesService.getDefenses() });

  const { data: existingDefense, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['defense', id],
    queryFn: () => (id ? defensesService.getDefenseById(id) : null),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(defenseDraftSchema as any),
    defaultValues: {
      unit_id: '',
      title: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      start_time: '10:00:00',
      estimated_duration_minutes: 120,
      modality: 'PRESENTIAL',
      facility_id: null,
      space_id: null,
      virtual_platform: '',
      virtual_url: '',
      observations: '',
      internal_notes: '',
      participants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'participants',
  });

  // Watch fields for live end-time calculation and conflict detection
  const watchedStartTime = watch('start_time');
  const watchedDuration = watch('estimated_duration_minutes') || 120;
  const watchedDate = watch('scheduled_date');
  const watchedSpaceId = watch('space_id');
  const watchedFacilityId = watch('facility_id');
  const watchedModality = watch('modality');
  const watchedParticipants = watch('participants') || [];

  // Filtered spaces by selected facility
  const availableSpaces = watchedFacilityId
    ? spaces.filter((s) => s.facility_id === watchedFacilityId && s.is_active)
    : spaces.filter((s) => s.is_active);

  // Set initial values when editing
  useEffect(() => {
    if (existingDefense) {
      reset({
        unit_id: existingDefense.unit_id,
        title: existingDefense.title,
        scheduled_date: existingDefense.scheduled_date,
        start_time: existingDefense.start_time.substring(0, 5),
        estimated_duration_minutes: existingDefense.estimated_duration_minutes,
        modality: existingDefense.modality,
        facility_id: existingDefense.facility_id,
        space_id: existingDefense.space_id,
        virtual_platform: existingDefense.virtual_platform || '',
        virtual_url: existingDefense.virtual_url || '',
        observations: existingDefense.observations || '',
        internal_notes: existingDefense.internal_notes || '',
        participants: (existingDefense.participants || []).map((p) => ({
          person_id: p.person_id,
          participant_type: p.participant_type,
          role: p.role,
          is_primary: p.is_primary,
        })),
      });
    } else if (units.length > 0 && facilities.length > 0) {
      setValue('unit_id', units[0].id);
      setValue('facility_id', facilities[0].id);
      const firstSpace = spaces.find((s) => s.facility_id === facilities[0].id);
      if (firstSpace) setValue('space_id', firstSpace.id);
    }
  }, [existingDefense, units, facilities, spaces, reset, setValue]);

  // Calculated End Time
  const calculatedEndTime = watchedStartTime
    ? calculateEndTime(watchedStartTime, Number(watchedDuration))
    : '12:00:00';

  // Live Conflict Detection
  const participantPersonIds = watchedParticipants
    .filter((p: any) => p.person_id)
    .map((p: any) => {
      const personObj = persons.find((item) => item.id === p.person_id);
      return {
        person_id: p.person_id,
        type: p.participant_type as 'STUDENT' | 'JUROR' | 'ADVISOR',
        name: personObj ? `${personObj.first_name} ${personObj.last_name}` : undefined,
      };
    });

  const conflicts = detectScheduleConflicts({
    defenseId: id,
    scheduled_date: watchedDate,
    start_time: watchedStartTime,
    estimated_end_time: calculatedEndTime,
    space_id: watchedSpaceId,
    participantPersonIds,
    allDefenses,
  });

  // Save Mutations
  const saveMutation = useMutation({
    mutationFn: async ({ data, asConfirmed }: { data: any; asConfirmed: boolean }) => {
      if (asConfirmed) {
        // Strict validation check before confirming
        const validation = defenseConfirmSchema.safeParse(data);
        if (!validation.success) {
          const firstErr = validation.error.issues[0]?.message || 'Información incompleta para confirmar';
          throw new Error(firstErr);
        }
      }

      const payload: CreateDefensePayload = {
        unit_id: data.unit_id,
        title: data.title || 'Sustentación en borrador',
        scheduled_date: data.scheduled_date,
        start_time: data.start_time.includes(':') && data.start_time.split(':').length === 2 ? `${data.start_time}:00` : data.start_time,
        estimated_duration_minutes: Number(data.estimated_duration_minutes),
        modality: data.modality,
        facility_id: data.facility_id || null,
        space_id: data.space_id || null,
        virtual_platform: data.virtual_platform || null,
        virtual_url: data.virtual_url || null,
        observations: data.observations || null,
        internal_notes: data.internal_notes || null,
        participants: data.participants as any,
        asConfirmed,
      };

      if (isEditing && id) {
        return defensesService.updateDefense(id, payload);
      }
      return defensesService.createDefense(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['defenses'] });
      navigate(`/admin/defenses/${result.id}`);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Error al guardar la sustentación');
    },
  });

  const handleSave = (asConfirmed: boolean) => {
    setFormError(null);
    handleSubmit((data) => {
      saveMutation.mutate({ data, asConfirmed });
    })();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-slate-600"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={saveMutation.isPending}
            onClick={() => handleSave(false)}
          >
            <Save className="h-3.5 w-3.5" />
            <span>Guardar Borrador</span>
          </Button>

          <Button
            type="button"
            variant="unap"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={saveMutation.isPending}
            onClick={() => handleSave(true)}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Confirmar Sustentación</span>
          </Button>
        </div>
      </div>

      <PageHeader
        title={isEditing ? `Editar Sustentación: ${existingDefense?.code || ''}` : 'Nueva Sustentación de Tesis'}
        description="Complete la información académica, participantes y asignación de espacio físico o virtual."
      />

      {/* Conflict Warnings Banner */}
      <ConflictCheckerAlert conflicts={conflicts} />

      {/* Error banner */}
      {formError && (
        <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
          {formError}
        </div>
      )}

      <form className="space-y-6">
        {/* Section 1: Información Académica */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-unap-navy" />
              <span>1. Información General y Académica</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Unidad de posgrado y título oficial de la tesis o trabajo académico
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="unit_id" className="text-xs font-semibold">Unidad Académica de Posgrado *</Label>
                <select
                  id="unit_id"
                  {...register('unit_id')}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
                >
                  <option value="">Seleccione una unidad...</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.acronym ? `[${u.acronym}] ${u.name}` : u.name}
                    </option>
                  ))}
                </select>
                {errors.unit_id?.message && <p className="text-[11px] text-rose-600">{String(errors.unit_id.message)}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modality" className="text-xs font-semibold">Modalidad *</Label>
                <select
                  id="modality"
                  {...register('modality')}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
                >
                  <option value="PRESENTIAL">Presencial</option>
                  <option value="VIRTUAL">Virtual</option>
                  <option value="HYBRID">Híbrida (Presencial + Virtual)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold">Título de la Tesis o Trabajo Académico *</Label>
              <Textarea
                id="title"
                rows={2}
                placeholder="Ingrese el título completo aprobado en el plan de tesis..."
                {...register('title')}
              />
              {errors.title?.message && <p className="text-[11px] text-rose-600">{String(errors.title.message)}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Programación Horaria */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-unap-navy" />
              <span>2. Programación de Horario</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Fecha, hora de inicio y cálculo automático de término estimado
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="scheduled_date" className="text-xs font-semibold">Fecha de Sustentación *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  {...register('scheduled_date')}
                />
                {errors.scheduled_date?.message && <p className="text-[11px] text-rose-600">{String(errors.scheduled_date.message)}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="start_time" className="text-xs font-semibold">Hora de Inicio *</Label>
                <Input
                  id="start_time"
                  type="time"
                  {...register('start_time')}
                />
                {errors.start_time?.message && <p className="text-[11px] text-rose-600">{String(errors.start_time.message)}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estimated_duration_minutes" className="text-xs font-semibold">Duración Estimada</Label>
                <select
                  id="estimated_duration_minutes"
                  {...register('estimated_duration_minutes')}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
                >
                  <option value="60">60 minutos (1 hora)</option>
                  <option value="90">90 minutos (1.5 horas)</option>
                  <option value="120">120 minutos (2 horas predeterminada)</option>
                  <option value="150">150 minutos (2.5 horas)</option>
                  <option value="180">180 minutos (3 horas)</option>
                </select>
              </div>
            </div>

            {/* Calculated End Time Indicator */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-unap-navy" />
                <span>Horario calculado de sustentación:</span>
              </span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {watchedStartTime || '10:00'} — {calculatedEndTime.substring(0, 5)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Ubicación y Espacio Físico / Virtual */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-unap-navy" />
              <span>3. Asignación de Espacio Físico / Plataforma</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Instalación, espacio seleccionado y enlaces para modalidad virtual
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {(watchedModality === 'PRESENTIAL' || watchedModality === 'HYBRID') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="facility_id" className="text-xs font-semibold">Instalación / Sede *</Label>
                  <select
                    id="facility_id"
                    {...register('facility_id')}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
                  >
                    <option value="">Seleccione una instalación...</option>
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="space_id" className="text-xs font-semibold">Espacio Físico (Aula / Auditorio / Sala) *</Label>
                  <select
                    id="space_id"
                    {...register('space_id')}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
                  >
                    <option value="">Seleccione un espacio...</option>
                    {availableSpaces.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.type} - Aforo: {s.capacity || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {(watchedModality === 'VIRTUAL' || watchedModality === 'HYBRID') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <Label htmlFor="virtual_platform" className="text-xs font-semibold">Plataforma Virtual</Label>
                  <Input
                    id="virtual_platform"
                    placeholder="Ej: Google Meet, Zoom Institucional..."
                    {...register('virtual_platform')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="virtual_url" className="text-xs font-semibold">Enlace de Videoconferencia (URL)</Label>
                  <Input
                    id="virtual_url"
                    placeholder="https://meet.google.com/..."
                    {...register('virtual_url')}
                  />
                  {errors.virtual_url?.message && <p className="text-[11px] text-rose-600">{String(errors.virtual_url.message)}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Participantes (Sustentantes, Jurados, Asesores) */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-unap-navy" />
                <span>4. Participantes de la Sustentación</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Asigne al menos 1 sustentante y los miembros del jurado calificador
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => append({ person_id: '', participant_type: 'JUROR', role: 'MEMBER', is_primary: false })}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Agregar Participante</span>
            </Button>
          </CardHeader>

          <CardContent className="pt-5 space-y-3">
            {fields.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No hay participantes asignados. Haga clic en "Agregar Participante" para añadir sustentantes, jurados y asesores.
              </div>
            ) : (
              fields.map((field, index) => {
                const participantType = watch(`participants.${index}.participant_type`);

                return (
                  <div
                    key={field.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                  >
                    <div className="sm:w-40">
                      <select
                        {...register(`participants.${index}.participant_type`)}
                        className="w-full h-8 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
                      >
                        <option value="STUDENT">Sustentante (Alumno)</option>
                        <option value="JUROR">Jurado Calificador</option>
                        <option value="ADVISOR">Asesor(a) de Tesis</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      <select
                        {...register(`participants.${index}.person_id`)}
                        className="w-full h-8 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                      >
                        <option value="">Seleccione una persona...</option>
                        {persons.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.first_name} {p.last_name} {p.document_number ? `(DNI: ${p.document_number})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {participantType === 'JUROR' && (
                      <div className="sm:w-36">
                        <select
                          {...register(`participants.${index}.role`)}
                          className="w-full h-8 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                        >
                          <option value="PRESIDENT">Presidente</option>
                          <option value="SECRETARY">Secretario</option>
                          <option value="MEMBER">Miembro</option>
                          <option value="OTHER">Otro</option>
                        </select>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0 self-end sm:self-center"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Section 5: Observaciones y Notas Internas */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              5. Observaciones y Notas Internas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="observations" className="text-xs font-semibold">Observaciones Públicas</Label>
              <Textarea
                id="observations"
                rows={2}
                placeholder="Requerimientos técnicos, equipos necesarios, o notas visibles en la citación..."
                {...register('observations')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="internal_notes" className="text-xs font-semibold text-slate-700">
                Notas Internas (Solo administradores / Privado)
              </Label>
              <Textarea
                id="internal_notes"
                rows={2}
                placeholder="Expediente de grado, resolución decanal, observaciones privadas..."
                {...register('internal_notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bottom Save Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={saveMutation.isPending}
            onClick={() => handleSave(false)}
          >
            <Save className="h-4 w-4" />
            <span>Guardar como Borrador (DRAFT)</span>
          </Button>

          <Button
            type="button"
            variant="unap"
            className="gap-2"
            disabled={saveMutation.isPending}
            onClick={() => handleSave(true)}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Validar y Confirmar Sustentación</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
