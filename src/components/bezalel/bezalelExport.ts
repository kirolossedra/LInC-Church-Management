import type { BezalelMessage, PastorBezalelCalendarAction } from '../../services/bezalel';

export type BezalelActionRecord = {
  id: string;
  requestedAt: string;
  completedAt?: string;
  status: 'started' | 'succeeded' | 'failed';
  action: PastorBezalelCalendarAction['action'] | 'create_booking_request';
  date: string;
  targetId: string;
  resultTargetId?: string;
  details: Record<string, unknown>;
  error?: string;
};

export type BezalelExportInput = {
  participant: string;
  participantRole: string;
  context: string;
  messages: BezalelMessage[];
  actions?: BezalelActionRecord[];
  exportedAt?: string;
};

export function downloadBezalelSession(input: BezalelExportInput) {
  const exportedAt = input.exportedAt || new Date().toISOString();
  const html = buildBezalelExportHtml({ ...input, exportedAt });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bezalel-session-${safeFilenameDate(exportedAt)}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildBezalelExportHtml(input: BezalelExportInput) {
  const exportedAt = input.exportedAt || new Date().toISOString();
  const actions = input.actions || [];
  const payload = { ...input, actions, exportedAt, timeZone: 'America/Toronto', formatVersion: 1 };
  const transcript = input.messages.map(message => `
    <article class="message ${message.role}">
      <div class="message-header"><strong>${message.role === 'assistant' ? 'Bezalel' : escapeHtml(input.participant)}</strong><time>${escapeHtml(formatTimestamp(message.timestamp))}</time></div>
      <p>${escapeHtml(message.content).replace(/\n/g, '<br>')}</p>
    </article>`).join('');
  const ledger = actions.length > 0
    ? actions.map(action => `
      <tr>
        <td>${escapeHtml(formatTimestamp(action.requestedAt))}</td>
        <td><span class="status ${action.status}">${escapeHtml(action.status)}</span></td>
        <td>${escapeHtml(action.action)}</td>
        <td>${escapeHtml(action.date || 'N/A')}</td>
        <td>${escapeHtml(action.targetId || action.resultTargetId || 'N/A')}</td>
        <td><code>${escapeHtml(JSON.stringify(action.details))}</code>${action.error ? `<div class="error">${escapeHtml(action.error)}</div>` : ''}</td>
      </tr>`).join('')
    : '<tr><td colspan="6">No calendar mutation was executed in this session.</td></tr>';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bezalel session export</title><style>
body{font-family:Inter,Arial,sans-serif;margin:0;background:#f8f3eb;color:#2b211d}.page{max-width:960px;margin:32px auto;padding:32px}.hero{background:#1b0d0d;color:#fff;border-radius:24px;padding:28px}.hero h1{font-family:Georgia,serif;font-size:38px;margin:0}.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:20px}.meta div{background:#ffffff12;padding:12px;border-radius:12px}.meta small{display:block;color:#d8c7bb;margin-bottom:4px}.section{margin-top:28px}.message{max-width:78%;padding:14px 18px;border-radius:18px;margin:12px 0;background:#eee2d5}.message.user{margin-left:auto;background:#7a1717;color:#fff}.message-header{display:flex;justify-content:space-between;gap:12px;font-size:12px}.message time{opacity:.7}.message p{line-height:1.55;margin:8px 0 0}table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden}th,td{padding:12px;text-align:left;border-bottom:1px solid #eee;vertical-align:top;font-size:12px}th{background:#ede2d5}.status{font-weight:700;text-transform:uppercase}.status.succeeded{color:#18733a}.status.failed,.error{color:#a11b1b}.status.started{color:#9a6700}code{white-space:pre-wrap;word-break:break-word}.machine{white-space:pre-wrap;word-break:break-word;background:#211515;color:#f4e9df;padding:18px;border-radius:14px;font-size:11px}@media print{body{background:#fff}.page{margin:0;max-width:none}.machine{page-break-before:always}}
</style></head><body><main class="page">
<section class="hero"><h1>Bezalel chat session</h1><div class="meta"><div><small>Person</small>${escapeHtml(input.participant)}</div><div><small>Role</small>${escapeHtml(input.participantRole)}</div><div><small>Context</small>${escapeHtml(input.context)}</div><div><small>Exported</small>${escapeHtml(formatTimestamp(exportedAt))}</div></div></section>
<section class="section"><h2>Conversation</h2>${transcript}</section>
<section class="section"><h2>Calendar action ledger</h2><p>This ledger supports investigation and manual rollback. It does not automatically reverse changes.</p><table><thead><tr><th>Requested</th><th>Status</th><th>Action</th><th>Date</th><th>Target</th><th>Recorded parameters</th></tr></thead><tbody>${ledger}</tbody></table></section>
<section class="section"><h2>Machine-readable record</h2><pre class="machine">${escapeHtml(JSON.stringify(payload, null, 2))}</pre></section>
</main></body></html>`;
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'long',
  }).format(date);
}

function safeFilenameDate(timestamp: string) {
  return timestamp.replace(/[:.]/g, '-').replace(/[^0-9TZ-]/g, '').slice(0, 24);
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] || character);
}
