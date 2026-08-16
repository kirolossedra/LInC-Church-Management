import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Archive,
  BarChart3,
  ClipboardCheck,
  GalleryHorizontalEnd,
  LayoutDashboard,
  MessageCircleQuestion,
  UsersRound,
  UserRoundCog,
  X,
} from 'lucide-react';
import { get, onValue, ref, set, update } from 'firebase/database';
import { database } from '../../firebase';
import { useAdministratorAccess } from './hooks';
import {
  AdminHierarchySection,
  AdminAreaNavigation,
  AdminCommandHeader,
  AdminOverview,
  AssessmentFormsSection,
  AssessmentUserLinkageSection,
  AttendanceAdminSection,
  CarouselManagementSection,
  type AdminArea,
  type AdminSectionId,
} from './components';
import { LincArchivesSection } from './archives';
import PeopleAccessMigrationSection from './people-access/PeopleAccessMigrationSection';
import { NextGenQaSessionsAdmin } from '../pastor/nextgen';
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
  const prefersReducedMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState<AdminSectionId>('overview');
  const [nextGenQaExpanded, setNextGenQaExpanded] = useState(true);
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
    canManageArchives,
    canManageNextGenQa,
    canManagePeopleAccess,
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
      setActiveSection('overview');
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

  const adminAreas = useMemo<AdminArea[]>(() => [
    {
      id: 'overview',
      label: 'Overview',
      eyebrow: 'Command center',
      description: 'See every administration area available to this account.',
      icon: LayoutDashboard,
      accent: 'bg-[#e8d9c7] text-[#5f1919]',
    },
    ...(isChief ? [{
      id: 'hierarchy' as const,
      label: 'Administrators',
      eyebrow: 'Chief controls',
      description: 'Allocate authority and manage the administrator hierarchy.',
      icon: UsersRound,
      accent: 'bg-[#f2a900] text-[#2b1805]',
    }] : []),
    ...(canManageAssessmentForms ? [{
      id: 'assessment' as const,
      label: 'Spiritual Program',
      eyebrow: 'Assessment operations',
      description: 'Control forms and connect assessment responses to people.',
      icon: ClipboardCheck,
      accent: 'bg-[#761b1b] text-white',
    }] : []),
    ...(canManageCarousel ? [{
      id: 'carousel' as const,
      label: 'Landing Media',
      eyebrow: 'Public experience',
      description: 'Curate the visual story presented on the LINC One landing page.',
      icon: GalleryHorizontalEnd,
      accent: 'bg-[#d9c5aa] text-[#5f1919]',
    }] : []),
    ...(canManageAttendance ? [{
      id: 'attendance' as const,
      label: 'Attendance',
      eyebrow: 'People operations',
      description: 'Record participation and understand ministry attendance patterns.',
      icon: BarChart3,
      accent: 'bg-[#265a52] text-white',
    }] : []),
    ...(canManageNextGenQa ? [{
      id: 'nextgen-qa' as const,
      label: 'NextGen QA',
      eyebrow: 'Session integrity',
      description: 'Create QA sessions, review voters, and control when participation is open.',
      icon: MessageCircleQuestion,
      accent: 'bg-[#a66c18] text-white',
    }] : []),
    ...(canManagePeopleAccess ? [{
      id: 'people-access' as const,
      label: 'People Access',
      eyebrow: 'Firebase transition',
      description: 'Register People Notes accounts, repair missing emails, and retry individual migrations.',
      icon: UserRoundCog,
      accent: 'bg-[#57314f] text-white',
    }] : []),
    ...(canManageArchives ? [{
      id: 'archives' as const,
      label: 'LInC Archives',
      eyebrow: 'Institutional memory',
      description: 'Build a navigable home for ministry records, files, and resources.',
      icon: Archive,
      accent: 'bg-[#1b1010] text-white',
    }] : []),
  ], [canManageArchives, canManageAssessmentForms, canManageAttendance, canManageCarousel, canManageNextGenQa, canManagePeopleAccess, isChief]);

  const visibleActiveSection = adminAreas.some(area => area.id === activeSection)
    ? activeSection
    : 'overview';

  useEffect(() => {
    if (!canManageCarousel) return;

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
    if (!canManageAssessmentForms) return;

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
    <div className="min-h-screen overflow-x-hidden bg-[#f2ede4] text-stone-900">
      <AdminCommandHeader
        isChief={isChief}
        email={adminAccount?.email || authUser.email || 'Unknown email'}
        areaCount={Math.max(0, adminAreas.length - 1)}
        onLogout={handleLogout}
      />
      <AdminAreaNavigation
        areas={adminAreas}
        activeSection={visibleActiveSection}
        onSelect={setActiveSection}
      />

      <main className="mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
        {(statusMessage || errorMessage) && (
          <div
            className={`mb-7 flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 shadow-sm ${
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
        <AnimatePresence mode="wait">
          <motion.div
            key={visibleActiveSection}
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -10 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            {visibleActiveSection === 'overview' && (
              <AdminOverview areas={adminAreas} onSelect={setActiveSection} />
            )}

            {visibleActiveSection === 'hierarchy' && isChief && (
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

            {visibleActiveSection === 'assessment' && canManageAssessmentForms && (
              <div className="space-y-6">
                <AssessmentFormsSection
                  loadingAssessmentForms={loadingAssessmentForms}
                  assessmentFormStates={assessmentFormStates}
                  savingAssessmentFormId={savingAssessmentFormId}
                  handleAssessmentFormStateChange={handleAssessmentFormStateChange}
                />
                <AssessmentUserLinkageSection />
              </div>
            )}

            {visibleActiveSection === 'carousel' && canManageCarousel && (
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

            {visibleActiveSection === 'attendance' && canManageAttendance && <AttendanceAdminSection />}
            {visibleActiveSection === 'nextgen-qa' && canManageNextGenQa && (
              <NextGenQaSessionsAdmin
                expanded={nextGenQaExpanded}
                onToggleExpanded={() => setNextGenQaExpanded(current => !current)}
              />
            )}
            {visibleActiveSection === 'archives' && canManageArchives && <LincArchivesSection />}
            {visibleActiveSection === 'people-access' && canManagePeopleAccess && <PeopleAccessMigrationSection />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
