import { useEffect, useState } from "react";
import { subscribeMeetings, deleteMeeting } from "../services/firebaseService";
import MeetingModal from "../components/MeetingModal";
import { useLocation } from "react-router-dom";

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [modalState, setModalState] = useState(null);
  const location = useLocation();

  useEffect(() => {
    return subscribeMeetings(setMeetings);
  }, []);

  // If navigated from Submissions with prefill data, open create modal
  useEffect(() => {
    if (location.state?.prefill) {
      setModalState({ mode: "create", prefill: location.state.prefill });
      // Clear state so re-render doesn't re-open
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const now = Date.now();
  const upcoming = meetings
    .filter((m) => m.startDateTime && new Date(m.startDateTime).getTime() >= now)
    .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
  const past = meetings
    .filter((m) => m.startDateTime && new Date(m.startDateTime).getTime() < now)
    .sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime));

  async function handleDelete(id) {
    if (confirm("Delete this meeting?")) {
      await deleteMeeting(id);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Meetings</h1>
        <button
          className="btn btn-primary"
          onClick={() => setModalState({ mode: "create" })}
        >
          + Schedule Meeting
        </button>
      </div>

      <Section title="Upcoming">
        {upcoming.length === 0 ? (
          <p className="empty-state">No upcoming meetings.</p>
        ) : (
          upcoming.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              onEdit={() => setModalState({ mode: "edit", meeting: m })}
              onDelete={() => handleDelete(m.id)}
            />
          ))
        )}
      </Section>

      <Section title="Past">
        {past.length === 0 ? (
          <p className="empty-state">No past meetings.</p>
        ) : (
          past.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              onEdit={() => setModalState({ mode: "edit", meeting: m })}
              onDelete={() => handleDelete(m.id)}
              isPast
            />
          ))
        )}
      </Section>

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

function Section({ title, children }) {
  return (
    <div className="section-card">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function MeetingCard({ meeting, onEdit, onDelete, isPast }) {
  const start = meeting.startDateTime
    ? new Date(meeting.startDateTime).toLocaleString("en-CA", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "—";
  const end = meeting.endDateTime
    ? new Date(meeting.endDateTime).toLocaleTimeString("en-CA", {
        timeStyle: "short",
      })
    : "—";

  return (
    <div className={`meeting-card ${isPast ? "meeting-card--past" : ""}`}>
      <div className="meeting-card-body">
        <div className="meeting-card-title">{meeting.title || "Untitled"}</div>
        <div className="meeting-card-meta">
          <span>📅 {start} – {end}</span>
          {meeting.attendee && <span>👤 {meeting.attendee}</span>}
        </div>
        {meeting.description && (
          <p className="meeting-card-desc">{meeting.description}</p>
        )}
        {meeting.meetLink && (
          <a
            href={meeting.meetLink}
            target="_blank"
            rel="noreferrer"
            className="meet-link-btn"
          >
            🎥 Join Google Meet
          </a>
        )}
      </div>
      <div className="meeting-card-actions">
        <button className="btn btn-ghost btn-sm" onClick={onEdit}>
          Edit
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
