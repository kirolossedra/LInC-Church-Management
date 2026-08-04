import { Camera, ImagePlus, Loader2, RefreshCw, Save, Trash2, UserPlus, X } from 'lucide-react';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendancePersonEditor({ controller }: { controller: AttendanceController }) {
  const { selectedPersonId, personForm, setPersonForm, isSavingPerson, isReadingPersonPhoto, isPersonCameraOpen, isStartingPersonCamera, personCameraError, personPhotoInputRef, personCameraCaptureInputRef, personCameraVideoRef, text, closePersonEditor, handlePersonPhotoSelected, openPersonCamera, closePersonCamera, switchPersonCamera, capturePersonPhotoFromLiveCamera, removePersonPhoto, handleSavePerson } = controller;

  return (
    <>
(
    <>
            <div
              className="attendance-photo-editor"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '22px',
                marginBottom: '28px',
                padding: '20px',
                borderRadius: '22px',
                border: '1px solid rgba(139, 30, 30, 0.12)',
                background: '#fffafa',
              }}
            >
              <div
                className="attendance-photo-preview"
                style={{
                  width: '150px',
                  height: '150px',
                  flex: '0 0 150px',
                  overflow: 'hidden',
                  borderRadius: '24px',
                  border: personForm.photoBase64
                    ? '2px solid rgba(139, 30, 30, 0.22)'
                    : '2px dashed rgba(139, 30, 30, 0.24)',
                  background: personForm.photoBase64 ? '#f5f4f0' : '#f8eeee',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {personForm.photoBase64 ? (
                  <img
                    src={personForm.photoBase64}
                    alt={text.personPhoto}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <UserPlus size={42} color="#8b1e1e" />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: '0 0 8px',
                    color: '#641414',
                    fontSize: '18px',
                    fontWeight: 800,
                  }}
                >
                  {text.personPhoto}
                </h3>

                <p
                  style={{
                    margin: '0 0 14px',
                    color: '#666',
                    fontSize: '14px',
                    lineHeight: 1.6,
                  }}
                >
                  {text.photoDescription}
                </p>

                <input
                  ref={personPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePersonPhotoSelected}
                  style={{ display: 'none' }}
                />

                <input
                  ref={personCameraCaptureInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePersonPhotoSelected}
                  style={{ display: 'none' }}
                />

                <div
                  className="attendance-camera-actions"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => personPhotoInputRef.current?.click()}
                    disabled={isReadingPersonPhoto}
                    style={{
                      minHeight: '44px',
                      border: 'none',
                      borderRadius: '999px',
                      background: '#8b1e1e',
                      color: 'white',
                      padding: '0 18px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: isReadingPersonPhoto ? 'not-allowed' : 'pointer',
                      opacity: isReadingPersonPhoto ? 0.65 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isReadingPersonPhoto ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <ImagePlus size={17} />
                    )}
                    {isReadingPersonPhoto
                      ? text.readingPhoto
                      : personForm.photoBase64
                        ? text.replacePhoto
                        : text.selectPhoto}
                  </button>

                  <button
                    type="button"
                    onClick={() => personCameraCaptureInputRef.current?.click()}
                    disabled={isReadingPersonPhoto}
                    style={{
                      minHeight: '44px',
                      border: '2px solid #8b1e1e',
                      borderRadius: '999px',
                      background: 'white',
                      color: '#8b1e1e',
                      padding: '0 18px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: isReadingPersonPhoto ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Camera size={17} />
                    {text.takePhoto}
                  </button>

                  <button
                    type="button"
                    onClick={openPersonCamera}
                    disabled={isReadingPersonPhoto}
                    style={{
                      minHeight: '44px',
                      border: '1px solid rgba(139, 30, 30, 0.20)',
                      borderRadius: '999px',
                      background: '#fff7f7',
                      color: '#641414',
                      padding: '0 18px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: isReadingPersonPhoto ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Camera size={17} />
                    {text.openLiveCamera}
                  </button>

                  {personForm.photoBase64 && (
                    <button
                      type="button"
                      onClick={removePersonPhoto}
                      disabled={isReadingPersonPhoto}
                      style={{
                        minHeight: '44px',
                        border: '1px solid #fecaca',
                        borderRadius: '999px',
                        background: '#fff1f2',
                        color: '#b91c1c',
                        padding: '0 18px',
                        fontSize: '14px',
                        fontWeight: 800,
                        cursor: isReadingPersonPhoto ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <Trash2 size={17} />
                      {text.removePhoto}
                    </button>
                  )}
                </div>

                {personCameraError && !isPersonCameraOpen && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      background: '#fff1f2',
                      color: '#b91c1c',
                      fontSize: '13px',
                      fontWeight: 700,
                      lineHeight: 1.5,
                    }}
                  >
                    {personCameraError}
                  </div>
                )}
              </div>
            </div>

            {isPersonCameraOpen && (
              <div
                className="attendance-live-camera"
                style={{
                  marginBottom: '28px',
                  padding: '18px',
                  borderRadius: '22px',
                  background: '#181818',
                  color: 'white',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.22)',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '18px',
                    background: '#050505',
                    minHeight: '220px',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <video
                    ref={personCameraVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      maxHeight: '58vh',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />

                  {isStartingPersonCamera && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(0, 0, 0, 0.56)',
                      }}
                    >
                      <Loader2 size={34} className="animate-spin" />
                    </div>
                  )}
                </div>

                {personCameraError && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      background: 'rgba(185, 28, 28, 0.22)',
                      color: '#fecaca',
                      fontSize: '13px',
                      fontWeight: 700,
                      lineHeight: 1.5,
                    }}
                  >
                    {personCameraError}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '10px',
                    marginTop: '14px',
                  }}
                >
                  <button
                    type="button"
                    onClick={capturePersonPhotoFromLiveCamera}
                    disabled={isStartingPersonCamera || !!personCameraError}
                    style={{
                      minHeight: '46px',
                      border: 'none',
                      borderRadius: '999px',
                      background: 'white',
                      color: '#641414',
                      padding: '0 20px',
                      fontSize: '14px',
                      fontWeight: 900,
                      cursor:
                        isStartingPersonCamera || !!personCameraError
                          ? 'not-allowed'
                          : 'pointer',
                      opacity:
                        isStartingPersonCamera || !!personCameraError ? 0.55 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Camera size={18} />
                    {text.capturePhoto}
                  </button>

                  <button
                    type="button"
                    onClick={switchPersonCamera}
                    disabled={isStartingPersonCamera}
                    style={{
                      minHeight: '46px',
                      border: '1px solid rgba(255, 255, 255, 0.38)',
                      borderRadius: '999px',
                      background: 'transparent',
                      color: 'white',
                      padding: '0 18px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: isStartingPersonCamera ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <RefreshCw size={17} />
                    {text.switchCamera}
                  </button>

                  <button
                    type="button"
                    onClick={closePersonCamera}
                    style={{
                      minHeight: '46px',
                      border: '1px solid rgba(255, 255, 255, 0.38)',
                      borderRadius: '999px',
                      background: 'transparent',
                      color: 'white',
                      padding: '0 18px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <X size={17} />
                    {text.closeCamera}
                  </button>
                </div>
              </div>
            )}

            <h3
              style={{
                margin: '0 0 16px',
                color: '#641414',
                fontSize: '18px',
                fontWeight: 800,
              }}
            >
              {text.englishNameSection}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.firstName}
                </label>
                <input
                  type="text"
                  value={personForm.firstName}
                  onChange={e => setPersonForm(prev => ({ ...prev, firstName: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.lastName}
                </label>
                <input
                  type="text"
                  value={personForm.lastName}
                  onChange={e => setPersonForm(prev => ({ ...prev, lastName: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                  }}
                />
              </div>
            </div>

            <h3
              style={{
                margin: '0 0 16px',
                color: '#641414',
                fontSize: '18px',
                fontWeight: 800,
              }}
            >
              {text.arabicNameSection}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.arabicFirstName}
                </label>
                <input
                  type="text"
                  value={personForm.arabicFirstName}
                  onChange={e => setPersonForm(prev => ({ ...prev, arabicFirstName: e.target.value }))}
                  dir="rtl"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                    textAlign: 'right',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.arabicLastName}
                </label>
                <input
                  type="text"
                  value={personForm.arabicLastName}
                  onChange={e => setPersonForm(prev => ({ ...prev, arabicLastName: e.target.value }))}
                  dir="rtl"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                    textAlign: 'right',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.phoneNumber}
                </label>
                <input
                  type="tel"
                  value={personForm.phoneNumber}
                  onChange={e => setPersonForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.email}
                </label>
                <input
                  type="email"
                  value={personForm.email}
                  onChange={e => setPersonForm(prev => ({ ...prev, email: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '16px',
                padding: '14px 16px',
                borderRadius: '16px',
                background: '#f8eeee',
                color: '#641414',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              {text.daysOfAttendance}: {text.daysStoredOnly}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '22px',
              }}
            >
              <button
                type="button"
                onClick={handleSavePerson}
                disabled={isSavingPerson}
                style={{
                  width: '100%',
                  minHeight: '54px',
                  border: 'none',
                  borderRadius: '999px',
                  background: '#8b1e1e',
                  color: 'white',
                  fontSize: '17px',
                  fontWeight: 800,
                  cursor: isSavingPerson ? 'not-allowed' : 'pointer',
                  opacity: isSavingPerson ? 0.65 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 24px rgba(139, 30, 30, 0.22)',
                }}
              >
                {isSavingPerson ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSavingPerson
                  ? text.saving
                  : selectedPersonId
                    ? text.updatePerson
                    : text.savePerson}
              </button>

              <button
                type="button"
                onClick={closePersonEditor}
                style={{
                  width: '100%',
                  minHeight: '50px',
                  border: '2px solid #8b1e1e',
                  borderRadius: '999px',
                  background: 'white',
                  color: '#8b1e1e',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {text.close}
              </button>
            </div>
    </>
  )
    </>
  );
}
