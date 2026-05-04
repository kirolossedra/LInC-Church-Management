import { useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { subscribeMeetings } from "../services/firebaseService";
import MeetingModal from "../components/MeetingModal";

export default function CalendarPage() {
  const [meetings, setMeetings] = useState([]);
  const [modalState, setModalState] = useState(null); // null | { mode, meeting? }

  useEffect(() => {
    return subscribeMeetings(setMeetings);
  }, []);

  const calendarEvents = meetings.map((m) => ({
    id: m.id,
    title: m.title || "Meeting",
    start: m.startDateTime,
    end: m.endDateTime,
    extendedProps: { meeting: m },
    color: m.meetLink ? "#1a73e8" : "#8b1e1e",
  }));

  const handleDateClick = useCallback((info) => {
    // Pre-fill the new meeting with the clicked date at 10:00
    const date = info.dateStr;
    setModalState({
      mode: "create",
      prefill: {
        startDateTime: `${date}T10:00`,
        endDateTime: `${date}T11:00`,
      },
    });
  }, []);

  const handleEventClick = useCallback((info) => {
    const meeting = info.event.extendedProps.meeting;
    setModalState({ mode: "edit", meeting });
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
        <button
          className="btn btn-primary"
          onClick={() => setModalState({ mode: "create" })}
        >
          + New Meeting
        </button>
      </div>

      <div className="calendar-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={calendarEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          editable={false}
          selectable={true}
        />
      </div>

      <div className="calendar-legend">
        <span>
          <span
            className="legend-dot"
            style={{ background: "#1a73e8" }}
          />
          Has Google Meet link
        </span>
        <span>
          <span
            className="legend-dot"
            style={{ background: "#8b1e1e" }}
          />
          No Meet link yet
        </span>
      </div>

      {modalState && (
        <MeetingModal
          mode={modalState.mode}
          meeting={modalState.meeting}
          prefill={modalState.prefill}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
