// Attendance page locked by a simple date-based passcode before showing the attendance actions.

import { useState } from 'react';
import { ClipboardList, UserPlus } from 'lucide-react';
import { useI18n } from '../i18n';

export default function AttendancePage() {
  const { dir, locale } = useI18n();

  const [passcodeInput, setPasscodeInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');

  const text = {
    accessTitle: locale === 'ar' ? 'الدخول إلى الحضور' : 'Attendance Access',
    accessDescription:
      locale === 'ar'
        ? 'أدخل رمز حضور اليوم للمتابعة.'
        : "Enter today's attendance passcode to continue.",
    passcodePlaceholder: locale === 'ar' ? 'رمز من 4 أرقام' : '4-digit code',
    incorrectPasscode:
      locale === 'ar'
        ? 'رمز غير صحيح. حاول مرة أخرى.'
        : 'Incorrect passcode. Please try again.',
    proceed: locale === 'ar' ? 'متابعة' : 'Proceed',
    pageTitle: locale === 'ar' ? 'صفحة الحضور' : 'Attendance Page',
    pageDescription:
      locale === 'ar'
        ? 'اختر الإجراء الذي تريد تنفيذه.'
        : 'Choose the action you want to perform.',
    addPerson: locale === 'ar' ? 'إضافة شخص' : 'Add Person',
    takeAttendance: locale === 'ar' ? 'تسجيل الحضور' : 'Take Attendance',
  };

  const getTodayPasscode = () => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const monthNumber = today.getMonth() + 1;

    const passcode = (dayOfMonth * 236 * monthNumber) % 10000;

    return passcode.toString().padStart(4, '0');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passcodeInput.trim() === getTodayPasscode()) {
      setIsUnlocked(true);
      setError('');
      return;
    }

    setError(text.incorrectPasscode);
  };

  if (!isUnlocked) {
    return (
      <div
        dir={dir}
        style={{
          minHeight: '100vh',
          padding: '40px',
          fontFamily: 'Arial, sans-serif',
          background: '#f5f4f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            background: 'white',
            borderRadius: '24px',
            padding: '36px',
            boxShadow: '0 12px 35px rgba(139, 30, 30, 0.14)',
            border: '1px solid rgba(139, 30, 30, 0.12)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#8b1e1e',
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 20px',
              fontSize: '28px',
              fontWeight: 'bold',
            }}
          >
            ✓
          </div>

          <h1
            style={{
              margin: '0 0 10px',
              color: '#8b1e1e',
              fontSize: '28px',
              fontWeight: 800,
            }}
          >
            {text.accessTitle}
          </h1>

          <p
            style={{
              margin: '0 0 28px',
              color: '#666',
              lineHeight: 1.6,
            }}
          >
            {text.accessDescription}
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={passcodeInput}
              onChange={e => {
                setPasscodeInput(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder={text.passcodePlaceholder}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '16px 18px',
                borderRadius: '16px',
                border: '2px solid #e5e0da',
                outline: 'none',
                fontSize: '22px',
                textAlign: 'center',
                letterSpacing: '0.18em',
                fontWeight: 700,
                color: '#641414',
                marginBottom: '14px',
              }}
            />

            {error && (
              <p
                style={{
                  margin: '0 0 16px',
                  color: '#b91c1c',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                minHeight: '52px',
                border: 'none',
                borderRadius: '999px',
                background: '#8b1e1e',
                color: 'white',
                fontSize: '17px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(139, 30, 30, 0.22)',
              }}
            >
              {text.proceed}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={dir}
      style={{
        minHeight: '100vh',
        padding: '40px',
        fontFamily: 'Arial, sans-serif',
        background: '#f5f4f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          background: 'white',
          borderRadius: '28px',
          padding: '40px',
          boxShadow: '0 12px 35px rgba(139, 30, 30, 0.14)',
          border: '1px solid rgba(139, 30, 30, 0.12)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: '0 0 12px',
            color: '#8b1e1e',
            fontSize: '32px',
            fontWeight: 800,
          }}
        >
          {text.pageTitle}
        </h1>

        <p
          style={{
            margin: '0 0 32px',
            color: '#666',
            fontSize: '17px',
            lineHeight: 1.6,
          }}
        >
          {text.pageDescription}
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '420px',
            margin: '0 auto',
          }}
        >
          <button
            type="button"
            style={{
              width: '100%',
              minHeight: '58px',
              border: '2px solid #8b1e1e',
              borderRadius: '999px',
              background: '#8b1e1e',
              color: 'white',
              fontSize: '18px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 8px 24px rgba(139, 30, 30, 0.22)',
            }}
          >
            <UserPlus size={20} />
            {text.addPerson}
          </button>

          <button
            type="button"
            style={{
              width: '100%',
              minHeight: '58px',
              border: '2px solid #8b1e1e',
              borderRadius: '999px',
              background: 'white',
              color: '#8b1e1e',
              fontSize: '18px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <ClipboardList size={20} />
            {text.takeAttendance}
          </button>
        </div>
      </div>
    </div>
  );
}
