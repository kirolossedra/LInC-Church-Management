import { Camera, ImagePlus, Loader2, RefreshCw, Save, Trash2, UserRound, X } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AttendancePersonForm } from './attendance.types';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendancePersonEditor({ controller }: { controller: AttendanceController }) {
  const {
    selectedPersonId,
    personForm,
    setPersonForm,
    isSavingPerson,
    isReadingPersonPhoto,
    isPersonCameraOpen,
    isStartingPersonCamera,
    personCameraError,
    personPhotoInputRef,
    personCameraCaptureInputRef,
    personCameraVideoRef,
    text,
    closePersonEditor,
    handlePersonPhotoSelected,
    openPersonCamera,
    closePersonCamera,
    switchPersonCamera,
    capturePersonPhotoFromLiveCamera,
    removePersonPhoto,
    handleSavePerson,
  } = controller;

  const updateField = (field: keyof AttendancePersonForm, value: string) => {
    setPersonForm(previous => ({ ...previous, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-5 rounded-[1.6rem] border border-[#7a1b1b]/10 bg-[#faf6f0] p-4 sm:grid-cols-[160px_1fr] sm:p-5">
        <div className="mx-auto h-40 w-40 overflow-hidden rounded-[1.5rem] border border-[#7a1b1b]/15 bg-white shadow-sm">
          {personForm.photoBase64 ? (
            <img src={personForm.photoBase64} alt={text.personPhoto} className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-[#8d211d]"><UserRound size={48} /></span>
          )}
        </div>
        <div className="min-w-0 text-center sm:text-start">
          <h3 className="font-serif text-2xl font-semibold text-[#641414]">{text.personPhoto}</h3>
          <p className="mt-1 text-sm leading-6 text-stone-500">{text.photoDescription}</p>
          <input ref={personPhotoInputRef} type="file" accept="image/*" onChange={handlePersonPhotoSelected} className="hidden" />
          <input ref={personCameraCaptureInputRef} type="file" accept="image/*" capture="environment" onChange={handlePersonPhotoSelected} className="hidden" />
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <ActionButton onClick={() => personPhotoInputRef.current?.click()} disabled={isReadingPersonPhoto} icon={isReadingPersonPhoto ? <Loader2 className="animate-spin" /> : <ImagePlus />} label={isReadingPersonPhoto ? text.readingPhoto : personForm.photoBase64 ? text.replacePhoto : text.selectPhoto} primary />
            <ActionButton onClick={() => personCameraCaptureInputRef.current?.click()} disabled={isReadingPersonPhoto} icon={<Camera />} label={text.takePhoto} />
            <ActionButton onClick={openPersonCamera} disabled={isReadingPersonPhoto} icon={<Camera />} label={text.openLiveCamera} />
            {personForm.photoBase64 && <ActionButton onClick={removePersonPhoto} disabled={isReadingPersonPhoto} icon={<Trash2 />} label={text.removePhoto} danger />}
          </div>
          {personCameraError && !isPersonCameraOpen && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{personCameraError}</p>}
        </div>
      </div>

      {isPersonCameraOpen && (
        <div className="overflow-hidden rounded-[1.6rem] bg-[#171010] p-3 text-white sm:p-4">
          <div className="relative grid min-h-56 place-items-center overflow-hidden rounded-2xl bg-black">
            <video ref={personCameraVideoRef} autoPlay muted playsInline className="max-h-[55vh] w-full object-contain" />
            {isStartingPersonCamera && <span className="absolute inset-0 grid place-items-center bg-black/60"><Loader2 size={34} className="animate-spin" /></span>}
          </div>
          {personCameraError && <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-bold text-red-200">{personCameraError}</p>}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={capturePersonPhotoFromLiveCamera} disabled={isStartingPersonCamera || Boolean(personCameraError)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-[#641414] disabled:opacity-50"><Camera size={17} />{text.capturePhoto}</button>
            <button type="button" onClick={switchPersonCamera} disabled={isStartingPersonCamera} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold disabled:opacity-50"><RefreshCw size={17} />{text.switchCamera}</button>
            <button type="button" onClick={closePersonCamera} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold"><X size={17} />{text.closeCamera}</button>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <FieldGroup title={text.englishNameSection}>
          <Field label={text.firstName} value={personForm.firstName} onChange={value => updateField('firstName', value)} required />
          <Field label={text.lastName} value={personForm.lastName} onChange={value => updateField('lastName', value)} required />
        </FieldGroup>
        <FieldGroup title={text.arabicNameSection} rtl>
          <Field label={text.arabicFirstName} value={personForm.arabicFirstName} onChange={value => updateField('arabicFirstName', value)} rtl />
          <Field label={text.arabicLastName} value={personForm.arabicLastName} onChange={value => updateField('arabicLastName', value)} rtl />
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={text.phoneNumber} value={personForm.phoneNumber} onChange={value => updateField('phoneNumber', value)} type="tel" />
        <Field label={text.email} value={personForm.email} onChange={value => updateField('email', value)} type="email" />
      </div>

      <p className="rounded-2xl bg-[#f5ece4] px-4 py-3 text-xs font-semibold leading-5 text-[#641414]">{text.daysOfAttendance}: {text.daysStoredOnly}</p>

      <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
        <button type="button" onClick={closePersonEditor} disabled={isSavingPerson} className="min-h-12 rounded-xl border border-[#7a1b1b]/15 px-5 text-sm font-extrabold text-[#7a1b1b] disabled:opacity-50">{text.close}</button>
        <button type="button" onClick={() => void handleSavePerson()} disabled={isSavingPerson} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#831f1c] px-6 text-sm font-extrabold text-white shadow-lg disabled:opacity-50">
          {isSavingPerson ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {isSavingPerson ? text.saving : selectedPersonId ? text.updatePerson : text.savePerson}
        </button>
      </div>
    </div>
  );
}

function FieldGroup({ title, children, rtl = false }: { title: string; children: ReactNode; rtl?: boolean }) {
  return <fieldset dir={rtl ? 'rtl' : undefined} className="grid gap-3 rounded-2xl border border-stone-100 bg-white p-4"><legend className="px-2 font-serif text-lg font-semibold text-[#641414]">{title}</legend>{children}</fieldset>;
}

function Field({ label, value, onChange, type = 'text', rtl = false, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; rtl?: boolean; required?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-stone-500">{label}{required ? ' *' : ''}</span><input dir={rtl ? 'rtl' : undefined} type={type} value={value} onChange={event => onChange(event.target.value)} className="min-h-12 w-full rounded-xl border border-stone-200 bg-[#fcfaf7] px-3 text-sm outline-none transition focus:border-[#7a1b1b]/40 focus:ring-4 focus:ring-[#7a1b1b]/5" /></label>;
}

function ActionButton({ onClick, disabled, icon, label, primary = false, danger = false }: { onClick: () => void; disabled: boolean; icon: ReactNode; label: string; primary?: boolean; danger?: boolean }) {
  const color = danger ? 'border-red-200 bg-red-50 text-red-700' : primary ? 'border-[#831f1c] bg-[#831f1c] text-white' : 'border-[#7a1b1b]/15 bg-white text-[#7a1b1b]';
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-extrabold disabled:opacity-50 ${color}`}>{icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>}{label}</button>;
}
