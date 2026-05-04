import { useEffect, useState } from "react";
import { subscribeSubmissions } from "../services/firebaseService";
import { useNavigate } from "react-router-dom";

export default function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    return subscribeSubmissions(setSubmissions);
  }, []);

  const filtered = submissions.filter((s) => {
    const name = s.fields?.trainee?.fullName?.value?.toLowerCase() || "";
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Submissions</h1>
        <span className="badge">{submissions.length} total</span>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No submissions found.</p>
      ) : (
        <div className="submission-list">
          {filtered.map((s) => (
            <SubmissionCard
              key={s.id}
              submission={s}
              isExpanded={expanded === s.id}
              onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
              onSchedule={() =>
                navigate("/dashboard/meetings", {
                  state: { prefill: submissionPrefill(s) },
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function submissionPrefill(s) {
  const name = s.fields?.trainee?.fullName?.value || "";
  const primaryGift = s.results?.English?.primaryGift || "";
  const ministry = s.results?.English?.recommendedMinistry || "";
  return {
    title: `Meeting with ${name}`,
    attendee: name,
    description: `Primary Gift: ${primaryGift}\nRecommended Ministry: ${ministry}`,
  };
}

function SubmissionCard({ submission, isExpanded, onToggle, onSchedule }) {
  const s = submission;
  const trainee = s.fields?.trainee || {};
  const name = trainee.fullName?.value || "Unknown";
  const date = s.createdAtEasternTime || "—";
  const lang = s.interfaceLanguageUsed || "—";
  const primaryGift = s.results?.English?.primaryGift || "—";
  const secondaryGift = s.results?.English?.secondaryGift || "—";
  const ministry = s.results?.English?.recommendedMinistry || "—";

  const giftScores = s.scores?.gifts || {};
  const ministryScores = s.scores?.ministry || {};

  const giftLabels = {
    A: "Apostolic",
    B: "Prophetic",
    C: "Evangelistic",
    D: "Pastoral",
    E: "Teaching",
  };
  const ministryLabels = {
    F1: "Prayer & Intercession",
    F2: "Evangelism & Outreach",
    F3: "Bible Teaching & Discipleship",
    F4: "Spiritual Care & Follow-up",
    F5: "Worship",
    F6: "Children's Ministry",
    F7: "Youth Ministry",
    F8: "Media & Technology",
    F9: "Administration & Oversight",
    F10: "Hospitality & Welcome",
  };

  return (
    <div className="submission-card">
      <div className="submission-card-header" onClick={onToggle}>
        <div className="submission-name">
          <strong>{name}</strong>
          <span className="submission-date">{date}</span>
        </div>
        <div className="submission-summary">
          <span className="tag tag-gift">{primaryGift}</span>
          <span className="tag tag-ministry">{ministry}</span>
          <span className="chevron">{isExpanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="submission-details">
          <div className="detail-grid">
            <InfoRow label="Language" value={lang} />
            <InfoRow label="Primary Gift" value={primaryGift} />
            <InfoRow label="Secondary Gift" value={secondaryGift} />
            <InfoRow label="Recommended Ministry" value={ministry} />
            {Object.entries(trainee).map(([key, item]) => (
              <InfoRow
                key={key}
                label={item.fieldEnglish || key}
                value={item.value || "—"}
              />
            ))}
          </div>

          <h3>Gift Scores</h3>
          <div className="score-bars">
            {Object.entries(giftScores).map(([key, score]) => (
              <ScoreBar
                key={key}
                label={giftLabels[key] || key}
                score={score}
                max={25}
              />
            ))}
          </div>

          <h3>Ministry Scores</h3>
          <div className="score-bars">
            {Object.entries(ministryScores).map(([key, score]) => (
              <ScoreBar
                key={key}
                label={ministryLabels[key] || key}
                score={score}
                max={5}
              />
            ))}
          </div>

          <FaithVisionSection submission={s} />

          <button className="btn btn-primary mt-16" onClick={onSchedule}>
            📅 Schedule Meeting
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

function ScoreBar({ label, score, max }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="score-bar-row">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%` }}
          title={`${score}/${max}`}
        />
      </div>
      <span className="score-bar-value">
        {score}/{max}
      </span>
    </div>
  );
}

function FaithVisionSection({ submission }) {
  const faith = submission.fields?.faith || {};
  const vision = submission.fields?.vision || {};
  const faithEntries = Object.entries(faith);
  const visionEntries = Object.entries(vision);

  if (faithEntries.length === 0 && visionEntries.length === 0) return null;

  return (
    <>
      {faithEntries.length > 0 && (
        <>
          <h3>Faith Journey</h3>
          {faithEntries.map(([key, item]) => (
            <div key={key} className="qa-item">
              <p className="qa-question">{item.questionEnglish}</p>
              <p className="qa-answer">{item.answer || "—"}</p>
            </div>
          ))}
        </>
      )}
      {visionEntries.length > 0 && (
        <>
          <h3>Calling & Vision</h3>
          {visionEntries.map(([key, item]) => (
            <div key={key} className="qa-item">
              <p className="qa-question">{item.questionEnglish}</p>
              <p className="qa-answer">{item.answer || "—"}</p>
            </div>
          ))}
        </>
      )}
    </>
  );
}
