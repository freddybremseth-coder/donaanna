import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  GraduationCap,
  LockKeyhole,
  MapPinned,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type { Parcel } from '../types';
import { supabase, supabaseOlivia } from '../services/supabaseClient';

type CaecvCase = {
  id: string;
  operator_name: string;
  operator_nif?: string | null;
  representative_name?: string | null;
  representative_nif?: string | null;
  authority: string;
  application_type?: string | null;
  certification_scope?: string | null;
  status: string;
  current_step?: string | null;
  regepa_code?: string | null;
  prepared_at?: string | null;
  signed_at?: string | null;
  submitted_at?: string | null;
  submission_method?: string | null;
  inspection_at?: string | null;
  certified_at?: string | null;
  certificate_number?: string | null;
};

type CaecvDocument = {
  id: string;
  package_id: string;
  title: string;
  document_code?: string | null;
  document_type: string;
  party: string;
  status: string;
  required: boolean;
  storage_bucket?: string | null;
  storage_path?: string | null;
  original_filename?: string | null;
  signed_by?: string | null;
  signed_at?: string | null;
  submitted_at?: string | null;
  next_action?: string | null;
  notes?: string | null;
};

type CaecvParcel = {
  id: string;
  case_id: string;
  parcel_id: string;
  polygon: string;
  parcel_number: string;
  recinto?: string | null;
  sigpac_area_ha?: number | null;
  sigpac_use?: string | null;
  previous_certified: boolean;
  transfer_code?: string | null;
  certification_status: string;
  drift_risk?: string | null;
  notes?: string | null;
};

type CaecvTask = {
  id: string;
  title: string;
  priority: string;
  user_name?: string | null;
  status: string;
};

type WebsiteDraft = {
  title: string;
  slug: string;
  status: string;
  updated_at?: string | null;
};

const CASE_ID = 'donaanna-caecv-2026';
const ARTICLE_SLUG = 'veien-til-okologisk-sertifisering-dona-anna';

const statusLabel: Record<string, string> = {
  prepared_for_signature: 'Klar for signering',
  signed: 'Signert',
  submitted: 'Sendt til CAECV',
  under_review: 'Dokumentkontroll',
  inspection_scheduled: 'Inspeksjon planlagt',
  certified: 'Sertifisert',
  draft: 'Mangler / utkast',
  ready_for_signature: 'Klar for signering',
  accepted: 'Godkjent',
  rejected: 'Avvist',
  archived: 'Arkivert',
};

