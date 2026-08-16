import {
  sendBrevoEmail,
  type BrevoEmailResult,
} from './brevo.service'
import type { AppBindings } from '../types/app'

const PEOPLE_NOTES_LOGIN_URL = 'https://lincministry.com/group-notes'

export type PeopleAccessInvitationInput = {
  fullName: string
  email: string
  temporaryPassword?: string
}

export async function sendPeopleAccessInvitation(
  bindings: AppBindings,
  input: PeopleAccessInvitationInput,
): Promise<BrevoEmailResult> {
  return sendBrevoEmail(bindings, buildPeopleAccessInvitation(input))
}

export function buildPeopleAccessInvitation(input: PeopleAccessInvitationInput) {
  const name = input.fullName.trim() || 'LINC One member'
  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(input.email)
  const safePassword = input.temporaryPassword ? escapeHtml(input.temporaryPassword) : ''
  const accountInstructions = input.temporaryPassword
    ? `<p style="margin:0 0 10px"><strong>Email:</strong> ${safeEmail}</p>
       <p style="margin:0 0 24px"><strong>Temporary password:</strong> ${safePassword}</p>
       <p style="margin:0 0 24px;color:#665b55">Keep this email private. You can use the temporary password to sign in to People Notes.</p>`
    : `<p style="margin:0 0 10px"><strong>Email:</strong> ${safeEmail}</p>
       <p style="margin:0 0 24px;color:#665b55">Your existing Firebase account was linked to People Notes. Sign in with the password you already use for this email.</p>`
  const textInstructions = input.temporaryPassword
    ? `Email: ${input.email}\nTemporary password: ${input.temporaryPassword}\n\nKeep this email private. Use the temporary password to sign in.`
    : `Email: ${input.email}\n\nYour existing Firebase account was linked. Sign in with the password you already use for this email.`

  return {
    recipientEmail: input.email,
    recipientName: name,
    subject: 'Your LINC One People Notes access',
    htmlContent: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5efe5;font-family:Arial,sans-serif;color:#271515">
    <div style="max-width:620px;margin:0 auto;padding:32px 18px">
      <div style="border-radius:28px 28px 0 0;background:#1b1010;padding:30px;color:#fff">
        <p style="margin:0 0 10px;color:#f2a900;font-size:12px;font-weight:700;letter-spacing:2px">LINC ONE</p>
        <h1 style="margin:0;font-family:Georgia,serif;font-size:34px;font-weight:500">People Notes access</h1>
      </div>
      <div style="border-radius:0 0 28px 28px;background:#fff;padding:30px">
        <p style="margin:0 0 20px;font-size:17px">Hello ${safeName},</p>
        <p style="margin:0 0 24px;line-height:1.65">Your People Notes access is ready.</p>
        ${accountInstructions}
        <a href="${PEOPLE_NOTES_LOGIN_URL}" style="display:inline-block;border-radius:14px;background:#7a1b1b;padding:14px 22px;color:#fff;font-weight:700;text-decoration:none">Open People Notes</a>
        <p style="margin:24px 0 0;color:#887b72;font-size:13px;line-height:1.6">If you were not expecting this email, please contact a LINC One administrator.</p>
      </div>
    </div>
  </body>
</html>`,
    textContent: `Hello ${name},\n\nYour People Notes access is ready.\n\n${textInstructions}\n\nOpen People Notes: ${PEOPLE_NOTES_LOGIN_URL}\n\nIf you were not expecting this email, please contact a LINC One administrator.`,
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] || character)
}
