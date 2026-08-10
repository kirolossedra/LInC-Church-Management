import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Download, File, Folder, FolderPlus, Loader2, RefreshCw, Trash2, UploadCloud } from 'lucide-react';

import {
  createNextGenFolder,
  deleteNextGenFile,
  deleteNextGenFolder,
  getNextGenDownloadUrl,
  getNextGenFiles,
  getNextGenFolders,
  uploadNextGenFile,
  type NextGenFile,
  type NextGenFolder,
} from '../../../services/nextGenPortal';

export default function NextGenFilesWorkspace() {
  const [folders, setFolders] = useState<NextGenFolder[]>([]);
  const [files, setFiles] = useState<NextGenFile[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [folderResult, fileResult] = await Promise.all([getNextGenFolders(), getNextGenFiles()]);
      setFolders(folderResult.folders); setFiles(fileResult.files);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Files could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    void Promise.all([getNextGenFolders(), getNextGenFiles()])
      .then(([folderResult, fileResult]) => {
        if (!active) return;
        setFolders(folderResult.folders);
        setFiles(fileResult.files);
      })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Files could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleFolders = useMemo(() => folders.filter(folder => folder.parentId === folderId), [folders, folderId]);
  const visibleFiles = useMemo(() => files.filter(file => file.folderId === folderId), [files, folderId]);
  const breadcrumbs = useMemo(() => {
    const chain: NextGenFolder[] = [];
    let current = folderId;
    const visited = new Set<string>();
    while (current && !visited.has(current)) {
      visited.add(current);
      const folder = folders.find(candidate => candidate.id === current);
      if (!folder) break;
      chain.unshift(folder); current = folder.parentId;
    }
    return chain;
  }, [folders, folderId]);

  const addFolder = async () => {
    const name = window.prompt('Folder name');
    if (!name?.trim()) return;
    setBusy(true); setError('');
    try { const result = await createNextGenFolder(name, folderId); setFolders(current => [...current, result.folder]); setNotice(`“${result.folder.name}” was created.`); }
    catch (createError) { setError(createError instanceof Error ? createError.message : 'The folder could not be created.'); }
    finally { setBusy(false); }
  };

  const upload = async (selectedFiles: File[]) => {
    if (!selectedFiles.length) return;
    setBusy(true); setError(''); setNotice('');
    try {
      for (const selected of selectedFiles) {
        const stored = await uploadNextGenFile(selected, folderId);
        setFiles(current => [stored, ...current.filter(file => file.id !== stored.id)]);
      }
      setNotice(`${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} uploaded.`);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.'); }
    finally { setBusy(false); }
  };

  const removeFolder = async () => {
    if (!folderId || !window.confirm('Delete this empty folder?')) return;
    const selected = folders.find(folder => folder.id === folderId);
    setBusy(true); setError('');
    try { await deleteNextGenFolder(folderId); setFolders(current => current.filter(folder => folder.id !== folderId)); setFolderId(selected?.parentId ?? null); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Folder deletion failed.'); }
    finally { setBusy(false); }
  };

  const download = async (file: NextGenFile) => {
    try { const result = await getNextGenDownloadUrl(file.id); window.location.assign(result.downloadUrl); }
    catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : 'Download failed.'); }
  };

  const removeFile = async (file: NextGenFile) => {
    if (!window.confirm(`Delete “${file.name}”?`)) return;
    setBusy(true);
    try { await deleteNextGenFile(file.id); setFiles(current => current.filter(candidate => candidate.id !== file.id)); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'File deletion failed.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="overflow-hidden rounded-[2.3rem] border border-[#7a1717]/10 bg-[#fffdf8] shadow-[0_24px_65px_rgba(67,18,16,0.1)]">
      <header className="bg-[#1b0d0d] p-7 text-white md:p-9"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.3em] text-[#f2a900]">Private file workspace</p><h2 className="mt-2 font-serif text-4xl">NextGen files</h2></div><button onClick={() => void load()} className="rounded-full border border-white/15 p-3 hover:bg-white/10" aria-label="Refresh"><RefreshCw className={loading ? 'animate-spin' : ''} size={18} /></button></div></header>
      <div className="p-6 md:p-9">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <nav className="flex flex-wrap items-center gap-2 text-sm"><button onClick={() => setFolderId(null)} className="font-black text-[#7a1717]">NextGen</button>{breadcrumbs.map(folder => <span key={folder.id} className="flex items-center gap-2"><ChevronRight size={14} /><button onClick={() => setFolderId(folder.id)} className="font-bold text-stone-600">{folder.name}</button></span>)}</nav>
          <div className="flex gap-2">{folderId && <button disabled={busy} onClick={() => void removeFolder()} className="rounded-xl border border-red-200 p-3 text-red-700"><Trash2 size={17} /></button>}<button disabled={busy} onClick={() => void addFolder()} className="inline-flex items-center gap-2 rounded-xl bg-[#7a1717] px-4 py-3 text-sm font-black text-white"><FolderPlus size={17} /> New folder</button></div>
        </div>
        {(error || notice) && <p className={`mt-5 rounded-2xl border p-4 font-bold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-800'}`}>{error || notice}</p>}
        {loading ? <div className="flex items-center justify-center gap-3 py-16 text-stone-500"><Loader2 className="animate-spin" /> Loading files…</div> : <>
          <div className="mt-7 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{visibleFolders.map(folder => <button key={folder.id} onClick={() => setFolderId(folder.id)} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-5 text-left transition hover:border-[#7a1717]/40"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f4e9d8] text-[#9a6416]"><Folder size={22} /></span><span className="min-w-0 truncate font-black text-stone-700">{folder.name}</span></button>)}</div>
          <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(Array.from(event.dataTransfer.files)); }} onClick={() => fileInput.current?.click()} className="mt-7 cursor-pointer rounded-[2rem] border-2 border-dashed border-[#7a1717]/15 bg-white p-10 text-center transition hover:border-[#7a1717]/40"><UploadCloud className="mx-auto text-[#7a1717]" size={38} /><p className="mt-4 font-serif text-2xl text-[#661816]">Bring files into this folder</p><p className="mt-2 text-sm text-stone-500">Choose files or place them anywhere in this workspace.</p><input ref={fileInput} type="file" multiple className="hidden" onChange={event => void upload(Array.from(event.target.files ?? []))} /></div>
          <div className="mt-7 space-y-3">{visibleFiles.map(file => <article key={file.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4"><div className="flex min-w-0 items-center gap-3"><File className="shrink-0 text-[#7a1717]" /><div className="min-w-0"><p className="truncate font-black text-stone-700">{file.name}</p><p className="text-xs text-stone-400">{(file.size / 1024).toFixed(1)} KB · {file.status}</p></div></div><div className="flex gap-2"><button disabled={file.status !== 'ready'} onClick={() => void download(file)} className="rounded-xl border border-stone-200 p-2.5 text-[#7a1717] disabled:opacity-40"><Download size={16} /></button><button onClick={() => void removeFile(file)} className="rounded-xl border border-red-200 p-2.5 text-red-700"><Trash2 size={16} /></button></div></article>)}</div>
        </>}
      </div>
    </section>
  );
}
