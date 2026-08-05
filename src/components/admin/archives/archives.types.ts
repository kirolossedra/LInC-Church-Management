export interface ArchiveFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  createdByUid: string;
  updatedAt: number;
}

export interface ArchiveFolderNode extends ArchiveFolder {
  children: ArchiveFolderNode[];
}

export interface TemporaryArchiveFile {
  id: string;
  folderId: string | null;
  file: File;
  addedAt: number;
}
