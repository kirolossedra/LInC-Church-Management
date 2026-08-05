import { ChevronRight, Folder, FolderOpen, LibraryBig } from 'lucide-react';

import type { ArchiveFolderNode } from './archives.types';

interface ArchiveFolderTreeProps {
  nodes: ArchiveFolderNode[];
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
}

export default function ArchiveFolderTree({
  nodes,
  selectedFolderId,
  onSelect,
}: ArchiveFolderTreeProps) {
  return (
    <nav aria-label="Archive folder tree" className="space-y-1">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-start text-sm font-bold transition ${
          selectedFolderId === null
            ? 'bg-[#f2a900] text-[#2a1806]'
            : 'text-white/70 hover:bg-white/8 hover:text-white'
        }`}
      >
        <LibraryBig size={17} />
        <span className="min-w-0 flex-1 truncate">LInC archives</span>
      </button>
      {nodes.map(node => (
        <FolderTreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );
}

function FolderTreeNode({
  node,
  depth,
  selectedFolderId,
  onSelect,
}: {
  node: ArchiveFolderNode;
  depth: number;
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
}) {
  const selected = selectedFolderId === node.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        style={{ paddingInlineStart: `${12 + Math.min(depth, 5) * 16}px` }}
        className={`flex min-h-10 w-full items-center gap-2 rounded-xl pe-3 text-start text-sm transition ${
          selected
            ? 'bg-white/12 font-extrabold text-white'
            : 'text-white/60 hover:bg-white/7 hover:text-white'
        }`}
      >
        {node.children.length > 0 ? (
          <ChevronRight size={13} className="shrink-0 rotate-90 text-white/35" />
        ) : (
          <span className="w-[13px] shrink-0" />
        )}
        {selected ? <FolderOpen size={16} /> : <Folder size={16} />}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {node.children.length > 0 && (
          <span className="text-[10px] font-bold text-white/35">{node.children.length}</span>
        )}
      </button>
      {node.children.map(child => (
        <FolderTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
