import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createArchiveFolder,
  deleteArchiveFile,
  deleteArchiveFolder,
  getArchiveFileDownloadUrl,
  getArchiveFiles,
  getArchiveFolders,
  uploadArchiveFile,
} from '../../../services/administrator';
import type { ArchiveFile, ArchiveFolder } from './archives.types';
import {
  archiveBreadcrumbs,
  filesInArchiveLocation,
  foldersInArchiveLocation,
} from './archives.utils';

export function useLincArchives() {
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const clearNotice = useCallback(() => {
    setError('');
    setMessage('');
  }, []);

  const loadArchive = useCallback(async () => {
    const [folderResult, fileResult] = await Promise.all([
      getArchiveFolders(),
      getArchiveFiles(),
    ]);
    setFolders(folderResult.folders);
    setFiles(fileResult.files);
    setSelectedFolderId(current =>
      current && folderResult.folders.some(folder => folder.id === current)
        ? current
        : null,
    );
  }, []);

  const refreshArchive = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await loadArchive();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The archives could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [loadArchive]);

  useEffect(() => {
    let active = true;
    void Promise.all([getArchiveFolders(), getArchiveFiles()])
      .then(([folderResult, fileResult]) => {
        if (!active) return;
        setFolders(folderResult.folders);
        setFiles(fileResult.files);
      })
      .catch(loadError => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'The archives could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedFolder = useMemo(
    () => folders.find(folder => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId],
  );
  const breadcrumbs = useMemo(
    () => archiveBreadcrumbs(folders, selectedFolderId),
    [folders, selectedFolderId],
  );
  const visibleFolders = useMemo(
    () => foldersInArchiveLocation(folders, selectedFolderId),
    [folders, selectedFolderId],
  );
  const visibleFiles = useMemo(
    () => filesInArchiveLocation(files, selectedFolderId),
    [files, selectedFolderId],
  );

  const addFolder = async (name: string) => {
    clearNotice();
    setBusy(true);
    try {
      const result = await createArchiveFolder(name, selectedFolderId);
      setFolders(current => [...current, result.folder]);
      setMessage(`“${result.folder.name}” was created.`);
      return true;
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'The folder could not be created.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const removeSelectedFolder = async () => {
    if (!selectedFolder) return false;
    clearNotice();
    if (visibleFiles.length > 0) {
      setError('Remove the files from this folder before deleting it.');
      return false;
    }
    setBusy(true);
    try {
      await deleteArchiveFolder(selectedFolder.id);
      setFolders(current => current.filter(folder => folder.id !== selectedFolder.id));
      setSelectedFolderId(selectedFolder.parentId);
      setMessage(`“${selectedFolder.name}” was removed.`);
      return true;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The folder could not be deleted.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    clearNotice();
    setUploading(true);
    let uploaded = 0;
    try {
      for (const selectedFile of selectedFiles) {
        const storedFile = await uploadArchiveFile(selectedFile, selectedFolderId);
        setFiles(current => [storedFile, ...current.filter(file => file.id !== storedFile.id)]);
        uploaded += 1;
      }
      setMessage(`${uploaded} file${uploaded === 1 ? '' : 's'} uploaded securely.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The file upload failed.');
      try {
        const result = await getArchiveFiles();
        setFiles(result.files);
      } catch { /* preserve the original upload error */ }
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (fileId: string) => {
    clearNotice();
    setBusy(true);
    try {
      await deleteArchiveFile(fileId);
      setFiles(current => current.filter(file => file.id !== fileId));
      setMessage('The archive file was removed.');
      return true;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The archive file could not be removed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const downloadFile = async (archiveFile: ArchiveFile) => {
    clearNotice();
    try {
      const result = await getArchiveFileDownloadUrl(archiveFile.id);
      const anchor = document.createElement('a');
      anchor.href = result.downloadUrl;
      anchor.download = archiveFile.name;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'The download could not be prepared.');
    }
  };

  return {
    folders,
    files,
    selectedFolderId,
    selectedFolder,
    breadcrumbs,
    visibleFolders,
    visibleFiles,
    loading,
    busy,
    uploading,
    error,
    message,
    setSelectedFolderId,
    clearNotice,
    refreshArchive,
    addFolder,
    removeSelectedFolder,
    addFiles,
    removeFile,
    downloadFile,
  };
}
