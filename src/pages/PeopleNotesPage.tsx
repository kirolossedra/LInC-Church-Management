import { useEffect, useState } from 'react';
import { ref, onValue, push } from 'firebase/database';
import { database } from '../firebase';

interface PersonRecord {
  id: string;
  fullName: string;
}

export default function PeopleNotesPage() {
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'peopleNotes/'), snapshot => {
      const data = snapshot.val();
      if (!data) return setPeople([]);
      const parsed = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        fullName: val.fullName || '',
      }));
      setPeople(parsed);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      await push(ref(database, 'peopleNotes/'), {
        fullName: name.trim(),
        createdAt: Date.now(),
      });
      setName('');
      setStatus('Added!');
    } catch (e) {
      setStatus('Error: ' + String(e));
    }
  };

  return (
    <div style={{ padding: 32, fontFamily: 'monospace' }}>
      <h1>People Notes (debug)</h1>

      <div style={{ marginBottom: 16 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Name"
          style={{ marginRight: 8, padding: 8, fontSize: 14 }}
        />
        <button onClick={handleAdd} style={{ padding: '8px 16px' }}>
          Add
        </button>
        {status && <span style={{ marginLeft: 12, color: 'green' }}>{status}</span>}
      </div>

      <ul>
        {people.map(p => (
          <li key={p.id}>{p.fullName}</li>
        ))}
      </ul>
    </div>
  );
}
