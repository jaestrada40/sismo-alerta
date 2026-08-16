import { CommunityReport } from '../types';

export async function fetchReports(): Promise<CommunityReport[]> {
  const res = await fetch('/api/reports');
  if (!res.ok) {
    throw new Error('No se pudieron obtener los reportes comunitarios');
  }
  const data = await res.json();
  return data.reports.map((r: any) => ({ ...r, id: String(r.id) }));
}

export async function submitReport(report: Omit<CommunityReport, 'id'>): Promise<CommunityReport> {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  if (!res.ok) {
    throw new Error('No se pudo enviar el reporte. Intenta de nuevo.');
  }
  const data = await res.json();
  return { ...data.report, id: String(data.report.id) };
}