const statusClass: Record<string, string> = {
  certified: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  accepted: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  submitted: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  signed: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
  ready_for_signature: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  prepared_for_signature: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  draft: 'border-white/10 bg-white/5 text-slate-300',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safeFileName(name: string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
}

function formatHa(value?: number | null) {
  if (value == null) return '–';
  return `${Number(value).toFixed(4).replace('.', ',')} ha`;
}

const CaecvCertificationView: React.FC<{ parcels: Parcel[] }> = ({ parcels }) => {
  const [caseData, setCaseData] = useState<CaecvCase | null>(null);
  const [documents, setDocuments] = useState<CaecvDocument[]>([]);
  const [caseParcels, setCaseParcels] = useState<CaecvParcel[]>([]);
  const [tasks, setTasks] = useState<CaecvTask[]>([]);
  const [websiteDraft, setWebsiteDraft] = useState<WebsiteDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [regepa, setRegepa] = useState('');

  const parcelById = useMemo(
    () => new Map(parcels.map(parcel => [parcel.id, parcel])),
    [parcels],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [caseResult, docsResult, parcelResult, taskResult, articleResult] = await Promise.all([
        supabaseOlivia.from('caecv_cases').select('*').eq('id', CASE_ID).maybeSingle(),
        supabaseOlivia.from('caecv_documents').select('*').eq('package_id', CASE_ID).eq('is_active', true).order('caecv_item_id'),
        supabaseOlivia.from('caecv_parcels').select('*').eq('case_id', CASE_ID).order('parcel_number'),
        supabaseOlivia.from('tasks').select('id,title,priority,user_name,status').eq('category', 'CAECV').order('created_at'),
        supabase.from('website_posts').select('title,slug,status,updated_at').eq('brand_id', 'donaanna').eq('slug', ARTICLE_SLUG).maybeSingle(),
      ]);

      const firstError = caseResult.error || docsResult.error || parcelResult.error || taskResult.error;
      if (firstError) throw firstError;

      setCaseData((caseResult.data as CaecvCase | null) ?? null);
      setRegepa((caseResult.data as CaecvCase | null)?.regepa_code ?? '');
      setDocuments((docsResult.data as CaecvDocument[]) ?? []);
      setCaseParcels((parcelResult.data as CaecvParcel[]) ?? []);
      setTasks((taskResult.data as CaecvTask[]) ?? []);
      if (!articleResult.error) setWebsiteDraft((articleResult.data as WebsiteDraft | null) ?? null);
    } catch (e: any) {
      setError(e?.message || 'Kunne ikke hente CAECV-data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveRegepa = async () => {
    setBusy('regepa');
    setError('');
    const { error: updateError } = await supabaseOlivia
      .from('caecv_cases')
      .update({
        regepa_code: regepa.trim() || null,
        current_step: regepa.trim()
          ? 'Firmar el paquete en papel y presentarlo a CAECV por correo o presencialmente.'
          : 'Completar REGEPA, firmar el paquete en papel y presentarlo a CAECV por correo o presencialmente.',
      })
      .eq('id', CASE_ID);
    if (updateError) setError(updateError.message);
    await load();
    setBusy(null);
  };

  const markCaseSigned = async () => {
    if (!window.confirm('Marker CAECV-pakken som signert på papir?')) return;
    setBusy('sign-case');
    const date = today();
    const { error: updateError } = await supabaseOlivia
      .from('caecv_cases')
      .update({
        status: 'signed',
        signed_at: date,
        current_step: 'Presentar la solicitud a CAECV por correo o presencialmente y registrar justificante.',
      })
      .eq('id', CASE_ID);
    if (!updateError) {
      await supabaseOlivia
        .from('caecv_documents')
        .update({ status: 'signed', signed_at: date })
        .eq('package_id', CASE_ID)
        .eq('status', 'ready_for_signature');
    } else {
      setError(updateError.message);
    }
    await load();
    setBusy(null);
  };

  const markCaseSubmitted = async () => {
    if (!window.confirm('Har papirpakken faktisk blitt sendt eller levert til CAECV? Dette registrerer innsending i Olivia.')) return;
    setBusy('submit-case');
    const date = today();
    const { error: updateError } = await supabaseOlivia
      .from('caecv_cases')
      .update({
        status: 'submitted',
        submitted_at: date,
        submission_method: 'postal_mail',
        current_step: 'Esperar revisión documental de CAECV y registrar cualquier requerimiento o fecha de inspección.',
      })
      .eq('id', CASE_ID);

    if (!updateError) {
      await supabaseOlivia
        .from('caecv_documents')
        .update({ status: 'submitted', submitted_at: date, submission_method: 'postal_mail' })
        .eq('package_id', CASE_ID)
        .in('status', ['signed', 'ready_for_signature']);
    } else {
      setError(updateError.message);
    }
    await load();
    setBusy(null);
  };

  const uploadDocument = async (doc: CaecvDocument, file: File) => {
    setBusy(doc.id);
    setError('');
    try {
      const path = `${CASE_ID}/${doc.id}/${Date.now()}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from('caecv-documents')
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabaseOlivia
        .from('caecv_documents')
        .update({
          storage_bucket: 'caecv-documents',
          storage_path: path,
          original_filename: file.name,
          mime_type: file.type || null,
          file_size_bytes: file.size,
        })
        .eq('id', doc.id);
      if (updateError) throw updateError;
      await load();
    } catch (e: any) {
      setError(e?.message || 'Opplasting feilet.');
    } finally {
      setBusy(null);
    }
  };

  const openDocument = async (doc: CaecvDocument) => {
    if (!doc.storage_path) return;
    setBusy(`open-${doc.id}`);
    const { data, error: signedUrlError } = await supabase.storage
      .from(doc.storage_bucket || 'caecv-documents')
      .createSignedUrl(doc.storage_path, 300);
    if (signedUrlError) setError(signedUrlError.message);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    setBusy(null);
  };

  const toggleTask = async (task: CaecvTask) => {
    setBusy(task.id);
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    const { error: updateError } = await supabaseOlivia
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', task.id);
    if (updateError) setError(updateError.message);
    await load();
    setBusy(null);
  };

  const updateDriftRisk = async (parcel: CaecvParcel, value: string) => {
    setBusy(parcel.id);
    const { error: updateError } = await supabaseOlivia
      .from('caecv_parcels')
      .update({ drift_risk: value || null })
      .eq('id', parcel.id);
    if (updateError) setError(updateError.message);
    await load();
    setBusy(null);
  };

  const totalHa = useMemo(
    () => caseParcels.reduce((sum, parcel) => sum + Number(parcel.sigpac_area_ha || 0), 0),
    [caseParcels],
  );

  const timeline = useMemo(() => {
    const status = caseData?.status || '';
    const done = new Set<string>();
    if (caseData?.prepared_at) done.add('prepared');
    if (caseData?.signed_at || ['signed', 'submitted', 'under_review', 'inspection_scheduled', 'certified'].includes(status)) done.add('signed');
    if (caseData?.submitted_at || ['submitted', 'under_review', 'inspection_scheduled', 'certified'].includes(status)) done.add('submitted');
    if (['under_review', 'inspection_scheduled', 'certified'].includes(status)) done.add('review');
    if (caseData?.inspection_at || ['inspection_scheduled', 'certified'].includes(status)) done.add('inspection');
    if (caseData?.certified_at || status === 'certified') done.add('certified');
    return [
      ['prepared', 'Klargjort'],
      ['signed', 'Signert'],
      ['submitted', 'Sendt'],
      ['review', 'Dokumentkontroll'],
      ['inspection', 'Inspeksjon'],
      ['certified', 'Sertifikat'],
    ].map(([id, label]) => ({ id, label, done: done.has(id) }));
  }, [caseData]);

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center text-slate-400"><RefreshCw className="mr-3 animate-spin" size={20} />Laster CAECV...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 rounded-3xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/10 via-white/[0.02] to-transparent p-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <ShieldCheck size={18} /> Økologisk sertifisering
          </div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">CAECV – Doña Anna</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Kontrollsenter for søknad, dokumenter, SIGPAC-parseller, oppgaver og videre sertifiseringsløp.
          </p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
          <RefreshCw size={16} /> Oppdater
        </button>
      </div>

      {error && (
        <div className="flex gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
              <h2 className="mt-1 text-xl font-semibold text-white">{statusLabel[caseData?.status || ''] || caseData?.status || 'Ikke registrert'}</h2>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[caseData?.status || ''] || statusClass.draft}`}>
              {caseData?.submitted_at ? `Sendt ${caseData.submitted_at}` : 'Ikke sendt'}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">{caseData?.current_step || 'Ingen neste handling registrert.'}</p>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Operatør</p>
              <p className="mt-1 text-sm font-medium text-white">{caseData?.operator_name || '–'}</p>
              <p className="text-xs text-slate-500">{caseData?.operator_nif || ''}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Representant</p>
              <p className="mt-1 text-sm font-medium text-white">{caseData?.representative_name || '–'}</p>
              <p className="text-xs text-slate-500">{caseData?.representative_nif || ''}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">SIGPAC</p>
              <p className="mt-1 text-sm font-medium text-white">{formatHa(totalHa)}</p>
              <p className="text-xs text-slate-500">{caseParcels.length} parseller</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Myndighet</p>
              <p className="mt-1 text-sm font-medium text-white">{caseData?.authority || 'CAECV'}</p>
              <p className="text-xs text-slate-500">Cambio de titularidad</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">REGEPA</p>
          <div className="mt-3 flex gap-2">
            <input
              value={regepa}
              onChange={e => setRegepa(e.target.value)}
              placeholder="Ikke registrert ennå"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
            />
            <button onClick={() => void saveRegepa()} disabled={busy === 'regepa'} className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">
              Lagre
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Legg inn koden når OCA/GVA har bekreftet registreringen.</p>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-5 flex items-center gap-2">
          <Clock3 size={18} className="text-emerald-300" />
          <h2 className="font-semibold text-white">Sertifiseringsløp</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-6">
          {timeline.map((step, index) => (
            <div key={step.id} className={`rounded-xl border p-3 ${step.done ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-white/8 bg-black/20'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{index + 1}</span>
                {step.done ? <CheckCircle2 size={16} className="text-emerald-300" /> : <Clock3 size={16} className="text-slate-600" />}
              </div>
              <p className={`mt-2 text-sm font-medium ${step.done ? 'text-emerald-200' : 'text-slate-400'}`}>{step.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => void markCaseSigned()} disabled={busy === 'sign-case' || !!caseData?.submitted_at} className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm font-semibold text-violet-200 disabled:opacity-40">
            <CheckCircle2 size={16} /> Marker papirpakken signert
          </button>
          <button onClick={() => void markCaseSubmitted()} disabled={busy === 'submit-case' || !!caseData?.submitted_at} className="inline-flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-200 disabled:opacity-40">
            <Send size={16} /> Marker søknaden sendt
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-5 flex items-center gap-2">
          <MapPinned size={18} className="text-emerald-300" />
          <h2 className="font-semibold text-white">Parseller og SIGPAC</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="pb-3">Parcela</th>
                <th className="pb-3">Recinto</th>
                <th className="pb-3">SIGPAC</th>
                <th className="pb-3">Uso</th>
                <th className="pb-3">Overføring</th>
                <th className="pb-3">Tidligere sertifisert</th>
                <th className="pb-3">Mulig avdrift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {caseParcels.map(parcel => {
                const farmParcel = parcelById.get(parcel.parcel_id);
                return (
                  <tr key={parcel.id}>
                    <td className="py-3">
                      <p className="font-medium text-white">{parcel.parcel_number}</p>
                      <p className="max-w-[260px] truncate text-xs text-slate-500">{farmParcel?.name || farmParcel?.cadastralId || parcel.parcel_id}</p>
                    </td>
                    <td className="py-3 text-slate-300">{parcel.recinto || '–'}</td>
                    <td className="py-3 text-slate-300">{formatHa(parcel.sigpac_area_ha)}</td>
                    <td className="py-3 text-slate-300">{parcel.sigpac_use || '–'}</td>
                    <td className="py-3"><span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">{parcel.transfer_code || '–'}</span></td>
                    <td className="py-3 text-slate-300">{parcel.previous_certified ? 'Ja' : 'Nei'}</td>
                    <td className="py-3">
                      <select
                        value={parcel.drift_risk || ''}
                        onChange={e => void updateDriftRisk(parcel, e.target.value)}
                        disabled={busy === parcel.id}
                        className="rounded-lg border border-white/10 bg-[#111217] px-2 py-1.5 text-xs text-slate-200"
                      >
                        <option value="">Ikke vurdert</option>
                        <option value="no">Nei</option>
                        <option value="yes">Ja</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-emerald-300" />
              <h2 className="font-semibold text-white">Dokumenter</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><LockKeyhole size={14} /> Privat dokumentarkiv</span>
          </div>
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="rounded-xl border border-white/8 bg-black/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{doc.title}</p>
                      {doc.required && <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">Påkrevd</span>}
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass[doc.status] || statusClass.draft}`}>{statusLabel[doc.status] || doc.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{doc.document_code || doc.document_type}{doc.original_filename ? ` · ${doc.original_filename}` : ''}</p>
                    {doc.next_action && <p className="mt-2 text-sm text-slate-400">{doc.next_action}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {doc.storage_path && (
                      <button onClick={() => void openDocument(doc)} disabled={busy === `open-${doc.id}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                        <Download size={14} /> Åpne
                      </button>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">
                      <Upload size={14} /> {doc.storage_path ? 'Ny versjon' : 'Last opp'}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) void uploadDocument(doc, file);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-5 flex items-center gap-2">
            <GraduationCap size={18} className="text-emerald-300" />
            <h2 className="font-semibold text-white">Oppgaver</h2>
          </div>
          <div className="space-y-2">
            {tasks.map(task => (
              <button
                key={task.id}
                onClick={() => void toggleTask(task)}
                disabled={busy === task.id}
                className="flex w-full items-start gap-3 rounded-xl border border-white/8 bg-black/20 p-3 text-left hover:bg-white/5 disabled:opacity-50"
              >
                {task.status === 'DONE' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" /> : <Clock3 size={18} className="mt-0.5 shrink-0 text-amber-300" />}
                <div>
                  <p className={`text-sm font-medium ${task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-white'}`}>{task.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{task.user_name || ''} · {task.priority}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">donaanna.com</p>
            <h2 className="mt-1 font-semibold text-white">{websiteDraft?.title || 'Sertifiseringsartikkel'}</h2>
            <p className="mt-2 text-sm text-slate-400">
              Artikkelen ligger som utkast og skal ikke publiseres med «sertifisert økologisk» før CAECV faktisk har utstedt sertifikatet.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
            {websiteDraft?.status === 'draft' ? 'Utkast' : websiteDraft?.status || 'Ikke funnet'}
          </span>
        </div>
      </section>
    </div>
  );
};

export default CaecvCertificationView;
