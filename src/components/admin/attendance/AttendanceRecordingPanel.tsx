import { CalendarDays, CheckCircle, ChevronLeft, ChevronRight, ClipboardList, Loader2, Search } from 'lucide-react';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendanceRecordingPanel({ controller }: { controller: AttendanceController }) {
  const { dir, isArabic, activePanel, setActivePanel, people, isLoadingPeople, peopleError, selectedAttendanceDate, attendanceSearchTerm, setAttendanceSearchTerm, isSavingAttendanceForId, text, weekDayLabels, monthLabel, calendarDays, filteredAttendancePeople, moveCalendarMonth, handleSelectAttendanceDate, hasPersonAttendedSelectedDate, handleMarkAttendance } = controller;

  return (
    <>
        {activePanel === 'attendance' && (
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
                  <ClipboardList size={28} />
                  {text.attendanceTitle}
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: '#666',
                    lineHeight: 1.6,
                  }}
                >
                  {text.attendanceDescription}
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
              className="attendance-calendar-card"
              style={{
                border: '1px solid rgba(139, 30, 30, 0.10)',
                borderRadius: '24px',
                padding: '22px',
                background: '#fffaf7',
                marginBottom: '28px',
              }}
            >
              <div
                className="attendance-calendar-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  marginBottom: '18px',
                }}
              >
                <button
                  type="button"
                  onClick={() => moveCalendarMonth('previous')}
                  aria-label={text.previousMonth}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '1px solid rgba(139, 30, 30, 0.16)',
                    background: 'white',
                    color: '#8b1e1e',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {isArabic ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <div
                    className="attendance-month-label"
                    style={{
                      color: '#8b1e1e',
                      fontSize: '24px',
                      fontWeight: 900,
                    }}
                  >
                    {monthLabel}
                  </div>
                  <div
                    style={{
                      color: '#777',
                      fontSize: '13px',
                      fontWeight: 700,
                      marginTop: '4px',
                    }}
                  >
                    {text.sundayOnly}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => moveCalendarMonth('next')}
                  aria-label={text.nextMonth}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '1px solid rgba(139, 30, 30, 0.16)',
                    background: 'white',
                    color: '#8b1e1e',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {isArabic ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
              </div>

              <div
                className="attendance-weekday-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                {weekDayLabels.map(day => (
                  <div
                    key={day}
                    style={{
                      textAlign: 'center',
                      color: '#641414',
                      fontSize: '13px',
                      fontWeight: 900,
                      padding: '8px 4px',
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div
                className="attendance-calendar-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '8px',
                }}
              >
                {calendarDays.map(calendarDay => {
                  const isSelected = selectedAttendanceDate === calendarDay.key;
                  const isSelectable = calendarDay.isCurrentMonth && calendarDay.isSunday;

                  return (
                    <button
                      key={calendarDay.key}
                      type="button"
                      onClick={() => handleSelectAttendanceDate(calendarDay)}
                      disabled={!isSelectable}
                      style={{
                        minHeight: '72px',
                        borderRadius: '18px',
                        border: isSelected
                          ? '2px solid #8b1e1e'
                          : isSelectable
                            ? '1px solid rgba(139, 30, 30, 0.22)'
                            : '1px solid #eee',
                        background: isSelected
                          ? '#8b1e1e'
                          : isSelectable
                            ? 'white'
                            : '#f5f4f0',
                        color: isSelected
                          ? 'white'
                          : isSelectable
                            ? '#8b1e1e'
                            : '#aaa',
                        cursor: isSelectable ? 'pointer' : 'not-allowed',
                        fontSize: '20px',
                        fontWeight: 900,
                        opacity: calendarDay.isCurrentMonth ? 1 : 0.35,
                        boxShadow: isSelected ? '0 8px 24px rgba(139, 30, 30, 0.20)' : 'none',
                      }}
                    >
                      {calendarDay.dayNumber}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                padding: '16px 18px',
                borderRadius: '18px',
                background: selectedAttendanceDate ? '#f8eeee' : '#f5f4f0',
                color: selectedAttendanceDate ? '#641414' : '#666',
                fontWeight: 800,
                marginBottom: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                textAlign: 'center',
              }}
            >
              <CalendarDays size={20} />
              {selectedAttendanceDate
                ? `${text.selectedDay}: ${selectedAttendanceDate}`
                : text.noSelectedDay}
            </div>

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
                value={attendanceSearchTerm}
                onChange={e => setAttendanceSearchTerm(e.target.value)}
                placeholder={text.attendanceSearchPlaceholder}
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

            {!isLoadingPeople && !peopleError && people.length > 0 && filteredAttendancePeople.length === 0 && (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '18px',
                  background: '#f5f4f0',
                  color: '#666',
                  textAlign: 'center',
                }}
              >
                {text.noAttendanceSearchResults}
              </div>
            )}

            {!isLoadingPeople && !peopleError && filteredAttendancePeople.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                }}
              >
                {filteredAttendancePeople.map(person => {
                  const alreadyAttended = hasPersonAttendedSelectedDate(person);
                  const isSavingThisPerson = isSavingAttendanceForId === person.firebaseId;

                  return (
                    <div
                      key={person.firebaseId}
                      className="attendance-person-grid-row"
                      style={{
                        width: '100%',
                        border: alreadyAttended ? '2px solid #15803d' : '1px solid #eee',
                        borderRadius: '18px',
                        padding: '16px',
                        background: alreadyAttended ? '#f0fdf4' : 'white',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                        gap: '16px',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        className="attendance-person-identity"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          minWidth: 0,
                        }}
                      >
                        {person.photoBase64 && (
                          <img
                            className="attendance-person-photo"
                            src={person.photoBase64}
                            alt={`${person.firstName} ${person.lastName}`}
                            style={{
                              width: '84px',
                              height: '84px',
                              flex: '0 0 84px',
                              objectFit: 'cover',
                              borderRadius: '22px',
                              border: alreadyAttended
                                ? '2px solid #15803d'
                                : '2px solid rgba(139, 30, 30, 0.16)',
                              background: '#f5f4f0',
                              boxShadow: '0 6px 18px rgba(73, 20, 20, 0.10)',
                            }}
                          />
                        )}

                        <div
                          style={{
                            minWidth: 0,
                            textAlign: dir === 'rtl' ? 'right' : 'left',
                          }}
                        >
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
                        </div>
                      </div>

                      <button
                        type="button"
                        className="attendance-person-action"
                        onClick={() => handleMarkAttendance(person)}
                        disabled={!selectedAttendanceDate || alreadyAttended || !!isSavingAttendanceForId}
                        style={{
                          minHeight: '48px',
                          borderRadius: '999px',
                          border: alreadyAttended ? '2px solid #15803d' : '2px solid #8b1e1e',
                          background: alreadyAttended ? '#15803d' : '#8b1e1e',
                          color: 'white',
                          padding: '0 18px',
                          fontSize: '14px',
                          fontWeight: 900,
                          cursor: (!selectedAttendanceDate || alreadyAttended || !!isSavingAttendanceForId)
                            ? 'not-allowed'
                            : 'pointer',
                          opacity: (!selectedAttendanceDate && !alreadyAttended) || (!!isSavingAttendanceForId && !isSavingThisPerson)
                            ? 0.55
                            : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isSavingThisPerson ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : alreadyAttended ? (
                          <CheckCircle size={16} />
                        ) : (
                          <ClipboardList size={16} />
                        )}
                        {alreadyAttended ? text.alreadyAttended : text.markAttended}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}


    </>
  );
}

