import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { SevBadge } from './ui';
import type { Finding } from '../lib/types';

export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: Record<string, TreeNode>;
}

/**
 * Builds a clean, hierarchical tree structure from flat repository file paths.
 * Guarantees no duplicate directory entries and correct parent-child relationships.
 */
function buildRepoTree(paths: string[]): TreeNode {
  const root: TreeNode = {
    name: '',
    path: '',
    isDirectory: true,
    children: {},
  };

  for (const rawPath of paths) {
    if (!rawPath) continue;

    const isExplicitDir = rawPath.endsWith('/');
    const cleanPath = rawPath.replace(/^\/+|\/+$/g, '');
    if (!cleanPath) continue;

    const segments = cleanPath.split('/');
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;
      const currentPath = segments.slice(0, i + 1).join('/');

      if (!current.children[segment]) {
        current.children[segment] = {
          name: segment,
          path: currentPath,
          isDirectory: !isLast || isExplicitDir,
          children: {},
        };
      } else if (!isLast) {
        current.children[segment].isDirectory = true;
      }

      current = current.children[segment];
    }
  }

  return root;
}

/**
 * GitHub-style sorting:
 * 1. DIRECTORIES FIRST
 * 2. FILES SECOND
 * Within each category, sort alphabetically.
 */
function getSortedChildren(node: TreeNode): TreeNode[] {
  return Object.values(node.children).sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/* ── Lightweight GitHub-style Breadcrumb ────────────────────────────────── */

function TreeBreadcrumb({
  repoName,
  activePath,
  onNavigatePath,
}: {
  repoName: string;
  activePath: string;
  onNavigatePath: (path: string) => void;
}) {
  const segments = activePath ? activePath.split('/').filter(Boolean) : [];

  return (
    <nav aria-label="Repository breadcrumb" className="flex items-center gap-1.5 px-3 py-2 bg-white border-b border-[#111111] mono text-[12px] overflow-x-auto scroll-thin">
      <button
        onClick={() => onNavigatePath('')}
        className="font-bold text-[var(--color-ink)] hover:underline focus:outline-none focus:ring-1 focus:ring-[#111111] px-1 py-0.5 rounded shrink-0"
      >
        {repoName}
      </button>

      {segments.map((seg, idx) => {
        const segPath = segments.slice(0, idx + 1).join('/');
        const isLast = idx === segments.length - 1;

        return (
          <div key={segPath} className="flex items-center gap-1.5 shrink-0">
            <span className="text-[var(--color-ink-3)] font-normal">/</span>
            <button
              onClick={() => onNavigatePath(segPath)}
              className={`px-1 py-0.5 rounded hover:underline focus:outline-none focus:ring-1 focus:ring-[#111111] ${
                isLast ? 'font-bold text-[var(--color-ink)]' : 'text-[var(--color-ink-2)] font-medium'
              }`}
            >
              {seg}
            </button>
          </div>
        );
      })}
    </nav>
  );
}

/* ── Individual Tree Node Row Component ─────────────────────────────────── */

function TreeNodeRow({
  node,
  depth,
  expandedPaths,
  activePath,
  onToggleExpand,
  onFileClick,
  findingsMap,
}: {
  node: TreeNode;
  depth: number;
  expandedPaths: Set<string>;
  activePath: string;
  onToggleExpand: (node: TreeNode) => void;
  onFileClick: (node: TreeNode) => void;
  findingsMap: Map<string, Finding>;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isActive = activePath === node.path || (node.isDirectory && activePath.startsWith(`${node.path}/`));
  const sortedChildren = useMemo(() => (node.isDirectory ? getSortedChildren(node) : []), [node]);
  const matchingFinding = !node.isDirectory ? findingsMap.get(node.path) : undefined;

  return (
    <div>
      <button
        type="button"
        onClick={() => (node.isDirectory ? onToggleExpand(node) : onFileClick(node))}
        aria-expanded={node.isDirectory ? isExpanded : undefined}
        aria-label={
          node.isDirectory
            ? `${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`
            : `Open file ${node.name}`
        }
        className={`w-full text-left flex items-center justify-between gap-2 py-1 px-2 rounded transition-colors group focus:outline-none focus:ring-1 focus:ring-[#111111] ${
          isActive ? 'bg-[var(--color-active)]' : 'hover:bg-[var(--color-hover)]'
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {node.isDirectory ? (
            <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[var(--color-ink-3)]">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          ) : (
            <span className="w-3.5 h-3.5 shrink-0" />
          )}

          {node.isDirectory ? (
            isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 shrink-0 text-[var(--color-low)]" />
            ) : (
              <Folder className="w-3.5 h-3.5 shrink-0 text-[var(--color-low)]" />
            )
          ) : (
            <File className="w-3.5 h-3.5 shrink-0 text-[var(--color-ink-3)]" />
          )}

          <span
            className={`mono text-[11.5px] truncate ${
              node.isDirectory
                ? 'font-semibold text-[var(--color-ink)]'
                : 'text-[var(--color-ink-2)] group-hover:text-[var(--color-ink)]'
            }`}
          >
            {node.name}
            {node.isDirectory ? '/' : ''}
          </span>
        </div>

        {/* Right side metadata / findings indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {node.isDirectory && sortedChildren.length > 0 && (
            <span className="mono text-[9.5px] text-[var(--color-ink-3)] opacity-0 group-hover:opacity-100 transition-opacity">
              {sortedChildren.length} {sortedChildren.length === 1 ? 'item' : 'items'}
            </span>
          )}

          {matchingFinding && (
            <div className="flex items-center gap-1">
              <SevBadge sev={matchingFinding.severity} />
            </div>
          )}
        </div>
      </button>

      {/* Render children if directory is expanded */}
      {node.isDirectory && isExpanded && (
        <div>
          {sortedChildren.map((child) => (
            <TreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              activePath={activePath}
              onToggleExpand={onToggleExpand}
              onFileClick={onFileClick}
              findingsMap={findingsMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main RepositoryTree Component ──────────────────────────────────────── */

export interface RepositoryTreeProps {
  paths: string[];
  truncated?: boolean;
  repoName: string;
  findings?: Finding[];
}

export default function RepositoryTree({
  paths,
  truncated = false,
  repoName,
  findings = [],
}: RepositoryTreeProps) {
  const navigate = useNavigate();

  const rootTree = useMemo(() => buildRepoTree(paths), [paths]);
  const rootChildren = useMemo(() => getSortedChildren(rootTree), [rootTree]);

  // Maps normalized file paths to security findings
  const findingsMap = useMemo(() => {
    const map = new Map<string, Finding>();
    for (const f of findings) {
      if (f.file_path) {
        // Strip leading slashes for direct path matching
        const cleanFp = f.file_path.replace(/^\/+/, '');
        map.set(cleanFp, f);
      }
    }
    return map;
  }, [findings]);

  // Expansion and path state
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const [activePath, setActivePath] = useState<string>('');
  const [fileNotice, setFileNotice] = useState<string | null>(null);

  const handleToggleExpand = (node: TreeNode) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(node.path)) {
        next.delete(node.path);
      } else {
        next.add(node.path);
      }
      return next;
    });
    setActivePath(node.path);
  };

  const handleNavigateBreadcrumb = (path: string) => {
    setActivePath(path);
    if (!path) return;

    // Ensure all parent directories in the breadcrumb path are expanded
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      const parts = path.split('/');
      let current = '';
      for (const p of parts) {
        current = current ? `${current}/${p}` : p;
        next.add(current);
      }
      return next;
    });
  };

  const handleFileClick = (node: TreeNode) => {
    setActivePath(node.path);
    const matchingFinding = findingsMap.get(node.path);

    if (matchingFinding) {
      navigate(`/findings/${matchingFinding.id}`);
    } else {
      setFileNotice(`File content viewer is not yet available for "${node.name}". Select a file with a registered security finding below to inspect details.`);
    }
  };

  const handleExpandAll = () => {
    const allDirs = new Set<string>();
    const collectDirs = (n: TreeNode) => {
      if (n.isDirectory && n.path) {
        allDirs.add(n.path);
      }
      for (const child of Object.values(n.children)) {
        collectDirs(child);
      }
    };
    collectDirs(rootTree);
    setExpandedPaths(allDirs);
  };

  const handleCollapseAll = () => {
    setExpandedPaths(new Set());
    setActivePath('');
  };

  if (paths.length === 0) {
    return (
      <div className="p-6 text-center text-[var(--color-ink-3)] mono text-[12px]">
        No files found in this repository tree.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#111111]">
      {/* Top Breadcrumb & Control Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-white">
        <div className="flex-1 min-w-0">
          <TreeBreadcrumb
            repoName={repoName}
            activePath={activePath}
            onNavigatePath={handleNavigateBreadcrumb}
          />
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 shrink-0 mono text-[10.5px]">
          <button
            type="button"
            onClick={handleExpandAll}
            className="btn btn-xs btn-ghost inline-flex items-center gap-1 text-[10px]"
            title="Expand all directories"
          >
            <Maximize2 className="w-3 h-3" />
            Expand All
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="btn btn-xs btn-ghost inline-flex items-center gap-1 text-[10px]"
            title="Collapse all directories"
          >
            <Minimize2 className="w-3 h-3" />
            Collapse All
          </button>
        </div>
      </div>

      {/* Optional Notice when clicking a file without an inline viewer */}
      {fileNotice && (
        <div className="px-3 py-2 bg-[#FEF3C7] text-[#B45309] border-b border-[#111111] mono text-[11px] flex items-center justify-between gap-2 fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{fileNotice}</span>
          </div>
          <button
            onClick={() => setFileNotice(null)}
            className="text-[10px] font-bold hover:underline shrink-0"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Main Hierarchical Tree Container */}
      <div
        className="mono text-[11.5px] leading-[20px] p-2 overflow-x-auto min-h-[160px] max-h-[580px] scroll-thin"
        style={{ background: 'var(--color-base)' }}
      >
        {rootChildren.map((node) => (
          <TreeNodeRow
            key={node.path}
            node={node}
            depth={0}
            expandedPaths={expandedPaths}
            activePath={activePath}
            onToggleExpand={handleToggleExpand}
            onFileClick={handleFileClick}
            findingsMap={findingsMap}
          />
        ))}

        {truncated && (
          <div className="mt-3 px-3 py-2 rounded border border-[#111111] text-[#666666] bg-[#FAFAFA] mono text-[11px]">
            Tree truncated — showing the first {paths.length} paths from GitHub.
          </div>
        )}
      </div>
    </div>
  );
}
