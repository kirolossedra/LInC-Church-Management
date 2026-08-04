import { X } from 'lucide-react';
import AttendancePersonEditor from './AttendancePersonEditor';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendancePersonModal({ controller }: { controller: AttendanceController }) {
  const { selectedPersonId, isSavingPerson, isPersonEditModalOpen, personEditModalRef, text, closePersonEditor } = controller;

  return (
    <>
        {isPersonEditModalOpen && (
          <div
            className="attendance-person-edit-overlay"
            role="presentation"
            onMouseDown={event => {
              if (
                event.target === event.currentTarget &&
                !isSavingPerson
              ) {
                closePersonEditor();
              }
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              padding: '24px',
              background: 'rgba(28, 12, 12, 0.62)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
            }}
          >
            <div
              ref={personEditModalRef}
              className="attendance-person-edit-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="attendance-person-edit-title"
              tabIndex={-1}
              onMouseDown={event => event.stopPropagation()}
              style={{
                width: 'min(920px, 100%)',
                maxHeight: 'calc(100dvh - 48px)',
                overflow: 'hidden',
                borderRadius: '28px',
                background: 'white',
                boxShadow: '0 28px 90px rgba(0, 0, 0, 0.38)',
                border: '1px solid rgba(255, 255, 255, 0.38)',
                display: 'flex',
                flexDirection: 'column',
                outline: 'none',
              }}
            >
              <div
                className="attendance-person-edit-modal-header"
                style={{
                  flex: '0 0 auto',
                  padding: '22px 24px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  background: '#fffafa',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h2
                    id="attendance-person-edit-title"
                    style={{
                      margin: '0 0 5px',
                      color: '#8b1e1e',
                      fontSize: '24px',
                      fontWeight: 900,
                    }}
                  >
                    {selectedPersonId ? text.editPerson : text.addPerson}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: '#666',
                      fontSize: '14px',
                      lineHeight: 1.5,
                    }}
                  >
                    {selectedPersonId
                      ? text.editPersonDescription
                      : text.addPersonDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePersonEditor}
                  disabled={isSavingPerson}
                  aria-label={text.close}
                  style={{
                    width: '44px',
                    height: '44px',
                    flex: '0 0 44px',
                    border: 'none',
                    borderRadius: '50%',
                    background: '#f5f4f0',
                    color: '#641414',
                    cursor: isSavingPerson ? 'not-allowed' : 'pointer',
                    opacity: isSavingPerson ? 0.55 : 1,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <X size={22} />
                </button>
              </div>

              <div
                className="attendance-person-edit-modal-body"
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  padding: '24px',
                }}
              >
                <AttendancePersonEditor controller={controller} />
              </div>
            </div>
          </div>
        )}


    </>
  );
}

