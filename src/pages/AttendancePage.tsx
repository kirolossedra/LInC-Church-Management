// Attendance page locked by a simple date-based passcode before showing the page content.

import { useState } from 'react';

export default function AttendancePage() {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');

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

    setError('Incorrect passcode. Please try again.');
  };

  if (!isUnlocked) {
    return (
      <div
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
            Attendance Access
          </h1>

          <p
            style={{
              margin: '0 0 28px',
              color: '#666',
              lineHeight: 1.6,
            }}
          >
            Enter today&apos;s attendance passcode to continue.
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
              placeholder="4-digit code"
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
              Proceed
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Attendance Page</h1>
      <p>If you can see this page, the Attendance route is working.</p>
    </div>
  );
}
