import { Loader2, Search, UserPlus, Users } from 'lucide-react';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendancePeoplePanel({ controller }: { controller: AttendanceController }) {
  const { dir, activePanel, setActivePanel, people, isLoadingPeople, peopleError, searchTerm, setSearchTerm, text, filteredPeople, openNewPersonEditor, handleSelectPerson } = controller;

  return (
    <>
        {activePanel === 'people' && (
          <section
            style={{
              marginTop: '28px',
              background: 'white',
              borderRadius: '28px',
              padding: '32px',
              boxShadow: '0 12px 35px rgba(139, 30, 30, 0.10)',
              border: '1px solid rgba(139, 30, 30, 0.10)',
            }}
          >
            <div
              className="attendance-section-header"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '28px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: '0 0 8px',
                    color: '#8b1e1e',
                    fontSize: '26px',
                    fontWeight: 800,
                  }}
                >
                  {text.peopleTitle}
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: '#666',
                    lineHeight: 1.6,
                  }}
                >
                  {text.peopleDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePanel('menu')}
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  background: '#f5f4f0',
                  color: '#641414',
                  padding: '12px 18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {text.backToMenu}
              </button>
            </div>

            <button
              type="button"
              onClick={openNewPersonEditor}
              style={{
                width: '100%',
                minHeight: '58px',
                border: 'none',
                borderRadius: '18px',
                background: '#8b1e1e',
                color: 'white',
                padding: '14px 20px',
                fontSize: '17px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(139, 30, 30, 0.22)',
              }}
            >
              <UserPlus size={20} />
              {text.addNewPerson}
            </button>

            <div
              style={{
                marginTop: '28px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 16px',
                  color: '#8b1e1e',
                  fontSize: '22px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Users size={22} />
                {text.existingPeople}
              </h3>

              <div
                style={{
                  position: 'relative',
                  marginBottom: '18px',
                }}
              >
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: dir === 'rtl' ? 'auto' : '16px',
                    right: dir === 'rtl' ? '16px' : 'auto',
                    color: '#8b1e1e',
                  }}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={text.searchPlaceholder}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: dir === 'rtl' ? '14px 46px 14px 16px' : '14px 16px 14px 46px',
                    borderRadius: '999px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '15px',
                  }}
                />
              </div>

              {isLoadingPeople && (
                <div
                  style={{
                    padding: '18px',
                    borderRadius: '18px',
                    background: '#f5f4f0',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Loader2 size={18} className="animate-spin" />
                  {text.loadingPeople}
                </div>
              )}

              {peopleError && (
                <div
                  style={{
                    padding: '18px',
                    borderRadius: '18px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    fontWeight: 800,
                  }}
                >
                  {peopleError}
                </div>
              )}

              {!isLoadingPeople && !peopleError && people.length === 0 && (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '18px',
                    background: '#f5f4f0',
                    color: '#666',
                    textAlign: 'center',
                  }}
                >
                  {text.noPeople}
                </div>
              )}

              {!isLoadingPeople && !peopleError && people.length > 0 && filteredPeople.length === 0 && (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '18px',
                    background: '#f5f4f0',
                    color: '#666',
                    textAlign: 'center',
                  }}
                >
                  {text.noSearchResults}
                </div>
              )}

              {!isLoadingPeople && !peopleError && filteredPeople.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gap: '12px',
                  }}
                >
                  {filteredPeople.map(person => (
                    <button
                      key={person.firebaseId}
                      type="button"
                      onClick={() => handleSelectPerson(person)}
                      style={{
                        width: '100%',
                        textAlign: dir === 'rtl' ? 'right' : 'left',
                        border: '1px solid #eee',
                        borderRadius: '18px',
                        padding: '16px',
                        background: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        {person.photoBase64 && (
                          <img
                            src={person.photoBase64}
                            alt={`${person.firstName} ${person.lastName}`}
                            style={{
                              width: '54px',
                              height: '54px',
                              flex: '0 0 54px',
                              objectFit: 'cover',
                              borderRadius: '16px',
                              border: '1px solid rgba(139, 30, 30, 0.16)',
                              background: '#f5f4f0',
                            }}
                          />
                        )}

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: '#641414',
                              fontSize: '17px',
                              fontWeight: 800,
                              marginBottom: '6px',
                            }}
                          >
                            {person.firstName} {person.lastName}
                          </div>

                          {(person.arabicFirstName || person.arabicLastName) && (
                            <div
                              dir="rtl"
                              style={{
                                color: '#8b1e1e',
                                fontSize: '16px',
                                fontWeight: 800,
                                marginBottom: '6px',
                                textAlign: 'right',
                              }}
                            >
                              {person.arabicFirstName} {person.arabicLastName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          color: '#777',
                          fontSize: '14px',
                          lineHeight: 1.6,
                        }}
                      >
                        {person.phoneNumber || '—'} · {person.email || '—'}
                      </div>

                      <div
                        style={{
                          color: '#8b1e1e',
                          fontSize: '13px',
                          fontWeight: 700,
                          marginTop: '6px',
                        }}
                      >
                        {text.daysOfAttendance}: {person.daysOfAttendance || '—'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}


    </>
  );
}

