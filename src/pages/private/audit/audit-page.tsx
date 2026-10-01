import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditService } from '../../../services/audit.service';
import { PageHeader } from '../../../components/shared/page-header';
import { Input } from '../../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatDate } from '../../../lib/utils';
import { AuditLog } from '../../../types';
import { Search, ShieldAlert, FileText, Clock, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

export const AuditPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditService.getLogs(),
  });

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registro de Auditoría y Trazabilidad"
        description="Historial inmutable de operaciones, cambios de estado, reprogramaciones y notificaciones"
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Filtrar por acción (ej. DEFENSE_CONFIRMED)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs sm:text-sm bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando registros de auditoría...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>ID de Recurso</TableHead>
                <TableHead>IP / Agente</TableHead>
                <TableHead className="text-right">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedLog(log)}>
                  <TableCell className="text-xs whitespace-nowrap font-mono text-slate-600">
                    {new Date(log.created_at).toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-bold text-unap-navy bg-slate-100 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-semibold uppercase text-slate-700">
                    {log.entity_type}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-500 truncate max-w-[140px]">
                    {log.entity_id || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {log.ip_address || '127.0.0.1'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-unap-navy font-semibold hover:underline">
                    Ver JSON
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Log detail dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm font-bold text-unap-navy">
                Auditoría: {selectedLog.action}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-100">
                <div><strong>Fecha:</strong> {new Date(selectedLog.created_at).toLocaleString('es-PE')}</div>
                <div><strong>Entidad:</strong> {selectedLog.entity_type} ({selectedLog.entity_id})</div>
                <div><strong>Usuario:</strong> {selectedLog.user_id || 'Sistema'}</div>
                <div><strong>IP:</strong> {selectedLog.ip_address || '127.0.0.1'}</div>
              </div>

              {selectedLog.old_values && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Valores Anteriores:</span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Nuevos Valores:</span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Metadatos Adicionales:</span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
