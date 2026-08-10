import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Archive,
  ChevronRight,
  Download,
  File,
  FileImage,
  FileText,
  Folder,
  FolderPlus,
  HardDriveUpload,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState, type DragEvent } from 'react';

import ArchiveFolderTree from './ArchiveFolderTree';
import { buildArchiveTree, formatArchiveBytes } from './archives.utils';
import type { ArchiveFile } from './archives.types';
import { useLincArchives } from './useLincArchives';

export default function LincArchivesSection() {
  const archive = useLincArchives();
  const prefersReducedMotion = useReducedMotion();
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tree = useMemo(() => buildArchiveTree(archive.folders), [archive.folders]);

  const submitFolder = async () => {
    if (!folderName.trim()) return;
    if (await archive.addFolder(folderName)) {
      setFolderName('');
      setShowCreateFolder(false);
    }
  };

  const confirmDeleteFolder = async () => {
    if (!archive.selectedFolder) return;
    const confirmed = window.confirm(
      `Delete “${archive.selectedFolder.name}”? Only empty folders can be removed.`,
    );
    if (confirmed) await archive.removeSelectedFolder();
  };

  const acceptFiles = (files: FileList | null) => {
    void archive.addFiles(Array.from(files ?? []));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    acceptFiles(event.dataTransfer.files);
  };

  return (
    <section className="relative isolate overflow-hidden rounded-[2.2rem] bg-[#150b0b] text-white shadow-[0_28px_90px_rgba(49,12,12,0.24)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="linc-grid absolute inset-0 opacity-[0.07]" />
        <motion.div
          aria-hidden="true"
          animate={prefersReducedMotion ? undefined : { x: [0, 35, -15, 0], y: [0, -18, 12, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#a62b27]/25 blur-3xl"
        />
      </div>

      <header className="relative border-b border-white/10 px-5 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.24em] text-[#f2a900]">
              <Archive size={15} /> Administration library
            </p>
            <h2 className="mt-4 font-serif text-[clamp(2.8rem,7vw,5.8rem)] font-semibold leading-[0.82] tracking-[-0.055em]">
              LInC archives<span className="text-[#f2a900]">.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
              A structured home for ministry records, resources, and institutional memory.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <ArchiveMetric value={archive.folders.length} label="Folders" />
            <ArchiveMetric value={archive.files.length} label="Stored files" />
            <ArchiveMetric value={archive.breadcrumbs.length} label="Depth" />
          </div>
        </div>
      </header>

      <div className="relative grid min-h-[650px] lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/10 bg-white/[0.025] p-4 lg:border-b-0 lg:border-e">
          <div className="mb-4 flex items-center justify-between px-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/35">Folder map</p>
            <button
              type="button"
              onClick={() => void archive.refreshArchive()}
              disabled={archive.loading}
              className="grid h-9 w-9 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Refresh archive folders"
            >
              <RefreshCw size={15} className={archive.loading ? 'animate-spin' : ''} />
            </button>
          </div>
          {archive.loading ? (
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-5 text-sm text-white/55">
              <Loader2 size={17} className="animate-spin" /> Loading folders
            </div>
          ) : (
            <ArchiveFolderTree
              nodes={tree}
              selectedFolderId={archive.selectedFolderId}
              onSelect={archive.setSelectedFolderId}
            />
          )}
        </aside>

        <div className="min-w-0 bg-[#f4efe6] text-[#251817]">
          <div className="flex flex-col gap-4 border-b border-[#6f1919]/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <nav aria-label="Archive breadcrumbs" className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
              <button type="button" onClick={() => archive.setSelectedFolderId(null)} className="font-extrabold text-[#761b1b] hover:underline">
                LInC archives
              </button>
              {archive.breadcrumbs.map(folder => (
                <span key={folder.id} className="flex min-w-0 items-center gap-1.5">
                  <ChevronRight size={14} className="text-stone-400" />
                  <button type="button" onClick={() => archive.setSelectedFolderId(folder.id)} className="max-w-44 truncate font-bold text-stone-600 hover:text-[#761b1b]">
                    {folder.name}
                  </button>
                </span>
              ))}
            </nav>
            <div className="flex flex-wrap gap-2">
              {archive.selectedFolder && (
                <button type="button" onClick={() => void confirmDeleteFolder()} disabled={archive.busy} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-200 bg-white px-4 text-xs font-extrabold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                  <Trash2 size={15} /> Delete folder
                </button>
              )}
              <button type="button" onClick={() => { archive.clearNotice(); setShowCreateFolder(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#761b1b] px-5 text-xs font-extrabold text-white shadow-[0_10px_25px_rgba(118,27,27,0.18)] transition hover:-translate-y-0.5 hover:bg-[#8b2420]">
                <FolderPlus size={16} /> New folder
              </button>
            </div>
          </div>

          <AnimatePresence>
            {(archive.error || archive.message) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mx-5 mt-5 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold sm:mx-7 ${
                  archive.error
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                <span>{archive.error || archive.message}</span>
                <button type="button" onClick={archive.clearNotice} aria-label="Dismiss archive message"><X size={15} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-5 sm:p-7">
            {archive.visibleFolders.length > 0 && (
              <div>
                <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-stone-400">Folders</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {archive.visibleFolders.map((folder, index) => (
                    <motion.button
                      key={folder.id}
                      type="button"
                      onClick={() => archive.setSelectedFolderId(folder.id)}
                      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: prefersReducedMotion ? 0 : index * 0.04 }}
                      className="group flex min-h-28 items-end justify-between rounded-[1.6rem] border border-[#761b1b]/10 bg-white p-5 text-start shadow-[0_12px_32px_rgba(65,37,22,0.07)] transition hover:-translate-y-1 hover:border-[#761b1b]/25"
                    >
                      <span>
                        <Folder size={24} className="mb-5 text-[#f2a900]" fill="currentColor" />
                        <span className="block font-serif text-2xl font-semibold text-[#5f1919]">{folder.name}</span>
                      </span>
                      <ChevronRight size={18} className="text-stone-300 transition-transform group-hover:translate-x-1 group-hover:text-[#761b1b]" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <div className={archive.visibleFolders.length > 0 ? 'mt-7' : ''}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-stone-400">Files in this location</p>
                <span className="rounded-full bg-[#e9dfd0] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#761b1b]">Private file workspace</span>
              </div>

              <div
                onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragActive(false);
                }}
                onDrop={handleDrop}
                className={`rounded-[1.8rem] border-2 border-dashed p-4 transition sm:p-5 ${
                  dragActive
                    ? 'border-[#f2a900] bg-[#fff7dc]'
                    : 'border-[#761b1b]/15 bg-white/55'
                }`}
              >
                {archive.visibleFiles.length === 0 ? (
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={archive.uploading} className="grid min-h-52 w-full place-items-center rounded-[1.3rem] text-center transition hover:bg-white/65 disabled:cursor-wait disabled:opacity-60">
                    <span>
                      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#761b1b] text-white shadow-[0_14px_30px_rgba(118,27,27,0.2)]">{archive.uploading ? <Loader2 size={27} className="animate-spin" /> : <UploadCloud size={27} />}</span>
                      <span className="mt-5 block font-serif text-2xl font-semibold text-[#5f1919]">{archive.uploading ? 'Uploading securely' : 'Bring files into this folder'}</span>
                      <span className="mt-2 block text-sm text-stone-500">{archive.uploading ? 'The file is being verified before it appears.' : 'Choose files or place them anywhere in this workspace.'}</span>
                    </span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {archive.visibleFiles.map(file => (
                      <ArchiveFileRow
                        key={file.id}
                        archiveFile={file}
                        onDownload={() => void archive.downloadFile(file)}
                        onVerify={() => void archive.verifyFile(file.id)}
                        onRemove={() => {
                          if (window.confirm(`Remove “${file.name}” from LInC archives?`)) {
                            void archive.removeFile(file.id);
                          }
                        }}
                      />
                    ))}
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={archive.uploading} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#761b1b]/15 bg-white text-xs font-extrabold text-[#761b1b] transition hover:bg-[#f8eeee] disabled:cursor-wait disabled:opacity-60">
                      {archive.uploading ? <Loader2 size={16} className="animate-spin" /> : <HardDriveUpload size={16} />} {archive.uploading ? 'Uploading securely' : 'Add more files'}
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  disabled={archive.uploading}
                  onChange={event => { acceptFiles(event.target.files); event.target.value = ''; }}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCreateFolder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-[#160c0c]/75 p-5 backdrop-blur-md"
            onMouseDown={event => {
              if (event.target === event.currentTarget) setShowCreateFolder(false);
            }}
          >
            <motion.form
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onSubmit={event => { event.preventDefault(); void submitFolder(); }}
              className="w-full max-w-md rounded-[2rem] bg-[#f7f2e9] p-6 text-[#251817] shadow-[0_30px_100px_rgba(0,0,0,0.38)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#a12a24]">New archive location</p>
                  <h3 className="mt-2 font-serif text-3xl font-semibold text-[#5f1919]">Create a folder</h3>
                </div>
                <button type="button" onClick={() => setShowCreateFolder(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white text-stone-500 hover:text-[#761b1b]" aria-label="Close new folder dialog"><X size={18} /></button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-500">
                It will be created inside <strong>{archive.selectedFolder?.name ?? 'LInC archives'}</strong>.
              </p>
              <label className="mt-6 block">
                <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-stone-500">Folder name</span>
                <input autoFocus value={folderName} onChange={event => setFolderName(event.target.value)} maxLength={80} className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3.5 text-base font-semibold outline-none transition focus:border-[#8b1e1e]" placeholder="e.g. Board minutes" />
              </label>
              {archive.error && (
                <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{archive.error}</p>
              )}
              <button type="submit" disabled={archive.busy || !folderName.trim()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#761b1b] px-5 font-extrabold text-white transition hover:bg-[#8b2420] disabled:cursor-not-allowed disabled:opacity-50">
                {archive.busy ? <Loader2 size={18} className="animate-spin" /> : <FolderPlus size={18} />}
                Create folder
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ArchiveMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-20 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-center backdrop-blur sm:min-w-24">
      <p className="font-serif text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.15em] text-white/35">{label}</p>
    </div>
  );
}

function ArchiveFileRow({
  archiveFile,
  onDownload,
  onVerify,
  onRemove,
}: {
  archiveFile: ArchiveFile;
  onDownload: () => void;
  onVerify: () => void;
  onRemove: () => void;
}) {
  const type = archiveFile.contentType;
  const FileIcon = type.startsWith('image/')
    ? FileImage
    : type.includes('pdf') || type.startsWith('text/')
      ? FileText
      : File;

  return (
    <article className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-3 shadow-sm sm:px-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f8eeee] text-[#8b1e1e]"><FileIcon size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold text-stone-800">{archiveFile.name}</span>
        <span className="mt-1 block text-[11px] font-semibold text-stone-400">{formatArchiveBytes(archiveFile.size)} · {archiveFile.status === 'ready' ? 'stored privately' : 'upload incomplete'}</span>
      </span>
      {archiveFile.status === 'ready' ? (
        <button type="button" onClick={onDownload} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-[#f8eeee] hover:text-[#8b1e1e]" aria-label={`Download ${archiveFile.name}`}><Download size={17} /></button>
      ) : (
        <button type="button" onClick={onVerify} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-amber-700 transition hover:bg-amber-50 hover:text-amber-900" aria-label={`Verify upload ${archiveFile.name}`} title="Verify upload"><RefreshCw size={17} /></button>
      )}
      <button type="button" onClick={onRemove} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${archiveFile.name}`}><Trash2 size={16} /></button>
    </article>
  );
}
