import { describe, expect, it } from 'vitest';

import {
  archiveBreadcrumbs,
  buildArchiveTree,
  filesInArchiveLocation,
  foldersInArchiveLocation,
  formatArchiveBytes,
} from './archives.utils';
import type { ArchiveFile, ArchiveFolder } from './archives.types';

const folders: ArchiveFolder[] = [
  { id: 'minutes', name: 'Minutes', parentId: 'leadership', createdAt: 3, createdByUid: 'admin', updatedAt: 3 },
  { id: 'photos', name: 'Photos', parentId: null, createdAt: 2, createdByUid: 'admin', updatedAt: 2 },
  { id: 'leadership', name: 'Leadership', parentId: null, createdAt: 1, createdByUid: 'admin', updatedAt: 1 },
  { id: 'board', name: 'Board', parentId: 'leadership', createdAt: 4, createdByUid: 'admin', updatedAt: 4 },
];

describe('LInC Archives hierarchy utilities', () => {
  it('builds and alphabetizes a nested folder tree', () => {
    const tree = buildArchiveTree(folders);
    expect(tree.map(folder => folder.name)).toEqual(['Leadership', 'Photos']);
    expect(tree[0].children.map(folder => folder.name)).toEqual(['Board', 'Minutes']);
  });

  it('builds breadcrumbs from the archive root to the selected folder', () => {
    expect(archiveBreadcrumbs(folders, 'minutes').map(folder => folder.name)).toEqual([
      'Leadership',
      'Minutes',
    ]);
    expect(archiveBreadcrumbs(folders, null)).toEqual([]);
  });

  it('filters folders and stored files to the current location', () => {
    expect(foldersInArchiveLocation(folders, 'leadership').map(folder => folder.id)).toEqual([
      'board',
      'minutes',
    ]);
    const storedFiles: ArchiveFile[] = [
      { id: 'one', folderId: 'minutes', name: 'minutes.pdf', size: 7, contentType: 'application/pdf', status: 'ready', createdAt: 1, createdByUid: 'admin', updatedAt: 1 },
      { id: 'two', folderId: null, name: 'root.pdf', size: 4, contentType: 'application/pdf', status: 'ready', createdAt: 2, createdByUid: 'admin', updatedAt: 2 },
    ];
    expect(filesInArchiveLocation(storedFiles, 'minutes').map(item => item.id)).toEqual(['one']);
  });

  it('formats file sizes for archive rows', () => {
    expect(formatArchiveBytes(620)).toBe('620 B');
    expect(formatArchiveBytes(2_500)).toBe('2.5 KB');
    expect(formatArchiveBytes(2_500_000)).toBe('2.5 MB');
  });
});
