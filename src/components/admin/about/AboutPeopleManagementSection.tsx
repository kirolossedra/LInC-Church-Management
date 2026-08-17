import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';

import {
  createAdminAboutPerson,
  deleteAdminAboutPerson,
  getAdminAboutPeople,
  polishAdminAboutProfile,
  reorderAdminAboutPeople,
  updateAdminAboutPerson,
} from '../../../services/administrator';
import type { AboutPerson, AboutPersonInput } from '../../../services/about';

const EMPTY_DRAFT: AboutPersonInput = {
  photoUrl: '',
  nameEn: '',
  nameAr: '',
  roleEn: '',
  roleAr: '',
  descriptionEn: '',
  descriptionAr: '',
};

export default function AboutPeopleManagementSection({
  setStatusMessage,
  setErrorMessage,
}: {
  setStatusMessage: (message: string) => void;
  setErrorMessage: (message: string) => void;
}) {
  const [people, setPeople] = useState<AboutPerson[]>([]);
  const [draft, setDraft] = useState<AboutPersonInput>(EMPTY_DRAFT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void getAdminAboutPeople()
      .then(result => { if (active) setPeople(result.people); })
      .catch(error => { if (active) setErrorMessage(error instanceof Error ? error.message : 'About Us people could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [setErrorMessage]);

  const updateDraft = (field: keyof AboutPersonInput, value: string) => {
    setDraft(current => ({ ...current, [field]: value }));
  };

  const resetEditor = () => {
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
  };

  const editPerson = (person: AboutPerson) => {
    setSelectedId(person.id);
    setDraft({
      photoUrl: person.photoUrl,
      nameEn: person.nameEn,
      nameAr: person.nameAr,
      roleEn: person.roleEn,
      roleAr: person.roleAr,
      descriptionEn: person.descriptionEn,
      descriptionAr: person.descriptionAr,
    });
  };

  const selectPhoto = async (file?: File) => {
    if (!file) return;
    setErrorMessage('');
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Choose a valid image file.');
      return;
    }
    if (file.size > 10_000_000) {
      setErrorMessage('The original portrait must be smaller than 10 MB.');
      return;
    }
    setReadingPhoto(true);
    try {
      updateDraft('photoUrl', await preparePortrait(file));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The portrait could not be prepared.');
    } finally {
      setReadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const savePerson = async () => {
    setStatusMessage('');
    setErrorMessage('');
    if (!draft.photoUrl) return setErrorMessage('Select a portrait before saving.');
    if (!draft.nameEn.trim() && !draft.nameAr.trim()) return setErrorMessage('Enter the person’s name.');
    if (!draft.roleEn.trim() && !draft.roleAr.trim()) return setErrorMessage('Enter the person’s role.');
    setSaving(true);
    try {
      const input = Object.fromEntries(
        Object.entries(draft).map(([key, value]) => [key, value.trim()]),
      ) as unknown as AboutPersonInput;
      const result = selectedId
        ? await updateAdminAboutPerson(selectedId, input)
        : await createAdminAboutPerson(input);
      setPeople(current => selectedId
        ? current.map(person => person.id === selectedId ? result.person : person)
        : [...current, result.person].sort((first, second) => first.order - second.order));
      setStatusMessage(selectedId ? 'The About Us profile was updated.' : 'The person was added to About Us.');
      resetEditor();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The About Us profile could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const polishDescription = async () => {
    setStatusMessage('');
    setErrorMessage('');
    if (!draft.roleEn.trim() && !draft.roleAr.trim() && !draft.descriptionEn.trim() && !draft.descriptionAr.trim()) {
      setErrorMessage('Enter a role or description before asking Bezalel to polish it.');
      return;
    }
    setPolishing(true);
    try {
      const polished = await polishAdminAboutProfile({
        nameEn: draft.nameEn,
        nameAr: draft.nameAr,
        roleEn: draft.roleEn,
        roleAr: draft.roleAr,
        descriptionEn: draft.descriptionEn,
        descriptionAr: draft.descriptionAr,
      });
      setDraft(current => ({ ...current, ...polished }));
      setStatusMessage('Bezalel polished the bilingual role and description. Review them before saving.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Bezalel could not polish this profile.');
    } finally {
      setPolishing(false);
    }
  };

  const removePerson = async (person: AboutPerson) => {
    if (!window.confirm(`Remove ${person.nameEn || person.nameAr} from About Us?`)) return;
    setBusyId(person.id);
    setStatusMessage('');
    setErrorMessage('');
    try {
      await deleteAdminAboutPerson(person.id);
      setPeople(current => current.filter(item => item.id !== person.id).map((item, order) => ({ ...item, order })));
      if (selectedId === person.id) resetEditor();
      setStatusMessage('The person was removed from About Us.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The person could not be removed.');
    } finally {
      setBusyId(null);
    }
  };

  const movePerson = async (personId: string, direction: -1 | 1) => {
    const index = people.findIndex(person => person.id === personId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= people.length) return;
    const previous = people;
    const next = [...people];
    [next[index], next[target]] = [next[target], next[index]];
    const ordered = next.map((person, order) => ({ ...person, order }));
    setPeople(ordered);
    setBusyId(personId);
    try {
      await reorderAdminAboutPeople(ordered.map(person => person.id));
      setStatusMessage('The About Us order was updated.');
    } catch (error) {
      setPeople(previous);
      setErrorMessage(error instanceof Error ? error.message : 'The order could not be updated.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-[2.25rem] border border-[#7a1b1b]/10 bg-[#fffdf9] shadow-[0_22px_70px_rgba(61,25,16,0.10)]">
      <header className="grid gap-6 bg-[#1b0e0e] px-6 py-8 text-white sm:px-9 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f2a900]">Public identity</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold">About Us People</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">Create the people profiles shown on the live About Us page. Administrators review all Bezalel suggestions before saving.</p>
        </div>
        <button type="button" onClick={resetEditor} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#8b1e1e] px-6 font-extrabold transition hover:bg-[#a32929]"><Plus size={18} /> New person</button>
      </header>

      <div className="grid gap-8 p-5 sm:p-8 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-serif text-2xl font-semibold text-[#681919]">Published order</h3>
            <span className="rounded-full bg-[#efe5d8] px-3 py-1 text-xs font-black text-[#681919]">{people.length}/24</span>
          </div>
          {loading ? (
            <div className="grid min-h-52 place-items-center rounded-3xl border border-stone-200 bg-white"><Loader2 className="animate-spin text-[#8b1e1e]" /></div>
          ) : people.length === 0 ? (
            <div className="grid min-h-52 place-items-center rounded-3xl border-2 border-dashed border-stone-200 bg-white p-8 text-center"><div><UserRound className="mx-auto text-stone-300" size={38} /><p className="mt-4 font-bold text-stone-600">No people published yet</p></div></div>
          ) : people.map((person, index) => (
            <article key={person.id} className={`flex items-center gap-4 rounded-3xl border bg-white p-3 transition ${selectedId === person.id ? 'border-[#8b1e1e] shadow-md' : 'border-stone-200'}`}>
              <img src={person.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-[#681919]">{person.nameEn || person.nameAr}</p>
                <p className="truncate text-sm text-stone-500">{person.roleEn || person.roleAr}</p>
              </div>
              <div className="flex gap-1">
                <IconButton label="Move earlier" disabled={index === 0 || busyId === person.id} onClick={() => void movePerson(person.id, -1)}><ArrowUp size={16} /></IconButton>
                <IconButton label="Move later" disabled={index === people.length - 1 || busyId === person.id} onClick={() => void movePerson(person.id, 1)}><ArrowDown size={16} /></IconButton>
                <IconButton label="Edit person" onClick={() => editPerson(person)}><Pencil size={16} /></IconButton>
                <IconButton label="Delete person" disabled={busyId === person.id} onClick={() => void removePerson(person)} danger><Trash2 size={16} /></IconButton>
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-[2rem] border border-[#7a1b1b]/10 bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#a66c18]">{selectedId ? 'Edit profile' : 'New profile'}</p><h3 className="mt-2 font-serif text-3xl font-semibold text-[#681919]">Person details</h3></div>
            {selectedId && <button type="button" onClick={resetEditor} className="text-sm font-bold text-stone-500 underline">Cancel edit</button>}
          </div>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <button type="button" onClick={() => photoInputRef.current?.click()} className="relative grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-[2rem] border-2 border-dashed border-[#8b1e1e]/20 bg-[#f7f0e8] text-[#8b1e1e] transition hover:border-[#8b1e1e]/50">
              {draft.photoUrl ? <img src={draft.photoUrl} alt="Portrait preview" className="h-full w-full object-cover" /> : readingPhoto ? <Loader2 className="animate-spin" /> : <ImagePlus size={30} />}
            </button>
            <div><p className="font-extrabold text-stone-800">Portrait photo</p><p className="mt-1 text-sm leading-6 text-stone-500">Choose a JPG, PNG, or WebP image. It is resized for efficient public loading.</p><button type="button" onClick={() => photoInputRef.current?.click()} className="mt-3 text-sm font-extrabold text-[#8b1e1e] underline">{draft.photoUrl ? 'Replace portrait' : 'Choose portrait'}</button></div>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={event => void selectPhoto(event.target.files?.[0])} />
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Field label="English name" value={draft.nameEn} onChange={value => updateDraft('nameEn', value)} />
            <Field label="Arabic name" value={draft.nameAr} onChange={value => updateDraft('nameAr', value)} dir="rtl" />
            <Field label="English role" value={draft.roleEn} onChange={value => updateDraft('roleEn', value)} />
            <Field label="Arabic role" value={draft.roleAr} onChange={value => updateDraft('roleAr', value)} dir="rtl" />
            <Field label="English description" value={draft.descriptionEn} onChange={value => updateDraft('descriptionEn', value)} multiline />
            <Field label="Arabic description" value={draft.descriptionAr} onChange={value => updateDraft('descriptionAr', value)} multiline dir="rtl" />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled={polishing || saving} onClick={() => void polishDescription()} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-[#a66c18]/25 bg-[#fff8e7] px-5 font-extrabold text-[#7a4b09] transition hover:bg-[#fff1c8] disabled:opacity-50">{polishing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Polish with Bezalel</button>
            <button type="button" disabled={saving || polishing || readingPhoto} onClick={() => void savePerson()} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#8b1e1e] px-5 font-extrabold text-white transition hover:bg-[#721515] disabled:opacity-50">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {selectedId ? 'Save changes' : 'Add to About Us'}</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, multiline = false, dir }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; dir?: 'rtl' }) {
  const classes = 'mt-2 w-full rounded-2xl border border-stone-200 bg-[#fffdf9] px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-[#8b1e1e]/50 focus:ring-4 focus:ring-[#8b1e1e]/5';
  return <label className="block text-sm font-extrabold text-stone-700">{label}{multiline ? <textarea dir={dir} rows={5} value={value} onChange={event => onChange(event.target.value)} className={`${classes} resize-y`} /> : <input dir={dir} value={value} onChange={event => onChange(event.target.value)} className={classes} />}</label>;
}

function IconButton({ label, onClick, disabled, danger = false, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`grid h-9 w-9 place-items-center rounded-xl transition disabled:opacity-30 ${danger ? 'text-red-600 hover:bg-red-50' : 'text-stone-500 hover:bg-stone-100'}`}>{children}</button>;
}

async function preparePortrait(file: File): Promise<string> {
  const source = URL.createObjectURL(file);
  try {
    const image = await loadImage(source);
    const maximumDimension = 900;
    const scale = Math.min(1, maximumDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the portrait.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let result = canvas.toDataURL('image/jpeg', 0.84);
    if (result.length > 1_900_000) result = canvas.toDataURL('image/jpeg', 0.68);
    if (result.length > 2_000_000) throw new Error('The prepared portrait is still too large. Choose a smaller image.');
    return result;
  } finally {
    URL.revokeObjectURL(source);
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected portrait could not be read.'));
    image.src = source;
  });
}
