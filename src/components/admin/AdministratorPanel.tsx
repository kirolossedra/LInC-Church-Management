import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, X } from 'lucide-react';
import { get, onValue, ref, set, update } from 'firebase/database';
import { database } from '../../firebase';
import { useAdministratorAccess } from './hooks';
import {
  AdminHierarchySection,
  AssessmentFormsSection,
  AssessmentUserLinkageSection,
  AttendanceAdminSection,
  CarouselManagementSection,
  NoAuthorityCard,
} from './components';
import {
  AdminApprovalScreen,
  AdminLoadingScreen,
  AdminLoginScreen,
} from './AdminAccessScreens';
import {
  ASSESSMENT_FORM_DEFINITIONS,
  CAROUSEL_PATH,
  MAX_CAROUSEL_PHOTOS,
  MAX_IMAGE_SIZE_BYTES,
} from './admin.constants';
import type {
  AssessmentFormState,
  CarouselPhoto,
  PendingUpload,
} from './admin.types';
import {
  assessmentFormTitle,
  createPhotoId,
  fileToDataUrl,
  humanizeIdentifier,
  parsePhotos,
} from './admin.utils';
import {
  getAssessmentFormStates,
  updateAssessmentFormState,
  type AssessmentFormId,
} from '../../services/assessment';

