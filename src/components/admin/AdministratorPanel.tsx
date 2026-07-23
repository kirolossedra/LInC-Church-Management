import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  LockKeyhole,
  LogOut,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { get, onValue, ref, set, update } from 'firebase/database';
import { database } from '../../firebase';

const ADMIN_PASSWORD = '9999';
const CAROUSEL_PATH = 'landingPage/carousel';
const MAX_IMAGE_SIZE_BYTES = 1_500_000;
const MAX_CAROUSEL_PHOTOS = 12;

interface CarouselPhoto {
  id: string;
  url: string;
  altEn: string;
  altAr: string;
  order: number;
  createdAt?: number;
  updatedAt?: number;
}

interface StoredCarouselPhoto {
  url?: unknown;
  dataUrl?: unknown;
  altEn?: unknown;
  altAr?: unknown;
  order?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface PendingUpload {
  id: string;
  fileName: string;
  dataUrl: string;
  altEn: string;
  altAr: string;
}

function normalizeStoredPhoto(
  id: string,
  value: StoredCarouselPhoto | string,
  fallbackOrder: number
): CarouselPhoto | null {
  if (typeof value === 'string') {
    if (!value.trim()) return null;

    return {
      id,
      url: value,
      altEn: '',
      altAr: '',
      order: fallbackOrder,
    };
  }

  if (!value || typeof value !== 'object') return null;

  const possibleUrl =
    typeof value.url === 'string'
      ? value.url
      : typeof value.dataUrl === 'string'
        ? value.dataUrl
        : '';

  if (!possibleUrl.trim()) return null;

  return {
    id,
    url: possibleUrl,
    altEn: typeof value.altEn === 'string' ? value.altEn : '',
    altAr: typeof value.altAr === 'string' ? value.altAr : '',
    order:
      typeof value.order === 'number' && Number.isFinite(value.order)
        ? value.order
        : fallbackOrder,
    createdAt:
      typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? value.createdAt
        : undefined,
    updatedAt:
      typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : undefined,
  };
}

function parsePhotos(rawPhotos: unknown): CarouselPhoto[] {
  if (!rawPhotos) return [];

  if (Array.isArray(rawPhotos)) {
    return rawPhotos
      .map((value, index) =>
        normalizeStoredPhoto(String(index), value as StoredCarouselPhoto | string, index)
      )
      .filter((photo): photo is CarouselPhoto => photo !== null)
      .sort((a, b) => a.order - b.order);
  }

  if (typeof rawPhotos !== 'object') return [];

  return Object.entries(rawPhotos as Record<string, StoredCarouselPhoto | string>)
    .map(([id, value], index) => normalizeStoredPhoto(id, value, index))
    .filter((photo): photo is CarouselPhoto => photo !== null)
    .sort((a, b) => a.order - b.order);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('The selected image could not be read.'));
    };

    reader.onerror = () => {
      reject(new Error('The selected image could not be read.'));
    };

    reader.readAsDataURL(file);
  });
}

function createPhotoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function AdministratorPanel() {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [carouselEnabled, setCarouselEnabled] = useState(true);
  const [photos, setPhotos] = useState<CarouselPhoto[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!isUnlocked) return;

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
  }, [isUnlocked]);

  const clearMessages = () => {
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');

    if (password === ADMIN_PASSWORD) {
      setIsUnlocked(true);
      setPassword('');
      return;
    }

    setLoginError('Incorrect administrator password.');
  };

  const handleLogout = () => {
    setIsUnlocked(false);
    setPassword('');
    setLoginError('');
    setPhotos([]);
    setPendingUploads([]);
    setStatusMessage('');
    setErrorMessage('');
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

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] px-5 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
          <form
            onSubmit={handleLogin}
            className="w-full rounded-[28px] border border-[#8b1e1e]/10 bg-white p-7 shadow-[0_24px_70px_rgba(73,20,20,0.14)] sm:p-9"
          >
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-[#8b1e1e] text-white shadow-[0_10px_30px_rgba(139,30,30,0.25)]">
              <LockKeyhole size={28} />
            </div>

            <div className="text-center">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-[#8b1e1e]/55">
                LINC Administration
              </p>
              <h1 className="text-3xl font-extrabold text-[#641414]">
                Administrator Panel
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-stone-500">
                Enter the temporary administrator password to manage landing-page content.
              </p>
            </div>

            <div className="mt-8">
              <label
                htmlFor="administrator-password"
                className="mb-2 block text-sm font-bold text-stone-700"
              >
                Administrator password
              </label>

              <div className="relative">
                <input
                  id="administrator-password"
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3.5 pr-12 text-lg tracking-[0.25em] text-stone-900 outline-none transition focus:border-[#8b1e1e]"
                  placeholder="••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              {loginError && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {loginError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#8b1e1e] px-6 font-bold text-white shadow-[0_10px_25px_rgba(139,30,30,0.22)] transition hover:-translate-y-0.5 hover:bg-[#761919] active:translate-y-0 active:scale-[0.99]"
            >
              <ShieldCheck size={20} />
              Open Administrator Panel
            </button>

            <p className="mt-5 text-center text-xs leading-relaxed text-stone-400">
              Temporary client-side password protection. Replace this with Firebase Authentication before production.
            </p>
          </form>
        </div>
      </div>
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
              Manage public landing-page content.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-[#8b1e1e]/20 bg-white px-5 text-sm font-bold text-[#8b1e1e] transition hover:bg-[#f8eeee]"
          >
            <LogOut size={17} />
            Lock Panel
          </button>
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

        <section className="overflow-hidden rounded-[28px] border border-[#8b1e1e]/10 bg-white shadow-[0_16px_45px_rgba(73,20,20,0.08)]">
          <div className="border-b border-stone-100 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b1e1e]/50">
                  Landing Page
                </p>
                <h2 className="text-2xl font-extrabold text-[#641414]">
                  Community Carousel
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">
                  Choose whether the carousel is visible and control which photos appear inside it.
                </p>
              </div>

              {loadingSettings && (
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500">
                  <Loader2 size={17} className="animate-spin" />
                  Loading settings
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_280px]">
            <div>
              <h3 className="text-lg font-extrabold text-stone-800">
                Carousel visibility
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">
                When disabled, the entire carousel section is removed from the public landing page.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <button
                type="button"
                disabled={savingVisibility || loadingSettings}
                onClick={() => handleVisibilityChange(!carouselEnabled)}
                className={`flex min-h-[52px] w-full items-center justify-between gap-4 rounded-xl px-4 text-left transition ${
                  carouselEnabled
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-stone-200 text-stone-700'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span>
                  <span className="block text-sm font-extrabold">
                    {carouselEnabled ? 'Carousel is visible' : 'Carousel is hidden'}
                  </span>
                  <span className="mt-0.5 block text-xs opacity-70">
                    Click to {carouselEnabled ? 'hide' : 'show'} it
                  </span>
                </span>

                {savingVisibility ? (
                  <Loader2 size={21} className="animate-spin" />
                ) : carouselEnabled ? (
                  <Eye size={21} />
                ) : (
                  <EyeOff size={21} />
                )}
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-[#8b1e1e]/10 bg-white shadow-[0_16px_45px_rgba(73,20,20,0.08)]">
          <div className="border-b border-stone-100 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b1e1e]/50">
                  Carousel Content
                </p>
                <h2 className="text-2xl font-extrabold text-[#641414]">
                  Uploaded Photos
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {photos.length} stored photo{photos.length === 1 ? '' : 's'} · Approximately {formattedStoredSize}
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  loadingSettings ||
                  photos.length + pendingUploads.length >= MAX_CAROUSEL_PHOTOS
                }
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#8b1e1e] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#761919] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImagePlus size={18} />
                Select Photos
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              Images are converted to Base64 data URLs and stored directly in Firebase Realtime Database. Each image must be no larger than {(MAX_IMAGE_SIZE_BYTES / 1_000_000).toFixed(1)} MB. The current limit is {MAX_CAROUSEL_PHOTOS} photos.
            </div>

            {pendingUploads.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-stone-800">
                      Ready to upload
                    </h3>
                    <p className="text-sm text-stone-500">
                      Review the descriptions, then save these photos to Firebase.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={uploadPendingPhotos}
                    disabled={savingPhotos}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#8b1e1e] px-5 text-sm font-bold text-white transition hover:bg-[#761919] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPhotos ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Upload size={18} />
                    )}
                    Upload {pendingUploads.length} Photo
                    {pendingUploads.length === 1 ? '' : 's'}
                  </button>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {pendingUploads.map((upload) => (
                    <article
                      key={upload.id}
                      className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                        <img
                          src={upload.dataUrl}
                          alt={upload.altEn || upload.fileName}
                          className="h-full w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => removePendingUpload(upload.id)}
                          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white backdrop-blur transition hover:bg-black/80"
                          aria-label="Remove selected photo"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="space-y-4 p-4">
                        <p className="truncate text-xs font-bold text-stone-400">
                          {upload.fileName}
                        </p>

                        <label className="block">
                          <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-stone-500">
                            English description
                          </span>
                          <input
                            value={upload.altEn}
                            onChange={(event) =>
                              updatePendingUpload(
                                upload.id,
                                'altEn',
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8b1e1e]"
                            placeholder="Describe the photo"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-stone-500">
                            Arabic description
                          </span>
                          <input
                            dir="rtl"
                            value={upload.altAr}
                            onChange={(event) =>
                              updatePendingUpload(
                                upload.id,
                                'altAr',
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8b1e1e]"
                            placeholder="وصف الصورة"
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {loadingSettings ? (
              <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-stone-300 bg-stone-50">
                <div className="text-center text-stone-500">
                  <Loader2 size={30} className="mx-auto mb-3 animate-spin" />
                  <p className="font-semibold">Loading carousel photos</p>
                </div>
              </div>
            ) : photos.length === 0 ? (
              <div className="grid min-h-[240px] place-items-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 px-5 text-center">
                <div>
                  <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#f8eeee] text-[#8b1e1e]">
                    <ImagePlus size={28} />
                  </div>
                  <h3 className="text-lg font-extrabold text-stone-800">
                    No administrator photos uploaded
                  </h3>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-stone-500">
                    The public landing page will continue showing its existing placeholder shapes until at least one valid photo is uploaded.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {photos.map((photo, index) => (
                  <article
                    key={photo.id}
                    className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                      <img
                        src={photo.url}
                        alt={photo.altEn || `Carousel photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-extrabold text-white backdrop-blur">
                        {index + 1}
                      </div>
                    </div>

                    <div className="space-y-4 p-4">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-stone-500">
                          English description
                        </span>
                        <input
                          value={photo.altEn}
                          onChange={(event) =>
                            updateStoredPhotoText(
                              photo.id,
                              'altEn',
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8b1e1e]"
                          placeholder="Describe the photo"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-stone-500">
                          Arabic description
                        </span>
                        <input
                          dir="rtl"
                          value={photo.altAr}
                          onChange={(event) =>
                            updateStoredPhotoText(
                              photo.id,
                              'altAr',
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8b1e1e]"
                          placeholder="وصف الصورة"
                        />
                      </label>

                      <div className="grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => movePhoto(photo.id, -1)}
                          disabled={index === 0}
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-stone-200 text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="Move photo earlier"
                        >
                          <ArrowUp size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => movePhoto(photo.id, 1)}
                          disabled={index === photos.length - 1}
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-stone-200 text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="Move photo later"
                        >
                          <ArrowDown size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => saveStoredPhotoText(photo)}
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[#8b1e1e] text-white transition hover:bg-[#761919]"
                          aria-label="Save photo descriptions"
                        >
                          <Save size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => deletePhoto(photo)}
                          disabled={deletingPhotoId === photo.id}
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Delete photo"
                        >
                          {deletingPhotoId === photo.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
