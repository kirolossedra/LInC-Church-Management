import { describe, expect, it } from 'vitest'

import { buildPeopleAccessInvitation } from '../src/services/peopleAccessInvitation.service'
import { generateMemorableTemporaryPassword } from '../src/services/peopleAccessPassword.service'

describe('People Access migration services', () => {
  it('generates a memorable password that exceeds Firebase requirements', () => {
    const values = [0, 1, 382, 0xa7f3c9]
    const password = generateMemorableTemporaryPassword(() => values.shift() ?? 0)
    expect(password).toBe('Cedar-Bridge-482-A7F3C9!')
    expect(password.length).toBeGreaterThanOrEqual(6)
    expect(password).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-\d{3}-[A-F0-9]{6}!$/)
  })

  it('includes a temporary password only for accounts created by the migration', () => {
    const created = buildPeopleAccessInvitation({
      fullName: 'Person One',
      email: 'person@example.com',
      locale: 'en',
      temporaryPassword: 'Cedar-Bridge-482!',
    })
    const linked = buildPeopleAccessInvitation({
      fullName: 'Person Two',
      email: 'linked@example.com',
      locale: 'en',
    })
    expect(created.textContent).toContain('Temporary password: Cedar-Bridge-482!')
    expect(created.textContent).toContain('https://lincministry.com/group-notes')
    expect(linked.textContent).not.toContain('Temporary password:')
    expect(linked.textContent).toContain('password you already use')
  })

  it('escapes member-controlled values in the HTML email', () => {
    const invitation = buildPeopleAccessInvitation({
      fullName: '<script>alert(1)</script>',
      email: 'person@example.com',
      locale: 'en',
      temporaryPassword: 'Cedar-Bridge-482!',
    })
    expect(invitation.htmlContent).not.toContain('<script>')
    expect(invitation.htmlContent).toContain('&lt;script&gt;')
  })

  it('renders Arabic invitations as RTL while isolating credentials as LTR', () => {
    const invitation = buildPeopleAccessInvitation({
      fullName: 'شخص عربي',
      email: 'arabic@example.com',
      locale: 'ar',
      temporaryPassword: 'Cedar-Bridge-482!',
    })
    expect(invitation.subject).toContain('بيانات الدخول')
    expect(invitation.htmlContent).toContain('<html lang="ar" dir="rtl">')
    expect(invitation.htmlContent).toContain('كلمة المرور المؤقتة')
    expect(invitation.htmlContent).toContain('dir="ltr"')
    expect(invitation.textContent).toContain('كلمة المرور المؤقتة: Cedar-Bridge-482!')
  })
})
