import { BarChart3, TrendingUp } from 'lucide-react';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendanceAnalysisCharts({ controller }: { controller: AttendanceController }) {
  const { text, weeklyAttendanceSummary, maxWeeklyAttendanceCount, topAttendanceAnalysis, maxPersonAttendanceCount, attendanceCountHistogram, maxAttendanceCountHistogramPeople, attendanceRateHistogram, maxAttendanceRateHistogramPeople } = controller;

  return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: '22px',
              }}
            >
              <div
                style={{
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                  borderRadius: '24px',
                  padding: '22px',
                  background: '#fffaf7',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 18px',
                    color: '#8b1e1e',
                    fontSize: '21px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <TrendingUp size={22} />
                  {text.weeklyAttendancePlot}
                </h3>

                {weeklyAttendanceSummary.every(item => item.attendedCount === 0) && (
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: '18px',
                      background: '#f5f4f0',
                      color: '#666',
                      textAlign: 'center',
                    }}
                  >
                    {text.noAttendanceData}
                  </div>
                )}

                {!weeklyAttendanceSummary.every(item => item.attendedCount === 0) && (
                  <div
                    style={{
                      display: 'grid',
                      gap: '12px',
                    }}
                  >
                    {weeklyAttendanceSummary.map(item => (
                      <div key={item.dateKey}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '10px',
                            color: '#641414',
                            fontSize: '13px',
                            fontWeight: 800,
                            marginBottom: '6px',
                          }}
                        >
                          <span>{item.dateKey}</span>
                          <span>{item.attendedCount}</span>
                        </div>
                        <div
                          style={{
                            height: '16px',
                            borderRadius: '999px',
                            background: '#f5f4f0',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.max(4, (item.attendedCount / maxWeeklyAttendanceCount) * 100)}%`,
                              height: '100%',
                              borderRadius: '999px',
                              background: '#8b1e1e',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                  borderRadius: '24px',
                  padding: '22px',
                  background: '#fffaf7',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 18px',
                    color: '#8b1e1e',
                    fontSize: '21px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <BarChart3 size={22} />
                  {text.topAttendeesPlot}
                </h3>

                {topAttendanceAnalysis.every(item => item.attendanceCount === 0) && (
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: '18px',
                      background: '#f5f4f0',
                      color: '#666',
                      textAlign: 'center',
                    }}
                  >
                    {text.noAttendanceData}
                  </div>
                )}

                {!topAttendanceAnalysis.every(item => item.attendanceCount === 0) && (
                  <div
                    style={{
                      display: 'grid',
                      gap: '12px',
                    }}
                  >
                    {topAttendanceAnalysis.map(item => {
                      const displayName = `${item.person.firstName} ${item.person.lastName}`.trim() || '—';

                      return (
                        <div key={item.person.firebaseId}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: '10px',
                              color: '#641414',
                              fontSize: '13px',
                              fontWeight: 800,
                              marginBottom: '6px',
                            }}
                          >
                            <span>{displayName}</span>
                            <span>{item.attendanceCount}</span>
                          </div>
                          <div
                            style={{
                              height: '16px',
                              borderRadius: '999px',
                              background: '#f5f4f0',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.max(4, (item.attendanceCount / maxPersonAttendanceCount) * 100)}%`,
                                height: '100%',
                                borderRadius: '999px',
                                background: '#8b1e1e',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}


              <div
                style={{
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                  borderRadius: '24px',
                  padding: '22px',
                  background: '#fffaf7',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 18px',
                    color: '#8b1e1e',
                    fontSize: '21px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <TrendingUp size={22} />
                  {text.weeklyAttendanceLine}
                </h3>

                {weeklyAttendanceSummary.every(item => item.attendedCount === 0) && (
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: '18px',
                      background: '#f5f4f0',
                      color: '#666',
                      textAlign: 'center',
                    }}
                  >
                    {text.noAttendanceData}
                  </div>
                )}

                {!weeklyAttendanceSummary.every(item => item.attendedCount === 0) && (
                  <svg viewBox="0 0 420 220" role="img" style={{ width: '100%', minHeight: '220px' }}>
                    <line x1="38" y1="20" x2="38" y2="184" stroke="#ddd" strokeWidth="2" />
                    <line x1="38" y1="184" x2="398" y2="184" stroke="#ddd" strokeWidth="2" />
                    <polyline
                      fill="none"
                      stroke="#8b1e1e"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={weeklyAttendanceSummary.map((item, index) => {
                        const x = weeklyAttendanceSummary.length === 1
                          ? 218
                          : 38 + (index / (weeklyAttendanceSummary.length - 1)) * 360;
                        const y = 184 - (item.attendedCount / maxWeeklyAttendanceCount) * 150;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    {weeklyAttendanceSummary.map((item, index) => {
                      const x = weeklyAttendanceSummary.length === 1
                        ? 218
                        : 38 + (index / (weeklyAttendanceSummary.length - 1)) * 360;
                      const y = 184 - (item.attendedCount / maxWeeklyAttendanceCount) * 150;

                      return (
                        <g key={item.dateKey}>
                          <circle cx={x} cy={y} r="5" fill="#8b1e1e" />
                          <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fill="#641414" fontWeight="700">
                            {item.attendedCount}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>

              <div
                style={{
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                  borderRadius: '24px',
                  padding: '22px',
                  background: '#fffaf7',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 18px',
                    color: '#8b1e1e',
                    fontSize: '21px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <BarChart3 size={22} />
                  {text.attendanceHistogram}
                </h3>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {attendanceCountHistogram.map(item => (
                    <div key={item.attendanceCount}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#641414',
                          fontSize: '13px',
                          fontWeight: 800,
                          marginBottom: '6px',
                        }}
                      >
                        <span>{item.attendanceCount} {text.attendedLabel}</span>
                        <span>{item.peopleCount}</span>
                      </div>
                      <div style={{ height: '18px', borderRadius: '999px', background: '#f5f4f0', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.max(4, (item.peopleCount / maxAttendanceCountHistogramPeople) * 100)}%`,
                            height: '100%',
                            borderRadius: '999px',
                            background: '#8b1e1e',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                  borderRadius: '24px',
                  padding: '22px',
                  background: '#fffaf7',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 18px',
                    color: '#8b1e1e',
                    fontSize: '21px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <BarChart3 size={22} />
                  {text.attendanceRateHistogram}
                </h3>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {attendanceRateHistogram.map(item => (
                    <div key={item.label}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#641414',
                          fontSize: '13px',
                          fontWeight: 800,
                          marginBottom: '6px',
                        }}
                      >
                        <span>{item.label}</span>
                        <span>{item.peopleCount}</span>
                      </div>
                      <div style={{ height: '18px', borderRadius: '999px', background: '#f5f4f0', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.max(4, (item.peopleCount / maxAttendanceRateHistogramPeople) * 100)}%`,
                            height: '100%',
                            borderRadius: '999px',
                            background: '#8b1e1e',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </div>
  );
}

