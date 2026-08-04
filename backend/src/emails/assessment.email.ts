import type { AssessmentLocale } from '../assessment/assessment.service'

export function buildAssessmentEmail(params: {
  locale: AssessmentLocale
  title: string
  fullName: string
  answers: Record<string, string | number>
  result: Record<string, string>
}) {
  const rtl = params.locale === 'ar'
  const subject = `${params.title} - ${params.fullName}`
  const resultRows = Object.entries(params.result)
    .filter(([key]) => key !== 'summary')
    .map(([key, value]) => `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</li>`)
    .join('')
  const answerRows = Object.entries(params.answers)
    .map(([key, value]) => `<tr><th style="text-align:${rtl ? 'right' : 'left'};padding:6px">${escapeHtml(key)}</th><td style="padding:6px">${escapeHtml(String(value))}</td></tr>`)
    .join('')

  return {
    subject,
    htmlContent: `<div dir="${rtl ? 'rtl' : 'ltr'}"><h2>${escapeHtml(params.title)}</h2><p>${escapeHtml(params.result.summary || '')}</p><ul>${resultRows}</ul><table>${answerRows}</table></div>`,
    textContent: `${params.title}\n${params.result.summary || ''}\n\n${Object.entries(params.answers).map(([key, value]) => `${key}: ${value}`).join('\n')}`,
  }
}

export function buildIdentifierEmail(params: {
  locale: AssessmentLocale
  fullName: string
  identifier: string
}) {
  const arabic = params.locale === 'ar'
  const subject = 'LinC Mentorship Identifier'
  const greeting = arabic
    ? `مرحباً ${params.fullName || ''}،`
    : `Hello ${params.fullName || ''},`
  const message = arabic
    ? 'هذا هو رمز العبور الشخصي الخاص بك في برنامج الإرشاد والتلمذة.'
    : 'This is your LinC Mentorship identifier. Please save it somewhere safe.'
  return {
    subject,
    htmlContent: `<div dir="${arabic ? 'rtl' : 'ltr'}"><h2>${subject}</h2><p>${escapeHtml(greeting)}</p><p>${escapeHtml(message)}</p><p style="font-size:28px;font-weight:bold">${escapeHtml(params.identifier)}</p></div>`,
    textContent: `${greeting}\n${message}\n${params.identifier}`,
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
