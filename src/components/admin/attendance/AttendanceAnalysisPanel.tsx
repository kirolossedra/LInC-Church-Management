import { BarChart3, Loader2, Search } from 'lucide-react';
import AttendanceAnalysisCharts from './AttendanceAnalysisCharts';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendanceAnalysisPanel({ controller }: { controller: AttendanceController }) {
  const { dir, activePanel, setActivePanel, people, isLoadingPeople, peopleError, analysisSearchTerm, setAnalysisSearchTerm, setSelectedAnalysisPersonId, text, analysisStartDateKey, sundayDateKeysSinceStart, filteredPersonAttendanceAnalysis, averageAttendancePerSunday } = controller;

  return (
    <>
        {activePanel === 'analysis' && (
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <BarChart3 size={28} />
                  {text.analysisTitle}
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: '#666',
                    lineHeight: 1.6,
                  }}
                >
                  {text.analysisDescription}
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                gap: '14px',
                marginBottom: '26px',
              }}
            >
              <div
                style={{
                  background: '#f8eeee',
                  borderRadius: '20px',
                  padding: '18px',
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                }}
              >
                <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                  {text.analysisStartDate}
                </div>
                <div style={{ color: '#8b1e1e', fontSize: '22px', fontWeight: 900 }}>
                  {analysisStartDateKey}
                </div>
              </div>

              <div
                style={{
                  background: '#f8eeee',
                  borderRadius: '20px',
                  padding: '18px',
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                }}
              >
                <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                  {text.totalSundays}
                </div>
                <div style={{ color: '#8b1e1e', fontSize: '22px', fontWeight: 900 }}>
                  {sundayDateKeysSinceStart.length}
                </div>
              </div>

              <div
                style={{
                  background: '#f8eeee',
                  borderRadius: '20px',
                  padding: '18px',
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                }}
              >
                <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                  {text.totalPeople}
                </div>
                <div style={{ color: '#8b1e1e', fontSize: '22px', fontWeight: 900 }}>
                  {people.length}
                </div>
              </div>

              <div
                style={{
                  background: '#f8eeee',
                  borderRadius: '20px',
                  padding: '18px',
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                }}
              >
                <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                  {text.averageAttendance}
                </div>
                <div style={{ color: '#8b1e1e', fontSize: '22px', fontWeight: 900 }}>
                  {averageAttendancePerSunday}
                </div>
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                marginBottom: '24px',
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
                value={analysisSearchTerm}
                onChange={e => setAnalysisSearchTerm(e.target.value)}
                placeholder={text.analysisSearchPlaceholder}
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
                  marginBottom: '24px',
                }}
              >
                {text.noPeople}
              </div>
            )}

            {!isLoadingPeople && !peopleError && people.length > 0 && filteredPersonAttendanceAnalysis.length === 0 && (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '18px',
                  background: '#f5f4f0',
                  color: '#666',
                  textAlign: 'center',
                  marginBottom: '24px',
                }}
              >
                {text.noAnalysisResults}
              </div>
            )}

            {!isLoadingPeople && !peopleError && filteredPersonAttendanceAnalysis.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                  marginBottom: '30px',
                }}
              >
                {filteredPersonAttendanceAnalysis.map(item => (
                  <button
                    key={item.person.firebaseId}
                    type="button"
                    className="attendance-person-grid-row"
                    onClick={() => setSelectedAnalysisPersonId(item.person.firebaseId)}
                    style={{
                      width: '100%',
                      border: '1px solid #eee',
                      borderRadius: '18px',
                      padding: '16px',
                      background: 'white',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: '16px',
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'inherit',
                    }}
                  >
                    <div style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                      <div
                        style={{
                          color: '#641414',
                          fontSize: '17px',
                          fontWeight: 800,
                          marginBottom: '6px',
                        }}
                      >
                        {item.person.firstName} {item.person.lastName}
                      </div>

                      {(item.person.arabicFirstName || item.person.arabicLastName) && (
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
                          {item.person.arabicFirstName} {item.person.arabicLastName}
                        </div>
                      )}

                      <div
                        style={{
                          color: '#777',
                          fontSize: '14px',
                          lineHeight: 1.6,
                        }}
                      >
                        {item.person.phoneNumber || '—'} · {item.person.email || '—'}
                      </div>

                      <div
                        style={{
                          color: '#8b1e1e',
                          fontSize: '13px',
                          fontWeight: 700,
                          marginTop: '6px',
                        }}
                      >
                        {text.daysOfAttendance}: {item.attendedDates.join(', ') || '—'}
                      </div>
                    </div>

                    <div
                      className="attendance-analysis-stat-card"
                      style={{
                        minWidth: '150px',
                        borderRadius: '18px',
                        background: '#f8eeee',
                        padding: '14px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          color: '#777',
                          fontSize: '12px',
                          fontWeight: 900,
                          marginBottom: '6px',
                        }}
                      >
                        {text.attendanceCount}
                      </div>
                      <div
                        style={{
                          color: '#8b1e1e',
                          fontSize: '28px',
                          fontWeight: 900,
                        }}
                      >
                        {item.attendanceCount}
                      </div>
                      <div
                        style={{
                          color: '#641414',
                          fontSize: '13px',
                          fontWeight: 800,
                          marginTop: '4px',
                        }}
                      >
                        {text.attendanceRate}: {item.attendanceRate}%
                      </div>
                      <div
                        style={{
                          marginTop: '8px',
                          color: '#8b1e1e',
                          fontSize: '12px',
                          fontWeight: 900,
                        }}
                      >
                        {text.viewFullStats}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <AttendanceAnalysisCharts controller={controller} />
          </section>
        )}



    </>
  );
}
