import type {
  ArchiveFolder,
  ArchiveFolderNode,
  ArchiveFile,
} from './archives.types';

export function buildArchiveTree(folders: ArchiveFolder[]): ArchiveFolderNode[] {
  const nodes = new Map<string, ArchiveFolderNode>();
  folders.forEach(folder => nodes.set(folder.id, { ...folder, children: [] }));

  const roots: ArchiveFolderNode[] = [];
  nodes.forEach(node => {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  });

  const sortNodes = (items: ArchiveFolderNode[]) => {
    items.sort((left, right) => left.name.localeCompare(right.name));
    items.forEach(item => sortNodes(item.children));
  };
  sortNodes(roots);
  return roots;
}

export function archiveBreadcrumbs(
  folders: ArchiveFolder[],
  selectedFolderId: string | null,
): ArchiveFolder[] {
  if (!selectedFolderId) return [];
  const byId = new Map(folders.map(folder => [folder.id, folder]));
  const result: ArchiveFolder[] = [];
  const visited = new Set<string>();
  let current = byId.get(selectedFolderId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    result.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return result;
}

export function foldersInArchiveLocation(
  folders: ArchiveFolder[],
  parentId: string | null,
) {
  return folders
    .filter(folder => folder.parentId === parentId)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function filesInArchiveLocation(
  files: ArchiveFile[],
  folderId: string | null,
) {
  return files
    .filter(file => file.folderId === folderId)
    .sort((left, right) => right.createdAt - left.createdAt);
}

export function formatArchiveBytes(bytes: number) {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}