export default function AdministratorPanel() {
  const [carouselEnabled, setCarouselEnabled] = useState(true);
  const [photos, setPhotos] = useState<CarouselPhoto[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  const [assessmentFormStates, setAssessmentFormStates] = useState<
    Record<string, AssessmentFormState>
  >({});
  const [loadingAssessmentForms, setLoadingAssessmentForms] = useState(false);
  const [savingAssessmentFormId, setSavingAssessmentFormId] = useState<
    string | null
  >(null);

  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    email,
    setEmail,
    password,
    setPassword,
    loginError,
    showPassword,
    setShowPassword,
    isAuthResolving,
    isSigningIn,
    isInitializingAdmin,
    authUser,
    adminAccount,
    authorityDrafts,
    savingAdminUid,
    isChief,
    isUnlocked,
    canManageAssessmentForms,
    canManageCarousel,
    canManageAttendance,
    sortedAdminAccounts,
    handleLogin,
    handleLogout,
    updateAuthorityDraft,
    handleSaveAdminAuthority,
    handleSuspendAdmin,
  } = useAdministratorAccess({
    setStatusMessage,
    setErrorMessage,
    onLogoutReset: () => {
      setPhotos([]);
      setPendingUploads([]);
      setAssessmentFormStates({});
      setSavingAssessmentFormId(null);
    },
  });

  const totalStoredSize = useMemo(
    () => photos.reduce((total, photo) => total + photo.url.length, 0),
    [photos]
  );

  const formattedStoredSize = useMemo(() => {
    const bytes = Math.ceil((totalStoredSize * 3) / 4);

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, [totalStoredSize]);

  useEffect(() => {
    if (!canManageCarousel) {
      setLoadingSettings(false);
      setPhotos([]);
      setPendingUploads([]);
      return;
    }

    setLoadingSettings(true);
    setErrorMessage('');

    const carouselRef = ref(database, CAROUSEL_PATH);

    const unsubscribe = onValue(
      carouselRef,
      (snapshot) => {
        const value = snapshot.val() as
          | {
              enabled?: unknown;
              photos?: unknown;
            }
          | null;

        setCarouselEnabled(value?.enabled !== false);
        setPhotos(parsePhotos(value?.photos));
        setLoadingSettings(false);
      },
      (error) => {
        console.error('Failed to load carousel settings:', error);
        setErrorMessage('The carousel settings could not be loaded from Firebase.');
        setLoadingSettings(false);
      }
    );

    return unsubscribe;
  }, [canManageCarousel]);

  useEffect(() => {
    if (!canManageAssessmentForms) {
      setLoadingAssessmentForms(false);
      setAssessmentFormStates({});
      return;
    }

    setLoadingAssessmentForms(true);

    void getAssessmentFormStates()
      .then(({ forms }) => setAssessmentFormStates(forms))
      .catch((error) => {
        console.error('Failed to load assessment-form controls:', error);
        setAssessmentFormStates({});
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'The assessment-form controls could not be loaded.'
        );
      })
      .finally(() => setLoadingAssessmentForms(false));
  }, [canManageAssessmentForms]);

  const clearMessages = () => {
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleAssessmentFormStateChange = async (
    formId: string,
    nextState: AssessmentFormState
  ) => {
    clearMessages();

    const previousState = assessmentFormStates[formId] || 'active';

    setAssessmentFormStates((current) => ({
      ...current,
      [formId]: nextState,
    }));
    setSavingAssessmentFormId(formId);

    try {
      await updateAssessmentFormState(
        formId as AssessmentFormId,
        nextState
      );

      const form = ASSESSMENT_FORM_DEFINITIONS.find(
        (definition) => definition.id === formId
      );
      const formName = form
        ? assessmentFormTitle(form, 'en')
        : humanizeIdentifier(formId);

      const stateDescription =
        nextState === 'active'
          ? 'visible and clickable'
          : nextState === 'disabled'
            ? 'visible but unavailable'
            : 'hidden';

      setStatusMessage(`${formName} is now ${stateDescription}.`);
    } catch (error) {
      console.error('Failed to update assessment-form state:', error);

      setAssessmentFormStates((current) => ({
        ...current,
        [formId]: previousState,
      }));
      setErrorMessage('The assessment-form state could not be updated.');
    } finally {
      setSavingAssessmentFormId(null);
    }
  };

  const handleVisibilityChange = async (enabled: boolean) => {
    clearMessages();

    const previousValue = carouselEnabled;
    setCarouselEnabled(enabled);
    setSavingVisibility(true);

    try {
      await update(ref(database, CAROUSEL_PATH), {
        enabled,
        updatedAt: Date.now(),
      });

      setStatusMessage(
        enabled
          ? 'The landing-page carousel is now visible.'
          : 'The landing-page carousel is now hidden.'
      );
    } catch (error) {
      console.error('Failed to update carousel visibility:', error);
      setCarouselEnabled(previousValue);
      setErrorMessage('The carousel visibility could not be updated.');
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleFilesSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    clearMessages();

    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (selectedFiles.length === 0) return;

    const availableSlots =
      MAX_CAROUSEL_PHOTOS - photos.length - pendingUploads.length;

    if (availableSlots <= 0) {
      setErrorMessage(
        `The carousel already contains the maximum of ${MAX_CAROUSEL_PHOTOS} photos.`
      );
      return;
    }

    const acceptedFiles = selectedFiles.slice(0, availableSlots);
    const rejectedMessages: string[] = [];
    const uploads: PendingUpload[] = [];

    for (const file of acceptedFiles) {
      if (!file.type.startsWith('image/')) {
        rejectedMessages.push(`${file.name}: unsupported file type.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        rejectedMessages.push(
          `${file.name}: larger than ${(MAX_IMAGE_SIZE_BYTES / 1_000_000).toFixed(1)} MB.`
        );
        continue;
      }

      try {
        const dataUrl = await fileToDataUrl(file);

        uploads.push({
          id: createPhotoId(),
          fileName: file.name,
          dataUrl,
          altEn: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
          altAr: '',
        });
      } catch (error) {
        console.error(`Failed to read ${file.name}:`, error);
        rejectedMessages.push(`${file.name}: could not be read.`);
      }
    }

    if (uploads.length > 0) {
      setPendingUploads((current) => [...current, ...uploads]);
    }

    if (selectedFiles.length > availableSlots) {
      rejectedMessages.push(
        `Only ${availableSlots} more photo${availableSlots === 1 ? '' : 's'} can be added.`
      );
    }

    if (rejectedMessages.length > 0) {
      setErrorMessage(rejectedMessages.join(' '));
    }
  };

  const updatePendingUpload = (
    id: string,
    field: 'altEn' | 'altAr',
    value: string
  ) => {
    setPendingUploads((current) =>
      current.map((upload) =>
        upload.id === id ? { ...upload, [field]: value } : upload
      )
    );
  };

  const removePendingUpload = (id: string) => {
    setPendingUploads((current) =>
      current.filter((upload) => upload.id !== id)
    );
  };

  const uploadPendingPhotos = async () => {
    if (pendingUploads.length === 0) return;

    clearMessages();
    setSavingPhotos(true);

    try {
      const snapshot = await get(ref(database, `${CAROUSEL_PATH}/photos`));
      const currentPhotos = parsePhotos(snapshot.val());
      const now = Date.now();

      const photoUpdates: Record<string, CarouselPhoto> = {};

      pendingUploads.forEach((upload, index) => {
        const order = currentPhotos.length + index;

        photoUpdates[upload.id] = {
          id: upload.id,
          url: upload.dataUrl,
          altEn: upload.altEn.trim(),
          altAr: upload.altAr.trim(),
          order,
          createdAt: now,
          updatedAt: now,
        };
      });

      await update(ref(database, `${CAROUSEL_PATH}/photos`), photoUpdates);
      await update(ref(database, CAROUSEL_PATH), {
        updatedAt: now,
      });

      setPendingUploads([]);
      setStatusMessage(
        `${photoUpdates ? Object.keys(photoUpdates).length : 0} photo${
          Object.keys(photoUpdates).length === 1 ? '' : 's'
        } uploaded successfully.`
      );
    } catch (error) {
      console.error('Failed to upload carousel photos:', error);
      setErrorMessage(
        'The selected photos could not be uploaded to Firebase. Large Base64 images may exceed the database write limit.'
      );
    } finally {
      setSavingPhotos(false);
    }
  };

  const updateStoredPhotoText = (
    id: string,
    field: 'altEn' | 'altAr',
    value: string
  ) => {
    setPhotos((current) =>
      current.map((photo) =>
        photo.id === id ? { ...photo, [field]: value } : photo
      )
    );
  };

  const saveStoredPhotoText = async (photo: CarouselPhoto) => {
    clearMessages();

    try {
      await update(ref(database, `${CAROUSEL_PATH}/photos/${photo.id}`), {
        altEn: photo.altEn.trim(),
        altAr: photo.altAr.trim(),
        updatedAt: Date.now(),
      });

      setStatusMessage('The photo description was saved.');
    } catch (error) {
      console.error('Failed to save photo text:', error);
      setErrorMessage('The photo description could not be saved.');
    }
  };

  const savePhotoOrder = async (orderedPhotos: CarouselPhoto[]) => {
    const updates: Record<string, number> = {};

    orderedPhotos.forEach((photo, index) => {
      updates[`${photo.id}/order`] = index;
    });

    await update(ref(database, `${CAROUSEL_PATH}/photos`), updates);
  };

  const movePhoto = async (photoId: string, direction: -1 | 1) => {
    clearMessages();

    const currentIndex = photos.findIndex((photo) => photo.id === photoId);
    const targetIndex = currentIndex + direction;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= photos.length
    ) {
      return;
    }

    const reordered = [...photos];
    const [movedPhoto] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedPhoto);

    const normalized = reordered.map((photo, index) => ({
      ...photo,
      order: index,
    }));

    setPhotos(normalized);

    try {
      await savePhotoOrder(normalized);
      setStatusMessage('The carousel photo order was updated.');
    } catch (error) {
      console.error('Failed to reorder photos:', error);
      setErrorMessage('The photo order could not be saved.');
    }
  };

  const deletePhoto = async (photo: CarouselPhoto) => {
    clearMessages();

    const confirmed = window.confirm(
      'Delete this photo from the landing-page carousel?'
    );

    if (!confirmed) return;

    setDeletingPhotoId(photo.id);

    try {
      await set(
        ref(database, `${CAROUSEL_PATH}/photos/${photo.id}`),
        null
      );

      const remainingPhotos = photos
        .filter((currentPhoto) => currentPhoto.id !== photo.id)
        .map((currentPhoto, index) => ({
          ...currentPhoto,
          order: index,
        }));

      if (remainingPhotos.length > 0) {
        await savePhotoOrder(remainingPhotos);
      }

      setPhotos(remainingPhotos);
      setStatusMessage('The photo was deleted.');
    } catch (error) {
      console.error('Failed to delete carousel photo:', error);
      setErrorMessage('The photo could not be deleted.');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  if (isAuthResolving || (authUser && isInitializingAdmin && !adminAccount)) {
    return (
      <AdminLoadingScreen
        message={
          isAuthResolving
            ? 'Checking Firebase Authentication'
            : 'Preparing administrator access'
        }
      />
    );
  }

  if (!authUser) {
    return (
      <AdminLoginScreen
        email={email}
        password={password}
        showPassword={showPassword}
        isSigningIn={isSigningIn}
        loginError={loginError}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onTogglePassword={() => setShowPassword((current) => !current)}
        onSubmit={handleLogin}
      />
    );
  }

  if (!isUnlocked) {
    return (
      <AdminApprovalScreen
        isSuspended={adminAccount?.status === 'suspended'}
        email={authUser.email || adminAccount?.email || 'Unknown email'}
        loginError={loginError}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0] text-stone-900">
      <header className="border-b border-[#8b1e1e]/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.22em] text-[#8b1e1e]/55">
              LINC Administration
            </p>
            <h1 className="text-3xl font-extrabold text-[#641414]">
              Administrator Panel
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Manage landing-page content, assessment forms, and attendance operations.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 sm:text-right">
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                    isChief
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-[#f8eeee] text-[#8b1e1e]'
                  }`}
                >
                  {isChief ? 'Chief' : 'Administrator'}
                </span>
                <span className="break-all text-sm font-bold text-stone-700">
                  {adminAccount?.email || authUser.email}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-[#8b1e1e]/20 bg-white px-5 text-sm font-bold text-[#8b1e1e] transition hover:bg-[#f8eeee]"
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-7 sm:px-6 sm:py-10">
        {(statusMessage || errorMessage) && (
          <div
            className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 ${
              errorMessage
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <p className="text-sm font-semibold">
              {errorMessage || statusMessage}
            </p>

            <button
              type="button"
              onClick={clearMessages}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition hover:bg-black/5"
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {isChief && (
          <AdminHierarchySection
            chiefEmail={adminAccount?.email || authUser.email || 'Unknown email'}
            sortedAdminAccounts={sortedAdminAccounts}
            authorityDrafts={authorityDrafts}
            savingAdminUid={savingAdminUid}
            updateAuthorityDraft={updateAuthorityDraft}
            handleSaveAdminAuthority={handleSaveAdminAuthority}
            handleSuspendAdmin={handleSuspendAdmin}
          />
        )}

        {!isChief &&
          !canManageAssessmentForms &&
          !canManageCarousel &&
          !canManageAttendance && <NoAuthorityCard />}

        {canManageAssessmentForms && (
          <>
            <AssessmentFormsSection
              loadingAssessmentForms={loadingAssessmentForms}
              assessmentFormStates={assessmentFormStates}
              savingAssessmentFormId={savingAssessmentFormId}
              handleAssessmentFormStateChange={handleAssessmentFormStateChange}
            />
            <AssessmentUserLinkageSection />
          </>
        )}

        {canManageCarousel && (
          <CarouselManagementSection
            carouselEnabled={carouselEnabled}
            loadingSettings={loadingSettings}
            savingVisibility={savingVisibility}
            handleVisibilityChange={handleVisibilityChange}
            pendingUploads={pendingUploads}
            photos={photos}
            formattedStoredSize={formattedStoredSize}
            fileInputRef={fileInputRef}
            handleFilesSelected={handleFilesSelected}
            removePendingUpload={removePendingUpload}
            updatePendingUpload={updatePendingUpload}
            uploadPendingPhotos={uploadPendingPhotos}
            savingPhotos={savingPhotos}
            updateStoredPhotoText={updateStoredPhotoText}
            saveStoredPhotoText={saveStoredPhotoText}
            movePhoto={movePhoto}
            deletePhoto={deletePhoto}
            deletingPhotoId={deletingPhotoId}
          />
        )}

        {canManageAttendance && <AttendanceAdminSection />}

      </main>
    </div>
  );
}
