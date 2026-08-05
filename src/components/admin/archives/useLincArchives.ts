import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createArchiveFolder,
  deleteArchiveFolder,
  getArchiveFolders,
} from '../../../services/administrator';
import type { ArchiveFolder, TemporaryArchiveFile } from './archives.types';
import {
  archiveBreadcrumbs,
  createTemporaryArchiveFile,
  filesInArchiveLocation,
  foldersInArchiveLocation,
} from './archives.utils';

export function useLincArchives() {
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [temporaryFiles, setTemporaryFiles] = useState<TemporaryArchiveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const clearNotice = useCallback(() => {
    setError('');
    setMessage('');
  }, []);

  const refreshFolders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getArchiveFolders();
      setFolders(result.folders);
      setSelectedFolderId(current =>
        current && result.folders.some(folder => folder.id === current)
          ? current
          : null,
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The archive folders could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void getArchiveFolders()
      .then(result => {
        if (!active) return;
        setFolders(result.folders);
      })
      .catch(loadError => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'The archive folders could not be loaded.');
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
    () => filesInArchiveLocation(temporaryFiles, selectedFolderId),
    [temporaryFiles, selectedFolderId],
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
      setError('Remove the temporary files from this folder before deleting it.');
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

  const addTemporaryFiles = (files: File[]) => {
    if (files.length === 0) return;
    clearNotice();
    const additions = files.map(file => createTemporaryArchiveFile(file, selectedFolderId));
    setTemporaryFiles(current => [...current, ...additions]);
    setMessage(`${additions.length} file${additions.length === 1 ? '' : 's'} added to this session.`);
  };

  const removeTemporaryFile = (fileId: string) => {
    clearNotice();
    setTemporaryFiles(current => current.filter(file => file.id !== fileId));
    setMessage('The temporary file was removed.');
  };

  const downloadTemporaryFile = (temporaryFile: TemporaryArchiveFile) => {
    const objectUrl = URL.createObjectURL(temporaryFile.file);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = temporaryFile.file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  };

  return {
    folders,
    selectedFolderId,
    selectedFolder,
    breadcrumbs,
    visibleFolders,
    visibleFiles,
    temporaryFiles,
    loading,
    busy,
    error,
    message,
    setSelectedFolderId,
    clearNotice,
    refreshFolders,
    addFolder,
    removeSelectedFolder,
    addTemporaryFiles,
    removeTemporaryFile,
    downloadTemporaryFile,
  };
}
