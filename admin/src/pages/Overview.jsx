import { useEffect, useState } from "react";
import { subscribeSubmissions, subscribeMeetings } from "../services/firebaseService";
import { Link } from "react-router-dom";

export default function Overview() {
  const [submissions, setSubmissions] = useState([]);
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    const unsubSub = subscribeSubmissions(setSubmissions);
    const unsubMeet = subscribeMeetings(setMeetings);
    return () => {
      unsubSub();
      unsubMeet();
    };
  }, []);

  const now = Date.now();
  const upcoming = meetings.filter(
    (m) => m.startDateTime && new Date(m.startDateTime).getTime() >= now
  );
  const past = meetings.filter(
    (m) => m.startDateTime && new Date(m.startDateTime).getTime() < now
  );

  const recentSubmissions = submissions.slice(0, 5);

  return (
    <div className="page">
      <h1 className="page-title">Overview</h1>

      <div className="stats-grid">
        <StatCard
          icon="📋"
          label="Total Submissions"
          value={submissions.length}
          link="/dashboard/submissions"
        />
        <StatCard
          icon="📅"
          label="Upcoming Meetings"
          value={upcoming.length}
          link="/dashboard/calendar"
        />
        <StatCard
          icon="🎥"
          label="Past Meetings"
          value={past.length}
          link="/dashboard/meetings"
        />
      </div>

      <div className="section-card">
        <div className="section-header">
          <h2>Recent Submissions</h2>
          <Link to="/dashboard/submissions" className="link-more">
            View all →
          </Link>
        </div>
        {recentSubmissions.length === 0 ? (
          <p className="empty-state">No submissions yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Date Submitted</th>
                <th>Primary Gift</th>
                <th>Ministry</th>
              </tr>
            </thead>
            <tbody>
              {recentSubmissions.map((s) => (
                <SubmissionRow key={s.id} submission={s} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section-card">
        <div className="section-header">
          <h2>Upcoming Meetings</h2>
          <Link to="/dashboard/calendar" className="link-more">
            Calendar →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="empty-state">No upcoming meetings scheduled.</p>
        ) : (
          <ul className="meeting-list">
            {upcoming.slice(0, 5).map((m) => (
              <MeetingItem key={m.id} meeting={m} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, link }) {
  return (
    <Link to={link} className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </Link>
  );
}

function SubmissionRow({ submission }) {
  const name = submission.fields?.trainee?.fullName?.value || "—";
  const submitted = submission.createdAtEasternTime || "—";
  const primaryGift = submission.results?.English?.primaryGift || "—";
  const ministry = submission.results?.English?.recommendedMinistry || "—";

  return (
    <tr>
      <td>{name}</td>
      <td>{submitted}</td>
      <td>{primaryGift}</td>
      <td>{ministry}</td>
    </tr>
  );
}

function MeetingItem({ meeting }) {
  const start = meeting.startDateTime
    ? new Date(meeting.startDateTime).toLocaleString("en-CA", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
  return (
    <li className="meeting-item">
      <div className="meeting-title">{meeting.title || "Untitled Meeting"}</div>
      <div className="meeting-meta">
        <span>📅 {start}</span>
        {meeting.attendee && <span>👤 {meeting.attendee}</span>}
        {meeting.meetLink && (
          <a href={meeting.meetLink} target="_blank" rel="noreferrer" className="meet-link">
            Join Meet 🔗
          </a>
        )}
      </div>
    </li>
  );
}
