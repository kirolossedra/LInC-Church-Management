import { Fragment, useState } from 'react';
import { ClipboardList, Mail, RefreshCw, Save, Trash2 } from 'lucide-react';

import {
  deleteAssessmentResponse,
  getAssessmentResponses,
  sendAssessmentIdentifierEmail,
  updateAssessmentLinkage,
  type AssessmentAdminResponse,
  type AssessmentFormId,
} from '../../../services/assessment';

const FORMS: Array<{ id: AssessmentFormId; title: string }> = [
  { id: 'five-service-pathways', title: 'Five Service Pathways' },
  { id: 'spiritual-gifts-discovery', title: 'Spiritual Gifts Discovery' },
];

export function AssessmentUserLinkageSection() {
  const [formId, setFormId] = useState<AssessmentFormId>('five-service-pathways');
  const [rows, setRows] = useState<AssessmentAdminResponse[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { identifier: string; formId: '' | '0' | '1' }>>({});
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async (nextFormId = formId) => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const result = await getAssessmentResponses(nextFormId);
      setRows(result.responses);
      setDrafts(Object.fromEntries(result.responses.map(row => [row.id, {
        identifier: row.userIdentifier,
        formId: row.databaseFormId === '0' || row.databaseFormId === '1'
          ? row.databaseFormId
          : '',
      }])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load assessment responses.');
    } finally { setLoading(false); }
  };

  const changeForm = (nextFormId: AssessmentFormId) => {
    setFormId(nextFormId);
    setRows([]);
    setDrafts({});
    setExpandedId(null);
    void load(nextFormId);
  };

  const save = async (row: AssessmentAdminResponse) => {
    const draft = drafts[row.id] || { identifier: '', formId: '' as const };
    if (!draft.identifier.trim() && !draft.formId) {
      setError('Enter a user identifier or choose a form ID before saving.');
      return;
    }
    setWorkingId(row.id);
    setError('');
    setMessage('');
    try {
      await updateAssessmentLinkage(row.id, {
        userIdentifier: draft.identifier.trim(),
        databaseFormId: draft.formId,
      });
      await load();
      setMessage('Linkage data saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save linkage data.');
    } finally { setWorkingId(null); }
  };

  const remove = async (row: AssessmentAdminResponse) => {
    if (!window.confirm(`Delete the response for ${row.fullName || row.email}? This cannot be undone.`)) return;
    setWorkingId(row.id);
    setError('');
    try {
      await deleteAssessmentResponse(row.id);
      setRows(current => current.filter(item => item.id !== row.id));
      setMessage('Response deleted.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete the response.');
    } finally { setWorkingId(null); }
  };

  const sendIdentifier = async (row: AssessmentAdminResponse) => {
    setWorkingId(row.id);
    setError('');
    try {
      await sendAssessmentIdentifierEmail(row.id);
      await load();
      setMessage(`Identifier email sent to ${row.email}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send the identifier email.');
    } finally { setWorkingId(null); }
  };

  const sendAll = async () => {
    const eligible = rows.filter(row => row.userIdentifier && row.email.includes('@'));
    if (!eligible.length) {
      setError('No rows have both a saved identifier and valid email.');
      return;
    }
    if (!window.confirm(`Send identifier emails to ${eligible.length} people?`)) return;
    setWorkingId('all');
    setError('');
    let sent = 0;
    try {
      for (const row of eligible) {
        await sendAssessmentIdentifierEmail(row.id);
        sent += 1;
      }
      await load();
      setMessage(`${sent} identifier emails sent successfully.`);
    } catch (reason) {
      setError(`${sent} emails sent before an error: ${reason instanceof Error ? reason.message : 'Unknown error'}`);
    } finally { setWorkingId(null); }
  };

  return (
    <section className="rounded-3xl border border-[#8b1e1e]/10 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#8b1e1e]">
            <ClipboardList size={20} />
            <h2 className="text-xl font-extrabold">Assessment User Linkage</h2>
          </div>
          <p className="text-sm text-stone-600">
            Link assessment responses to member identifiers. Access follows the Manage Assessment Forms allocation.
          </p>
        </div>
        <button type="button" onClick={sendAll} disabled={workingId !== null || loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#8b1e1e] px-4 text-sm font-bold text-white disabled:opacity-50">
          <Mail size={16} /> Send all identifiers
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <select value={formId} onChange={event => changeForm(event.target.value as AssessmentFormId)}
          className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 font-semibold">
          {FORMS.map(form => <option key={form.id} value={form.id}>{form.title}</option>)}
        </select>
        <button type="button" onClick={() => void load()} disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#8b1e1e]/20 px-4 font-bold text-[#8b1e1e] disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh responses'}
        </button>
      </div>

      {message && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</div>}
      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-stone-200">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="bg-stone-50 text-left text-[#641414]">
            <tr>{['Name / Email', 'Current identifier', 'Identifier', 'Form ID', 'Submitted', 'Actions'].map(label => (
              <th key={label} className="border-b border-stone-200 p-3">{label}</th>
            ))}</tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-stone-500">Select a form and refresh to load responses.</td></tr>}
            {rows.map(row => {
              const draft = drafts[row.id] || { identifier: row.userIdentifier, formId: '' as const };
              const busy = workingId === row.id || workingId === 'all';
              return <Fragment key={row.id}>
                <tr className="align-top">
                  <td className="border-b border-stone-100 p-3"><strong>{row.fullName}</strong><div className="mt-1 text-stone-500">{row.email}</div></td>
                  <td className="border-b border-stone-100 p-3 font-bold text-[#641414]">{row.userIdentifier || '—'}</td>
                  <td className="border-b border-stone-100 p-3"><input value={draft.identifier}
                    onChange={event => setDrafts(current => ({ ...current, [row.id]: { ...draft, identifier: event.target.value } }))}
                    className="min-h-10 w-full rounded-lg border border-stone-300 px-3" /></td>
                  <td className="border-b border-stone-100 p-3"><select value={draft.formId}
                    onChange={event => setDrafts(current => ({ ...current, [row.id]: { ...draft, formId: event.target.value as '' | '0' | '1' } }))}
                    className="min-h-10 rounded-lg border border-stone-300 px-3"><option value="">—</option><option value="0">0</option><option value="1">1</option></select></td>
                  <td className="border-b border-stone-100 p-3 text-stone-600">{row.createdAtEasternTime || '—'}</td>
                  <td className="border-b border-stone-100 p-3"><div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void save(row)} title="Save linkage" className="rounded-lg bg-[#8b1e1e] p-2 text-white disabled:opacity-50"><Save size={15} /></button>
                    <button type="button" disabled={busy || !row.userIdentifier || !row.email.includes('@')} onClick={() => void sendIdentifier(row)} title="Send identifier" className="rounded-lg bg-blue-600 p-2 text-white disabled:opacity-50"><Mail size={15} /></button>
                    <button type="button" disabled={busy} onClick={() => setExpandedId(expandedId === row.id ? null : row.id)} className="rounded-lg border border-stone-300 px-2 font-bold">Preview</button>
                    <button type="button" disabled={busy} onClick={() => void remove(row)} title="Delete response" className="rounded-lg bg-red-600 p-2 text-white disabled:opacity-50"><Trash2 size={15} /></button>
                  </div></td>
                </tr>
                {expandedId === row.id && <tr><td colSpan={6} className="border-b border-stone-200 bg-stone-950 p-4"><pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-stone-100">{JSON.stringify(row.raw, null, 2)}</pre></td></tr>}
              </Fragment>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
