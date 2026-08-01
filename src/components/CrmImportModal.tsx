'use client';

import { useRef, useState } from 'react';
import {
  X, UploadCloud, Loader2, CheckCircle2, AlertTriangle, XCircle, Copy, FileText, FileSpreadsheet,
} from 'lucide-react';
import type { RecordType } from '@/types/crm';

interface Issue { row: number; status: 'failed' | 'duplicate' | 'warning'; messages: string[] }
interface Report {
  type: RecordType;
  totalRows: number;
  dataRows: number;
  emptyRows: number;
  validCount: number;
  failed: number;
  duplicates: number;
  issues: Issue[];
  committed: boolean;
  imported: number;
}

/** Which entry point opened the modal — only tailors the copy and the file
 *  picker's default filter; every supported format is accepted either way. */
export type ImportFormat = 'csv' | 'excel';

interface Props {
  defaultType: RecordType;
  defaultFormat?: ImportFormat;
  onClose: () => void;
  onImported: (report: Report) => void;
  onError: (title: string, message?: string) => void;
}

type Phase = 'select' | 'previewing' | 'preview' | 'committing' | 'done';

const EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const MAX_BYTES = 10 * 1024 * 1024;

/** File bytes → base64, chunked so large workbooks don't blow the call stack. */
async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export default function CrmImportModal({ defaultType, defaultFormat = 'csv', onClose, onImported, onError }: Props) {
  const [type, setType] = useState<RecordType>(defaultType);
  const [phase, setPhase] = useState<Phase>('select');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState(''); // base64 of the uploaded bytes
  const [report, setReport] = useState<Report | null>(null);
  const [isOver, setIsOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const sampleHref = (format: string) => `/api/admin/crm/leads/sample?type=${type === 'Customer' ? 'customer' : 'lead'}&format=${format}`;
  const excel = defaultFormat === 'excel';

  const post = (body: Record<string, unknown>) => fetch('/api/admin/crm/leads/import', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const runPreview = async (data: string, name: string, forType: RecordType) => {
    setPhase('previewing');
    try {
      const res = await post({ recordType: forType, file: { name, data }, commit: false });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) { onError('Could not read the file', payload.error || 'Please check the file and try again.'); setPhase('select'); return; }
      setReport(payload.report as Report);
      setPhase('preview');
    } catch {
      onError('Network error', 'Could not reach the server. Please try again.');
      setPhase('select');
    }
  };

  const onFile = async (file: File | null | undefined) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!EXTENSIONS.some((ext) => name.endsWith(ext))) {
      onError('Unsupported file', 'Upload a .csv or a .xlsx workbook. In Google Sheets use File → Download → Microsoft Excel (.xlsx).');
      return;
    }
    if (file.size > MAX_BYTES) {
      onError('File too large', 'The importer accepts files up to 10 MB — split larger lists into batches.');
      return;
    }
    const data = await toBase64(file);
    setFileName(file.name);
    setFileData(data);
    await runPreview(data, file.name, type);
  };

  const changeType = (t: RecordType) => {
    setType(t);
    if (fileData) runPreview(fileData, fileName, t); // re-validate against the other record type
  };

  const commit = async () => {
    setPhase('committing');
    try {
      const res = await post({ recordType: type, file: { name: fileName, data: fileData }, commit: true });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError('Import failed', data.error || 'Please try again.'); setPhase('preview'); return; }
      setReport(data.report as Report);
      setPhase('done');
      onImported(data.report as Report);
    } catch {
      onError('Network error', 'Could not reach the server. Please try again.');
      setPhase('preview');
    }
  };

  const reset = () => { setFileData(''); setFileName(''); setReport(null); setPhase('select'); };

  const busy = phase === 'previewing' || phase === 'committing';

  return (
    <div className="animate-fade-in" onClick={busy ? undefined : onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 640, margin: 'auto', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8 }}><UploadCloud size={18} /> Bulk import {type === 'Customer' ? 'customers' : 'leads'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" disabled={busy} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: busy ? 'not-allowed' : 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Record-type toggle + sample download */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Import as</label>
              <div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {(['Lead', 'Customer'] as RecordType[]).map((t) => (
                  <button key={t} type="button" onClick={() => changeType(t)} disabled={busy} style={{ padding: '8px 18px', fontSize: 13.5, fontWeight: 600, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', background: type === t ? 'var(--accent)' : 'transparent', color: type === t ? '#fff' : 'var(--text-secondary)' }}>{t === 'Customer' ? 'Customers' : 'Leads'}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Sample template</label>
              <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Whichever entry point was used, both templates stay available. */}
                <a href={sampleHref('csv')} download className="btn btn-secondary btn-sm"><FileText size={15} /> CSV</a>
                <a href={sampleHref('xlsx')} download className="btn btn-secondary btn-sm"><FileSpreadsheet size={15} /> Excel</a>
              </div>
            </div>
          </div>

          {/* Dropzone (select phase) */}
          {(phase === 'select' || phase === 'previewing') && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => !busy && fileInput.current?.click()}
                onDragOver={(e) => { if (!busy) { e.preventDefault(); setIsOver(true); } }}
                onDragLeave={() => setIsOver(false)}
                onDrop={(e) => { if (busy) return; e.preventDefault(); setIsOver(false); onFile(e.dataTransfer.files?.[0]); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '34px 16px', width: '100%', border: `1.5px dashed ${isOver ? 'var(--accent)' : 'var(--border-strong)'}`, borderRadius: 'var(--radius-md)', background: isOver ? 'var(--accent-soft)' : 'var(--bg-surface-2)', cursor: busy ? 'progress' : 'pointer', color: 'var(--text-secondary)' }}
              >
                {phase === 'previewing' ? (
                  <><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} /><span style={{ fontSize: 13.5, fontWeight: 600 }}>Reading &amp; validating {fileName}…</span></>
                ) : (
                  <>
                    <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {excel ? <FileSpreadsheet size={22} /> : <FileText size={22} />}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {excel ? 'Drag & drop an Excel workbook here, or click to browse' : 'Drag & drop a CSV here, or click to browse'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {excel
                        ? '.xlsx from Excel, LibreOffice or Google Sheets (File → Download → Microsoft Excel) · .csv also accepted'
                        : 'Use the sample template’s columns · .xlsx workbooks are also accepted'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Duplicates &amp; invalid rows are reported before anything is imported</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Preview / done report */}
          {report && (phase === 'preview' || phase === 'committing' || phase === 'done') && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <FileText size={14} /> <strong style={{ color: 'var(--text-primary)' }}>{fileName}</strong>
                {phase !== 'done' && <button type="button" onClick={reset} disabled={busy} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}>Choose a different file</button>}
              </div>

              {/* Summary tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 10 }}>
                <Tile label="Total rows" value={report.totalRows} color="var(--text-primary)" />
                {phase === 'done'
                  ? <Tile label="Imported" value={report.imported} color="#1faf52" />
                  : <Tile label="Ready" value={report.validCount} color="#1faf52" />}
                <Tile label="Duplicates" value={report.duplicates} color="#f59e0b" />
                <Tile label="Failed" value={report.failed} color="var(--hot)" />
                {report.emptyRows > 0 && <Tile label="Empty (skipped)" value={report.emptyRows} color="var(--text-muted)" />}
              </div>

              {phase === 'done' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(31,175,82,0.1)', border: '1px solid rgba(31,175,82,0.3)' }}>
                  <CheckCircle2 size={18} style={{ color: '#1faf52' }} />
                  <span style={{ fontSize: 13.5 }}><strong>{report.imported}</strong> {type === 'Customer' ? 'customer' : 'lead'}{report.imported === 1 ? '' : 's'} imported successfully. {report.duplicates + report.failed > 0 ? `${report.duplicates} duplicate${report.duplicates === 1 ? '' : 's'} and ${report.failed} invalid row${report.failed === 1 ? '' : 's'} were skipped.` : ''}</span>
                </div>
              ) : (
                report.validCount === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--hot-soft)', border: '1px solid rgba(236,68,51,0.3)' }}>
                    <XCircle size={18} style={{ color: 'var(--hot)' }} />
                    <span style={{ fontSize: 13.5, color: 'var(--hot)' }}>No valid rows to import — fix the issues below and re-upload.</span>
                  </div>
                )
              )}

              {/* Issues / validation report */}
              {report.issues.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Validation report</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
                    {report.issues.map((it, i) => {
                      const meta = it.status === 'failed' ? { c: 'var(--hot)', Icon: XCircle, label: 'Failed' }
                        : it.status === 'duplicate' ? { c: '#f59e0b', Icon: Copy, label: 'Duplicate' }
                          : { c: '#3b82f6', Icon: AlertTriangle, label: 'Warning' };
                      return (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, padding: '4px 6px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, color: meta.c, fontWeight: 700 }}><meta.Icon size={13} /> Row {it.row}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{it.messages.join(' ')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface-2)' }}>
          {phase === 'done' ? (
            <button type="button" onClick={onClose} className="btn btn-primary" style={{ padding: '10px 22px', fontSize: 14 }}>Done</button>
          ) : (
            <>
              <button type="button" onClick={onClose} disabled={busy} className="btn btn-secondary" style={{ padding: '10px 18px', fontSize: 14 }}>Cancel</button>
              {phase === 'preview' && report && (
                <button type="button" onClick={commit} disabled={report.validCount === 0} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>
                  Import {report.validCount} {type === 'Customer' ? 'customer' : 'lead'}{report.validCount === 1 ? '' : 's'}
                </button>
              )}
              {phase === 'committing' && (
                <button type="button" disabled className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Importing…</button>
              )}
            </>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', background: 'var(--bg-surface)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, lineHeight: 1, color }}>{value.toLocaleString('en-US')}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
    </div>
  );
}
