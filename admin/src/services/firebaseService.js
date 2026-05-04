import { database } from "../firebase";
import {
  ref,
  onValue,
  push,
  set,
  remove,
  serverTimestamp,
} from "firebase/database";

// ─── Submissions (read-only from the form) ────────────────────────────────────

/** Subscribe to all form submissions. Calls callback with array of submissions. */
export function subscribeSubmissions(callback) {
  const submissionsRef = ref(database, "form/");
  const unsubscribe = onValue(submissionsRef, (snapshot) => {
    const data = snapshot.val() || {};
    const list = Object.entries(data).map(([id, record]) => ({
      id,
      ...record,
    }));
    // Sort newest first
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  });
  return unsubscribe;
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

/** Subscribe to all meetings. Calls callback with array of meetings. */
export function subscribeMeetings(callback) {
  const meetingsRef = ref(database, "meetings/");
  const unsubscribe = onValue(meetingsRef, (snapshot) => {
    const data = snapshot.val() || {};
    const list = Object.entries(data).map(([id, record]) => ({
      id,
      ...record,
    }));
    callback(list);
  });
  return unsubscribe;
}

/**
 * Create a new meeting record in Firebase.
 * @param {object} meeting
 */
export async function createMeeting(meeting) {
  const meetingsRef = ref(database, "meetings/");
  const newRef = push(meetingsRef);
  await set(newRef, {
    ...meeting,
    createdAt: serverTimestamp(),
  });
  return newRef.key;
}

/**
 * Update an existing meeting.
 * @param {string} id
 * @param {object} updates
 */
export async function updateMeeting(id, updates) {
  const meetingRef = ref(database, `meetings/${id}`);
  await set(meetingRef, { ...updates, updatedAt: serverTimestamp() });
}

/**
 * Delete a meeting.
 * @param {string} id
 */
export async function deleteMeeting(id) {
  await remove(ref(database, `meetings/${id}`));
}
