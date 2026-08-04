import { X } from 'lucide-react';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendancePersonalAnalysisModal({ controller }: { controller: AttendanceController }) {
  const { setSelectedAnalysisPersonId, text, sundayDateKeysSinceStart, selectedPersonAttendanceAnalysis, selectedPersonMissedDates, selectedPersonTimeline } = controller;

  return (
    <>
        {selectedPersonAttendanceAnalysis && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
            onClick={() => setSelectedAnalysisPersonId('')}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '1040px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'white',
                borderRadius: '30px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.30)',
                border: '1px solid rgba(139, 30, 30, 0.18)',
              }}
              onClick={event => event.stopPropagation()}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  background: '#8b1e1e',
                  color: 'white',
                  padding: '22px 26px',
                  borderRadius: '30px 30px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 900 }}>
                    {text.personalAnalysis}
                  </h2>
                  <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.78)', fontWeight: 700 }}>
                    {selectedPersonAttendanceAnalysis.person.firstName} {selectedPersonAttendanceAnalysis.person.lastName}
                    {(selectedPersonAttendanceAnalysis.person.arabicFirstName || selectedPersonAttendanceAnalysis.person.arabicLastName)
                      ? ` — ${selectedPersonAttendanceAnalysis.person.arabicFirstName} ${selectedPersonAttendanceAnalysis.person.arabicLastName}`
                      : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAnalysisPersonId('')}
                  aria-label={text.close}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.35)',
                    background: 'rgba(255,255,255,0.12)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <X size={22} />
                </button>
              </div>

              <div style={{ padding: '26px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
                    gap: '14px',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ background: '#f8eeee', borderRadius: '20px', padding: '18px' }}>
                    <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                      {text.attendanceCount}
                    </div>
                    <div style={{ color: '#8b1e1e', fontSize: '30px', fontWeight: 900 }}>
                      {selectedPersonAttendanceAnalysis.attendanceCount}
                    </div>
                  </div>

                  <div style={{ background: '#f8eeee', borderRadius: '20px', padding: '18px' }}>
                    <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                      {text.missedCount}
                    </div>
                    <div style={{ color: '#8b1e1e', fontSize: '30px', fontWeight: 900 }}>
                      {selectedPersonMissedDates.length}
                    </div>
                  </div>

                  <div style={{ background: '#f8eeee', borderRadius: '20px', padding: '18px' }}>
                    <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                      {text.attendanceRate}
                    </div>
                    <div style={{ color: '#8b1e1e', fontSize: '30px', fontWeight: 900 }}>
                      {selectedPersonAttendanceAnalysis.attendanceRate}%
                    </div>
                  </div>

                  <div style={{ background: '#f8eeee', borderRadius: '20px', padding: '18px' }}>
                    <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                      {text.totalSundays}
                    </div>
                    <div style={{ color: '#8b1e1e', fontSize: '30px', fontWeight: 900 }}>
                      {sundayDateKeysSinceStart.length}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                    gap: '22px',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '24px', padding: '22px', background: '#fffaf7' }}>
                    <h3 style={{ margin: '0 0 8px', color: '#8b1e1e', fontSize: '21px', fontWeight: 900 }}>
                      {text.dateAttendanceLine}
                    </h3>
                    <div style={{ color: '#777', fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>
                      {text.presentValue} · {text.absentValue}
                    </div>

                    <svg viewBox="0 0 560 260" role="img" style={{ width: '100%', minHeight: '260px' }}>
                      <line x1="58" y1="38" x2="58" y2="198" stroke="#ddd" strokeWidth="2" />
                      <line x1="58" y1="198" x2="526" y2="198" stroke="#ddd" strokeWidth="2" />
                      <line x1="58" y1="62" x2="526" y2="62" stroke="#e7d8d8" strokeWidth="1.5" strokeDasharray="6 6" />
                      <line x1="58" y1="176" x2="526" y2="176" stroke="#e7d8d8" strokeWidth="1.5" strokeDasharray="6 6" />

                      <text x="34" y="67" textAnchor="middle" fontSize="14" fill="#15803d" fontWeight="900">1</text>
                      <text x="34" y="181" textAnchor="middle" fontSize="14" fill="#b91c1c" fontWeight="900">0</text>

                      <polyline
                        fill="none"
                        stroke="#8b1e1e"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={selectedPersonTimeline.map((item, index) => {
                          const x = selectedPersonTimeline.length === 1
                            ? 292
                            : 58 + (index / (selectedPersonTimeline.length - 1)) * 468;
                          const y = item.attended ? 62 : 176;
                          return `${x},${y}`;
                        }).join(' ')}
                      />

                      {selectedPersonTimeline.map((item, index) => {
                        const x = selectedPersonTimeline.length === 1
                          ? 292
                          : 58 + (index / (selectedPersonTimeline.length - 1)) * 468;
                        const y = item.attended ? 62 : 176;
                        const shouldShowDate = selectedPersonTimeline.length <= 8 || index % Math.ceil(selectedPersonTimeline.length / 8) === 0 || index === selectedPersonTimeline.length - 1;

                        return (
                          <g key={item.dateKey}>
                            <circle
                              cx={x}
                              cy={y}
                              r="7"
                              fill={item.attended ? '#15803d' : '#b91c1c'}
                              stroke="white"
                              strokeWidth="2"
                            />
                            {shouldShowDate && (
                              <text
                                x={x}
                                y="224"
                                textAnchor="middle"
                                fontSize="10"
                                fill="#641414"
                                fontWeight="800"
                                transform={`rotate(-38 ${x} 224)`}
                              >
                                {item.dateKey.slice(5)}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#15803d', fontWeight: 900, fontSize: '13px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#15803d' }} />
                        {text.present}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#b91c1c', fontWeight: 900, fontSize: '13px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#b91c1c' }} />
                        {text.absent}
                      </span>
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '24px', padding: '22px', background: '#fffaf7' }}>
                    <h3 style={{ margin: '0 0 16px', color: '#8b1e1e', fontSize: '21px', fontWeight: 900 }}>
                      {text.attendanceDonut}
                    </h3>

                    <div style={{ display: 'grid', placeItems: 'center' }}>
                      <svg viewBox="0 0 240 240" role="img" style={{ width: '100%', maxWidth: '260px' }}>
                        <circle
                          cx="120"
                          cy="120"
                          r="82"
                          fill="none"
                          stroke="#fee2e2"
                          strokeWidth="34"
                        />
                        <circle
                          cx="120"
                          cy="120"
                          r="82"
                          fill="none"
                          stroke="#15803d"
                          strokeWidth="34"
                          strokeLinecap="round"
                          pathLength="100"
                          strokeDasharray={`${selectedPersonAttendanceAnalysis.attendanceRate} ${100 - selectedPersonAttendanceAnalysis.attendanceRate}`}
                          transform="rotate(-90 120 120)"
                        />
                        <text x="120" y="112" textAnchor="middle" fontSize="34" fill="#8b1e1e" fontWeight="900">
                          {selectedPersonAttendanceAnalysis.attendanceRate}%
                        </text>
                        <text x="120" y="140" textAnchor="middle" fontSize="13" fill="#641414" fontWeight="900">
                          {text.attendanceRate}
                        </text>
                      </svg>
                    </div>

                    <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#15803d', fontWeight: 900 }}>
                        <span>{text.attendedPercent}</span>
                        <span>{selectedPersonAttendanceAnalysis.attendanceCount} / {sundayDateKeysSinceStart.length}</span>
                      </div>
                      <div style={{ height: '14px', background: '#f5f4f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${selectedPersonAttendanceAnalysis.attendanceRate}%`, height: '100%', background: '#15803d', borderRadius: '999px' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#b91c1c', fontWeight: 900 }}>
                        <span>{text.missedPercent}</span>
                        <span>{selectedPersonMissedDates.length} / {sundayDateKeysSinceStart.length}</span>
                      </div>
                      <div style={{ height: '14px', background: '#f5f4f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(0, 100 - selectedPersonAttendanceAnalysis.attendanceRate)}%`, height: '100%', background: '#b91c1c', borderRadius: '999px' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '24px', padding: '22px', background: '#fffaf7' }}>
                    <h3 style={{ margin: '0 0 16px', color: '#8b1e1e', fontSize: '21px', fontWeight: 900 }}>
                      {text.cumulativeAttendanceLine}
                    </h3>
                    <svg viewBox="0 0 420 220" role="img" style={{ width: '100%', minHeight: '220px' }}>
                      <line x1="38" y1="20" x2="38" y2="184" stroke="#ddd" strokeWidth="2" />
                      <line x1="38" y1="184" x2="398" y2="184" stroke="#ddd" strokeWidth="2" />
                      <polyline
                        fill="none"
                        stroke="#8b1e1e"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={selectedPersonTimeline.map((item, index) => {
                          const x = selectedPersonTimeline.length === 1
                            ? 218
                            : 38 + (index / (selectedPersonTimeline.length - 1)) * 360;
                          const y = 184 - (item.cumulativeAttendance / Math.max(1, selectedPersonAttendanceAnalysis.attendanceCount)) * 150;
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                      {selectedPersonTimeline.map((item, index) => {
                        const x = selectedPersonTimeline.length === 1
                          ? 218
                          : 38 + (index / (selectedPersonTimeline.length - 1)) * 360;
                        const y = 184 - (item.cumulativeAttendance / Math.max(1, selectedPersonAttendanceAnalysis.attendanceCount)) * 150;
                        return (
                          <g key={item.dateKey}>
                            <circle cx={x} cy={y} r="5" fill="#8b1e1e" />
                            <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#641414" fontWeight="800">
                              {item.cumulativeAttendance}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '24px', padding: '22px', background: '#fffaf7' }}>
                    <h3 style={{ margin: '0 0 16px', color: '#8b1e1e', fontSize: '21px', fontWeight: 900 }}>
                      {text.attendanceTimeline}
                    </h3>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {selectedPersonTimeline.map(item => (
                        <div key={item.dateKey}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#641414', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>
                            <span>{item.dateKey}</span>
                            <span>{item.attended ? text.present : text.absent}</span>
                          </div>
                          <div style={{ height: '18px', borderRadius: '999px', background: '#f5f4f0', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: item.attended ? '100%' : '18%',
                                height: '100%',
                                borderRadius: '999px',
                                background: item.attended ? '#15803d' : '#b91c1c',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                    gap: '18px',
                  }}
                >
                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '22px', padding: '18px', background: 'white' }}>
                    <h3 style={{ margin: '0 0 14px', color: '#8b1e1e', fontSize: '19px', fontWeight: 900 }}>
                      {text.attendedSundays}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(selectedPersonAttendanceAnalysis.attendedDates.length ? selectedPersonAttendanceAnalysis.attendedDates : ['—']).map(dateKey => (
                        <span key={dateKey} style={{ background: '#f0fdf4', color: '#15803d', borderRadius: '999px', padding: '8px 12px', fontSize: '13px', fontWeight: 800 }}>
                          {dateKey}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '22px', padding: '18px', background: 'white' }}>
                    <h3 style={{ margin: '0 0 14px', color: '#8b1e1e', fontSize: '19px', fontWeight: 900 }}>
                      {text.missedSundays}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(selectedPersonMissedDates.length ? selectedPersonMissedDates : ['—']).map(dateKey => (
                        <span key={dateKey} style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '999px', padding: '8px 12px', fontSize: '13px', fontWeight: 800 }}>
                          {dateKey}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}

