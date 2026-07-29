import type { ChangeEvent, RefObject } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  MAX_CAROUSEL_PHOTOS,
  MAX_IMAGE_SIZE_BYTES,
} from '../admin.constants';
import type { CarouselPhoto, PendingUpload } from '../admin.types';

interface CarouselManagementSectionProps {
  carouselEnabled: boolean;
  loadingSettings: boolean;
  savingVisibility: boolean;
  handleVisibilityChange: (enabled: boolean) => void | Promise<void>;
  pendingUploads: PendingUpload[];
  photos: CarouselPhoto[];
  formattedStoredSize: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFilesSelected: (
    event: ChangeEvent<HTMLInputElement>
  ) => void | Promise<void>;
  removePendingUpload: (id: string) => void;
  updatePendingUpload: (
    id: string,
    field: 'altEn' | 'altAr',
    value: string
  ) => void;
  uploadPendingPhotos: () => void | Promise<void>;
  savingPhotos: boolean;
  updateStoredPhotoText: (
    photoId: string,
    field: 'altEn' | 'altAr',
    value: string
  ) => void;
  saveStoredPhotoText: (photo: CarouselPhoto) => void | Promise<void>;
  movePhoto: (photoId: string, direction: -1 | 1) => void | Promise<void>;
  deletePhoto: (photo: CarouselPhoto) => void | Promise<void>;
  deletingPhotoId: string | null;
}

export function CarouselManagementSection({
  carouselEnabled,
  loadingSettings,
  savingVisibility,
  handleVisibilityChange,
  pendingUploads,
  photos,
  formattedStoredSize,
  fileInputRef,
  handleFilesSelected,
  removePendingUpload,
  updatePendingUpload,
  uploadPendingPhotos,
  savingPhotos,
  updateStoredPhotoText,
  saveStoredPhotoText,
  movePhoto,
  deletePhoto,
  deletingPhotoId,
}: CarouselManagementSectionProps) {
  return (
  <>
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
  </>
  );
}
