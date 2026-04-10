export type HelpDocAlias = {
  path: string;
  anchor?: string;
  targetAnchor?: string | null;
};

type HelpDocRegistryBase = {
  id: string;
  title?: string;
  subtitle?: string;
  parentId?: string;
  order: number;
  navVisibility?: 'primary' | 'secondary';
  aliases?: readonly HelpDocAlias[];
};

export type HelpDocRegistryEntry =
  | (HelpDocRegistryBase & {
      kind: 'markdown';
      sourcePath: string;
    })
  | (HelpDocRegistryBase & {
      kind: 'section';
      title: string;
    })
  | (HelpDocRegistryBase & {
      kind: 'about' | 'shortcuts';
      title: string;
    });

export const HELP_DOC_REGISTRY: readonly HelpDocRegistryEntry[] = [
  { id: 'about', kind: 'about', title: 'About', order: 10 },
  { id: 'doc:docs/USAGE.md', kind: 'markdown', sourcePath: 'docs/USAGE.md', title: 'Usage', order: 20 },
  {
    id: 'doc:docs/REFERENCE.md',
    kind: 'markdown',
    sourcePath: 'docs/REFERENCE.md',
    title: 'Reference',
    order: 30,
  },
  {
    id: 'doc:docs/API.md',
    kind: 'markdown',
    sourcePath: 'docs/API.md',
    title: 'API Reference',
    parentId: 'doc:docs/REFERENCE.md',
    order: 10,
  },
  {
    id: 'doc:docs/API_OVERVIEW.md',
    kind: 'markdown',
    sourcePath: 'docs/API_OVERVIEW.md',
    title: 'Overview',
    parentId: 'doc:docs/API.md',
    order: 10,
    aliases: [{ path: 'docs/API.md', anchor: 'architecture-overview' }],
  },
  {
    id: 'doc:docs/API_DOCUMENT_MODEL.md',
    kind: 'markdown',
    sourcePath: 'docs/API_DOCUMENT_MODEL.md',
    title: 'Document Model',
    parentId: 'doc:docs/API.md',
    order: 20,
    aliases: [{ path: 'docs/API.md', anchor: 'core-document-model' }],
  },
  {
    id: 'doc:docs/API_NODE_AND_LAYOUT.md',
    kind: 'markdown',
    sourcePath: 'docs/API_NODE_AND_LAYOUT.md',
    title: 'Node and Layout',
    parentId: 'doc:docs/API.md',
    order: 30,
    aliases: [
      { path: 'docs/API.md', anchor: 'node-crud' },
      { path: 'docs/API.md', anchor: 'geometry-and-layout' },
    ],
  },
  {
    id: 'doc:docs/API_TEXT.md',
    kind: 'markdown',
    sourcePath: 'docs/API_TEXT.md',
    title: 'Text',
    parentId: 'doc:docs/API.md',
    order: 40,
    aliases: [
      { path: 'docs/API.md', anchor: 'text-content' },
      { path: 'docs/API.md', anchor: 'rich-text' },
      { path: 'docs/API.md', anchor: 'text-conversion' },
      { path: 'docs/API.md', anchor: 'code-blocks' },
    ],
  },
  {
    id: 'doc:docs/API_PAGES_AND_SITE.md',
    kind: 'markdown',
    sourcePath: 'docs/API_PAGES_AND_SITE.md',
    title: 'Pages and Site',
    parentId: 'doc:docs/API.md',
    order: 50,
    aliases: [
      { path: 'docs/API.md', anchor: 'pages-and-site-structure' },
      { path: 'docs/API.md', anchor: 'top-level-wrappers' },
      { path: 'docs/API.md', anchor: 'fonts' },
    ],
  },
  {
    id: 'doc:docs/API_EDITOR.md',
    kind: 'markdown',
    sourcePath: 'docs/API_EDITOR.md',
    title: 'Editor',
    parentId: 'doc:docs/API.md',
    order: 60,
    aliases: [
      { path: 'docs/API.md', anchor: 'animations' },
      { path: 'docs/API.md', anchor: 'drag-and-drop' },
      { path: 'docs/API.md', anchor: 'editor-state' },
      { path: 'docs/API.md', anchor: 'editor-mutations' },
    ],
  },
  {
    id: 'doc:docs/API_RENDERING_AND_EXPORT.md',
    kind: 'markdown',
    sourcePath: 'docs/API_RENDERING_AND_EXPORT.md',
    title: 'Rendering and Export',
    parentId: 'doc:docs/API.md',
    order: 70,
    aliases: [
      { path: 'docs/API.md', anchor: 'rendering-and-export' },
      { path: 'docs/API.md', anchor: 'utilities' },
    ],
  },
  {
    id: 'doc:docs/API_TYPES.md',
    kind: 'markdown',
    sourcePath: 'docs/API_TYPES.md',
    title: 'Types',
    parentId: 'doc:docs/API.md',
    order: 80,
    aliases: [{ path: 'docs/API.md', anchor: 'type-reference' }],
  },
  {
    id: 'doc:docs/DEVELOPERS.md',
    kind: 'markdown',
    sourcePath: 'docs/DEVELOPERS.md',
    title: 'Developers',
    order: 40,
  },
  {
    id: 'section:developers-architecture',
    kind: 'section',
    title: 'Architecture',
    parentId: 'doc:docs/DEVELOPERS.md',
    order: 10,
  },
  {
    id: 'section:developers-workflows',
    kind: 'section',
    title: 'Workflows',
    parentId: 'doc:docs/DEVELOPERS.md',
    order: 20,
  },
  {
    id: 'section:developers-planning',
    kind: 'section',
    title: 'Planning',
    parentId: 'doc:docs/DEVELOPERS.md',
    order: 30,
  },
  {
    id: 'doc:docs/PLAYGROUND_SPEC.md',
    kind: 'markdown',
    sourcePath: 'docs/PLAYGROUND_SPEC.md',
    parentId: 'section:developers-architecture',
    order: 10,
  },
  {
    id: 'doc:docs/EDITOR_STYLE_GUIDE.md',
    kind: 'markdown',
    sourcePath: 'docs/EDITOR_STYLE_GUIDE.md',
    parentId: 'section:developers-architecture',
    order: 20,
  },
  {
    id: 'doc:docs/STICKY_RENDER_MODEL.md',
    kind: 'markdown',
    sourcePath: 'docs/STICKY_RENDER_MODEL.md',
    parentId: 'section:developers-architecture',
    order: 30,
  },
  {
    id: 'doc:docs/Interact Accessibility Discussion.md',
    kind: 'markdown',
    sourcePath: 'docs/Interact Accessibility Discussion.md',
    parentId: 'section:developers-architecture',
    order: 40,
    navVisibility: 'secondary',
  },
  {
    id: 'doc:docs/HELP_BROWSER.md',
    kind: 'markdown',
    sourcePath: 'docs/HELP_BROWSER.md',
    parentId: 'section:developers-workflows',
    order: 10,
  },
  {
    id: 'doc:docs/CONSOLE_TEST_GUIDE.md',
    kind: 'markdown',
    sourcePath: 'docs/CONSOLE_TEST_GUIDE.md',
    parentId: 'section:developers-workflows',
    order: 20,
  },
  {
    id: 'doc:docs/SKILLS.md',
    kind: 'markdown',
    sourcePath: 'docs/SKILLS.md',
    parentId: 'section:developers-workflows',
    order: 30,
  },
  {
    id: 'doc:docs/COLOR_PICKER_UPSTREAM_CONTRIBUTIONS.md',
    kind: 'markdown',
    sourcePath: 'docs/COLOR_PICKER_UPSTREAM_CONTRIBUTIONS.md',
    parentId: 'section:developers-workflows',
    order: 40,
    navVisibility: 'secondary',
  },
  {
    id: 'doc:docs/PLAYGROUND_ROADMAP.md',
    kind: 'markdown',
    sourcePath: 'docs/PLAYGROUND_ROADMAP.md',
    parentId: 'section:developers-planning',
    order: 10,
  },
  {
    id: 'doc:docs/NEXT_STAGE_BRIEF.md',
    kind: 'markdown',
    sourcePath: 'docs/NEXT_STAGE_BRIEF.md',
    parentId: 'section:developers-planning',
    order: 20,
  },
  {
    id: 'doc:docs/MULTIPLE_PAGES_AUDIT_REPORT.md',
    kind: 'markdown',
    sourcePath: 'docs/MULTIPLE_PAGES_AUDIT_REPORT.md',
    parentId: 'section:developers-planning',
    order: 30,
    navVisibility: 'secondary',
  },
  {
    id: 'doc:docs/TEXT_COMPONENT_MASTER_BRIEF.md',
    kind: 'markdown',
    sourcePath: 'docs/TEXT_COMPONENT_MASTER_BRIEF.md',
    parentId: 'section:developers-planning',
    order: 40,
    navVisibility: 'secondary',
  },
  {
    id: 'doc:docs/TEXT_COMPONENT_TASKLIST.md',
    kind: 'markdown',
    sourcePath: 'docs/TEXT_COMPONENT_TASKLIST.md',
    parentId: 'section:developers-planning',
    order: 50,
    navVisibility: 'secondary',
  },
  {
    id: 'doc:docs/TEXT_COMPONENT_PHASE_1_8_BRIEF.md',
    kind: 'markdown',
    sourcePath: 'docs/TEXT_COMPONENT_PHASE_1_8_BRIEF.md',
    parentId: 'section:developers-planning',
    order: 60,
    navVisibility: 'secondary',
  },
  {
    id: 'doc:docs/TEXT_COMPONENT_PHASE_1_8_TASKLIST.md',
    kind: 'markdown',
    sourcePath: 'docs/TEXT_COMPONENT_PHASE_1_8_TASKLIST.md',
    parentId: 'section:developers-planning',
    order: 70,
    navVisibility: 'secondary',
  },
  {
    id: 'doc:docs/TEXT_COMPONENT_PHASE_2_0_BRIEF.md',
    kind: 'markdown',
    sourcePath: 'docs/TEXT_COMPONENT_PHASE_2_0_BRIEF.md',
    parentId: 'section:developers-planning',
    order: 80,
    navVisibility: 'secondary',
  },
  {
    id: 'doc:docs/TEXT_COMPONENT_PHASE_2_0_TASKLIST.md',
    kind: 'markdown',
    sourcePath: 'docs/TEXT_COMPONENT_PHASE_2_0_TASKLIST.md',
    parentId: 'section:developers-planning',
    order: 90,
    navVisibility: 'secondary',
  },
  {
    id: 'doc:docs/DOCUMENTATION_MASTER_BRIEF.md',
    kind: 'markdown',
    sourcePath: 'docs/DOCUMENTATION_MASTER_BRIEF.md',
    parentId: 'section:developers-planning',
    order: 100,
    navVisibility: 'secondary',
  },
  {
    id: 'doc:docs/DOCUMENTATION_TASKLIST.md',
    kind: 'markdown',
    sourcePath: 'docs/DOCUMENTATION_TASKLIST.md',
    parentId: 'section:developers-planning',
    order: 110,
    navVisibility: 'secondary',
  },
  { id: 'shortcuts', kind: 'shortcuts', title: 'Keyboard shortcuts', order: 50 },
] as const;
