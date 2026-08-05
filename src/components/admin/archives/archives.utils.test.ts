import { describe, expect, it } from 'vitest';

import {
  archiveBreadcrumbs,
  buildArchiveTree,
  filesInArchiveLocation,
  foldersInArchiveLocation,
  formatArchiveBytes,
} from './archives.utils';
import type { ArchiveFolder, TemporaryArchiveFile } from './archives.types';

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

  it('filters folders and temporary files to the current location', () => {
    expect(foldersInArchiveLocation(folders, 'leadership').map(folder => folder.id)).toEqual([
      'board',
      'minutes',
    ]);
    const file = new File(['minutes'], 'minutes.pdf', { type: 'application/pdf' });
    const temporaryFiles: TemporaryArchiveFile[] = [
      { id: 'one', folderId: 'minutes', file, addedAt: 1 },
      { id: 'two', folderId: null, file, addedAt: 2 },
    ];
    expect(filesInArchiveLocation(temporaryFiles, 'minutes').map(item => item.id)).toEqual(['one']);
  });

  it('formats file sizes for archive rows', () => {
    expect(formatArchiveBytes(620)).toBe('620 B');
    expect(formatArchiveBytes(2_500)).toBe('2.5 KB');
    expect(formatArchiveBytes(2_500_000)).toBe('2.5 MB');
  });
});
