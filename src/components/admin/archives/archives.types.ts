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

export interface ArchiveFile {
  id: string;
  folderId: string | null;
  name: string;
  size: number;
  contentType: string;
  status: 'pending' | 'ready';
  createdAt: number;
  createdByUid: string;
  updatedAt: number;
}
