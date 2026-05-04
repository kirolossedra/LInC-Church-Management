import { useState, useEffect } from "react";
import {
  createMeeting,
  updateMeeting,
} from "../services/firebaseService";
import {
  loadGoogleApi,
  authorizeGoogle,
  createMeetEvent,
  GOOGLE_CLIENT_ID,
} from "../services/googleMeet";

const GOOGLE_CONFIGURED =
  GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

const EMPTY_FORM = {
  title: "",
  attendee: "",
  attendeeEmail: "",
  description: "",
  startDateTime: "",
  endDateTime: "",
  meetLink: "",
};

export default function MeetingModal({ mode, meeting, prefill, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (mode === "edit" && meeting) {
      setForm({
        title: meeting.title || "",
        attendee: meeting.attendee || "",
        attendeeEmail: meeting.attendeeEmail || "",
        description: meeting.description || "",
        startDateTime: meeting.startDateTime || "",
        endDateTime: meeting.endDateTime || "",
        meetLink: meeting.meetLink || "",
      });
    } else if (prefill) {
      setForm((prev) => ({ ...prev, ...prefill }));
    }

    // Pre-load Google API in the background
    if (GOOGLE_CONFIGURED) {
      loadGoogleApi()
        .then(() => setGoogleReady(true))
        .catch(() => setGoogleReady(false));
    }
  }, [mode, meeting, prefill]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateMeet() {
    if (!form.startDateTime || !form.endDateTime) {
      setError("Please set start and end date/time before creating a Meet.");
      return;
    }
    setGoogleLoading(true);
    setError("");
    try {
      await authorizeGoogle();
      const attendeeEmails = form.attendeeEmail
        ? [form.attendeeEmail]
        : [];
      const event = await createMeetEvent({
        summary: form.title || "LINC Meeting",
        description: form.description,
        startDateTime: form.startDateTime,
        endDateTime: form.endDateTime,
        attendeeEmails,
      });
      const meetLink =
        event.hangoutLink ||
        event.conferenceData?.entryPoints?.[0]?.uri ||
        "";
      setForm((prev) => ({ ...prev, meetLink }));
    } catch (err) {
      setError("Failed to create Google Meet. Check your Google API credentials.");
      console.error(err);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.startDateTime || !form.endDateTime) {
      setError("Title, start date/time, and end date/time are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (mode === "edit" && meeting?.id) {
        await updateMeeting(meeting.id, form);
      } else {
        await createMeeting(form);
      }
      onClose();
    } catch (err) {
      setError("Failed to save meeting. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{mode === "edit" ? "Edit Meeting" : "Schedule Meeting"}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <FormField label="Meeting Title *" htmlFor="title">
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="e.g. Discipleship Meeting with John"
            />
          </FormField>

          <FormField label="Attendee Name" htmlFor="attendee">
            <input
              id="attendee"
              name="attendee"
              type="text"
              value={form.attendee}
              onChange={handleChange}
              placeholder="Full name"
            />
          </FormField>

          <FormField label="Attendee Email" htmlFor="attendeeEmail">
            <input
              id="attendeeEmail"
              name="attendeeEmail"
              type="email"
              value={form.attendeeEmail}
              onChange={handleChange}
              placeholder="attendee@example.com"
            />
          </FormField>

          <div className="form-row">
            <FormField label="Start Date & Time *" htmlFor="startDateTime">
              <input
                id="startDateTime"
                name="startDateTime"
                type="datetime-local"
                value={form.startDateTime}
                onChange={handleChange}
                required
              />
            </FormField>

            <FormField label="End Date & Time *" htmlFor="endDateTime">
              <input
                id="endDateTime"
                name="endDateTime"
                type="datetime-local"
                value={form.endDateTime}
                onChange={handleChange}
                required
              />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="description">
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Notes about this meeting…"
            />
          </FormField>

          <FormField label="Google Meet Link" htmlFor="meetLink">
            <div className="meet-link-row">
              <input
                id="meetLink"
                name="meetLink"
                type="url"
                value={form.meetLink}
                onChange={handleChange}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
              />
              {GOOGLE_CONFIGURED ? (
                <button
                  type="button"
                  className="btn btn-google"
                  onClick={handleCreateMeet}
                  disabled={googleLoading || !googleReady}
                  title={
                    !googleReady
                      ? "Loading Google API…"
                      : "Create a Google Meet and get the link automatically"
                  }
                >
                  {googleLoading ? "Creating…" : "🎥 Create Meet"}
                </button>
              ) : (
                <span className="meet-config-hint">
                  Configure Google API keys in{" "}
                  <code>src/services/googleMeet.js</code>
                </span>
              )}
            </div>
          </FormField>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? "Saving…"
                : mode === "edit"
                ? "Save Changes"
                : "Schedule Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, htmlFor, children }) {
  return (
    <div className="form-group">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
