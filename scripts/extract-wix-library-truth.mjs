import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const repoRoot = process.cwd();
const nodeModulesRoot = path.join(repoRoot, 'node_modules');
const generatedPath = path.join(repoRoot, 'src/animations/libraryTruth.generated.ts');

const motionPresetsRulesBase =
  'repos/wix/interact/contents/packages/motion-presets/rules/presets';
const motionPresetRuleFiles = [
  'presets-main.md',
  'entrance-presets.md',
  'ongoing-presets.md',
  'scroll-presets.md',
  'mouse-presets.md',
];

const interactRuleFiles = [
  'click.md',
  'full-lean.md',
  'hover.md',
  'integration.md',
  'pointermove.md',
  'scroll-list.md',
  'viewenter.md',
  'viewprogress.md',
] ;

const supportedUiCategories = new Set(['entrance', 'ongoing', 'scroll', 'mouse']);
const supportedTriggerCategories = {
  entrance: ['entrance'],
  ongoing: ['ongoing'],
  scroll: ['scroll'],
  mouse: ['mouse'],
  click: ['entrance', 'ongoing'],
  activate: ['entrance', 'ongoing'],
  hover: ['entrance', 'ongoing'],
  interest: ['entrance', 'ongoing'],
};

const labelOverrides = {
  Spin3dScroll: 'Spin 3D',
  Tilt3DMouse: 'Tilt 3D',
  Track3DMouse: 'Track 3D',
};

const descriptionOverrides = {
  BounceMouse: 'Element follows the pointer with elastic overshoot motion.',
  SpinMouse: 'Element rotates in response to pointer position.',
  CustomMouse:
    'Implementation helper exported by the package; useful only when paired with a customEffect.',
};

const SCROLL_RANGE_ENUM = ['in', 'out', 'continuous'];
const LIMITED_CONTINUOUS_PRESETS = new Set(['FadeScroll', 'BlurScroll', 'ParallaxScroll']);

const paramPresentationOverrides = {
  ArcIn: {
    depth: { unit: 'px', default: 200, min: 0, max: 2000 },
    perspective: { unit: 'px', default: 800, min: 200, max: 2000 },
  },
  BlurIn: { blur: { unit: 'px', default: 6, min: 0, max: 50 } },
  BounceIn: {
    distanceFactor: { default: 1, min: 1, max: 3, step: 0.1 },
    perspective: { unit: 'px', default: 800, min: 200, max: 2000 },
  },
  CurveIn: {
    depth: { unit: 'px', default: 300 },
    perspective: { unit: 'px', default: 200, min: 100, max: 1000 },
  },
  DropIn: { initialScale: { default: 1.6, min: 1, max: 3, step: 0.1 } },
  ExpandIn: {
    direction: { unit: '°', default: 90, min: 0, max: 360 },
    distance: { unit: 'px' },
    initialScale: { default: 0, min: 0, max: 1, step: 0.1 },
  },
  FlipIn: {
    initialRotate: { unit: '°', default: 90, min: 0, max: 360 },
    perspective: { unit: 'px', default: 800, min: 200, max: 2000 },
  },
  FoldIn: {
    initialRotate: { unit: '°', default: 90, min: 0, max: 360 },
    perspective: { unit: 'px', default: 800, min: 200, max: 2000 },
  },
  GlideIn: {
    direction: { unit: '°', default: 180, min: 0, max: 360 },
    distance: { unit: 'px' },
  },
  ShuttersIn: { shutters: { default: 12, min: 2, max: 30 } },
  SlideIn: { initialTranslate: { default: 1, min: 0, max: 1, step: 0.1 } },
  SpinIn: {
    spins: { default: 0.5, min: 0, max: 5, step: 0.1 },
    initialScale: { default: 0, min: 0, max: 2, step: 0.1 },
  },
  TiltIn: {
    depth: { unit: 'px', default: 200 },
    perspective: { unit: 'px', default: 800, min: 200, max: 2000 },
  },
  Bounce: { intensity: { default: 0, min: 0, max: 1, step: 0.1 } },
  Breathe: {
    distance: { unit: 'px', default: 25 },
    perspective: { unit: 'px', default: 800, min: 200, max: 2000 },
  },
  Flash: {},
  Flip: { perspective: { unit: 'px', default: 800, min: 200, max: 2000 } },
  Fold: { angle: { unit: '°', default: 15, min: 0, max: 90 } },
  Jello: { intensity: { default: 0.25, min: 0, max: 1, step: 0.05 } },
  Poke: { intensity: { default: 0.5, min: 0, max: 1, step: 0.1 } },
  Pulse: { intensity: { default: 0, min: 0, max: 1, step: 0.1 } },
  Rubber: { intensity: { default: 0.5, min: 0, max: 1, step: 0.1 } },
  Swing: { swing: { unit: '°', default: 20, min: 0, max: 90 } },
  Wiggle: { intensity: { default: 0.5, min: 0, max: 1, step: 0.1 } },
  ArcScroll: { perspective: { unit: 'px', default: 500, min: 200, max: 2000 } },
  BlurScroll: { blur: { unit: 'px', default: 6, min: 0, max: 50 } },
  FadeScroll: { opacity: { default: 0, min: 0, max: 1, step: 0.1 } },
  FlipScroll: {
    rotate: { unit: '°', default: 240, min: 0, max: 720 },
    perspective: { unit: 'px', default: 800, min: 200, max: 2000 },
  },
  GrowScroll: {
    scale: { default: 0, min: 0, max: 5, step: 0.1 },
    speed: { default: 0 },
  },
  MoveScroll: {
    angle: { unit: '°', default: 120, min: 0, max: 360 },
    distance: { unit: 'px', default: 400 },
  },
  PanScroll: { distance: { unit: 'px', default: 400 } },
  ParallaxScroll: { parallaxFactor: { default: 0.5, min: 0, max: 2, step: 0.1 } },
  ShapeScroll: { intensity: { default: 0.5, min: 0, max: 1, step: 0.1 } },
  ShrinkScroll: {
    scale: { default: 1.2, min: 0, max: 5, step: 0.1 },
    speed: { default: 0 },
  },
  ShuttersScroll: { shutters: { default: 12, min: 2, max: 30 } },
  SkewPanScroll: { skew: { unit: '°', default: 10, min: 0, max: 45 } },
  Spin3dScroll: {
    rotate: { unit: '°', default: -100, min: -360, max: 360 },
    speed: { default: 0 },
    perspective: { unit: 'px', default: 1000, min: 200, max: 2000 },
  },
  SpinScroll: {
    spins: { default: 0.15, min: 0, max: 5, step: 0.1 },
    scale: { default: 1, min: 0, max: 3, step: 0.1 },
  },
  StretchScroll: { stretch: { default: 0.6, min: 0, max: 3, step: 0.1 } },
  TiltScroll: {
    parallaxFactor: { default: 0, min: 0, max: 2, step: 0.1 },
    perspective: { unit: 'px', default: 400, min: 200, max: 2000 },
  },
  TurnScroll: {
    scale: { default: 1, min: 0, max: 3, step: 0.1 },
    rotation: { unit: '°', default: 0, min: -360, max: 360 },
  },
  AiryMouse: {
    distance: { unit: 'px', default: 200 },
    angle: { unit: '°', default: 30, min: 0, max: 90 },
  },
  BlobMouse: {
    distance: { unit: 'px', default: 200 },
    scale: { default: 1.4, min: 0, max: 3, step: 0.1 },
  },
  BlurMouse: {
    distance: { unit: 'px', default: 80 },
    angle: { unit: '°', default: 5, min: 0, max: 90 },
    scale: { default: 0.3, min: 0, max: 2, step: 0.1 },
    blur: { unit: 'px', default: 20, min: 0, max: 50 },
    perspective: { unit: 'px', default: 600, min: 200, max: 2000 },
  },
  BounceMouse: { distance: { unit: 'px', default: 80 } },
  ScaleMouse: {
    distance: { unit: 'px', default: 80 },
    scale: { default: 1.4, min: 0, max: 3, step: 0.1 },
  },
  SkewMouse: {
    distance: { unit: 'px', default: 200 },
    angle: { unit: '°', default: 25, min: 0, max: 45 },
  },
  SpinMouse: {},
  SwivelMouse: {
    angle: { unit: '°', default: 5, min: 0, max: 90 },
    perspective: { unit: 'px', default: 800, min: 200, max: 2000 },
  },
  Tilt3DMouse: {
    angle: { unit: '°', default: 5, min: 0, max: 90 },
    perspective: { unit: 'px', default: 800, min: 200, max: 2000 },
  },
  Track3DMouse: {
    distance: { unit: 'px', default: 200 },
    angle: { unit: '°', default: 5, min: 0, max: 90 },
    perspective: { unit: 'px', default: 800, min: 200, max: 2000 },
  },
  TrackMouse: { distance: { unit: 'px', default: 200 } },
};

const sentinelChecks = [
  (data) =>
    data.presets.BounceMouse?.supportStatus === 'supported'
      ? null
      : 'BounceMouse must be marked supported from shipped code.',
  (data) =>
    data.presets.SpinMouse?.supportStatus === 'supported'
      ? null
      : 'SpinMouse must be marked supported from shipped code.',
  (data) =>
    data.presets.CustomMouse?.supportStatus === 'implementation-hook'
      ? null
      : 'CustomMouse must be marked as an implementation hook.',
  (data) =>
    data.presets.DVD?.supportStatus === 'typed-but-not-exported'
      ? null
      : 'DVD must be marked typed-but-not-exported.',
  (data) =>
    data.meta.packages.motionPresets === '1.0.0' || !data.presets.Blink
      ? null
      : 'Blink should not be present in the audited preset map for motion-presets versions after 1.0.0.',
  (data) =>
    data.presets.TurnScroll?.codeParamNames.includes('rotation')
      ? null
      : 'TurnScroll.rotation is missing from code-derived params.',
  (data) =>
    !presetTruthExposesIterationDelay(data) ===
    data.discrepancies.some((item) => item.id === 'ongoing-iteration-delay-rules-vs-code')
      ? null
      : 'iterationDelay discrepancy presence does not match shipped motion-preset types.',
  (data) =>
    data.triggers.viewProgress?.ignoredParams?.includes('threshold') &&
    data.triggers.viewProgress?.ignoredParams?.includes('inset')
      ? null
      : 'viewProgress must record threshold and inset as ignored params.',
  (data) =>
    JSON.stringify(data.motion.scrubTransitionEasings) ===
    JSON.stringify(['linear', 'hardBackOut', 'easeOut', 'elastic', 'bounce'])
      ? null
      : 'ScrubTransitionEasing values do not match shipped code.',
];

main();

function main() {
  const args = new Set(process.argv.slice(2));
  const data = buildAuditData();
  const errors = sentinelChecks.map((check) => check(data)).filter(Boolean);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`audit:libraries: ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const output = renderGeneratedModule(data);
  fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
  fs.writeFileSync(generatedPath, output);

  if (!args.has('--quiet')) {
    console.log(`Wrote ${path.relative(repoRoot, generatedPath)}`);
    console.log(`Presets audited: ${Object.keys(data.presets).length}`);
    console.log(`Discrepancies: ${data.discrepancies.length}`);
  }
}

function buildAuditData() {
  const packages = {
    interact: readJson('node_modules/@wix/interact/package.json').version,
    motion: readJson('node_modules/@wix/motion/package.json').version,
    motionPresets: readJson('node_modules/@wix/motion-presets/package.json').version,
  };

  const motionRules = Object.fromEntries(
    motionPresetRuleFiles.map((file) => [file, fetchRuleFile(file)]),
  );
  const parsedMotionRules = {
    entrance: parsePresetRuleSections(motionRules['entrance-presets.md']),
    ongoing: parsePresetRuleSections(motionRules['ongoing-presets.md']),
    scroll: parsePresetRuleSections(motionRules['scroll-presets.md']),
    mouse: parsePresetRuleSections(motionRules['mouse-presets.md']),
    main: motionRules['presets-main.md'],
  };

  const interactRules = Object.fromEntries(
    interactRuleFiles
      .filter((file) => fs.existsSync(path.join(nodeModulesRoot, '@wix/interact', 'rules', file)))
      .map((file) => [file, readText(`node_modules/@wix/interact/rules/${file}`)]),
  );

  const exportedPresets = new Set(getTopLevelMotionPresetExports());
  const motionTypesPath = path.join(nodeModulesRoot, '@wix/motion-presets/dist/types/types.d.ts');
  const motionTypesSource = readText(path.relative(repoRoot, motionTypesPath));
  const motionSourceMap = readJson('node_modules/@wix/motion-presets/dist/es/motion-presets.js.map');
  const interactTypesSource = readJoinedExistingTexts([
    'node_modules/@wix/interact/dist/types/types.d.ts',
    'node_modules/@wix/interact/dist/types/types/index.d.ts',
    'node_modules/@wix/interact/dist/types/types/triggers.d.ts',
    'node_modules/@wix/interact/dist/types/types/effects.d.ts',
    'node_modules/@wix/interact/dist/types/types/config.d.ts',
    'node_modules/@wix/interact/dist/types/types/handlers.d.ts',
  ]);
  const motionCoreTypesSource = readText('node_modules/@wix/motion/dist/types/types.d.ts');

  const typeModel = parseMotionPresetTypes(motionTypesSource, [motionCoreTypesSource]);
  const motionPresetNames = new Set(Object.keys(typeModel.presets));
  const interactPresetRefs = collectInteractRuleReferences(interactRules, motionPresetNames);

  const presets = {};
  for (const [preset, def] of Object.entries(typeModel.presets)) {
    const motionRuleEntry = parsedMotionRules[def.category]?.[preset] ?? null;
    const exported = exportedPresets.has(preset);
    const runtimeSourcePath = findRuntimeSourcePath(motionSourceMap.sources, def.category, preset);
    const runtimeSource = runtimeSourcePath
      ? motionSourceMap.sourcesContent[motionSourceMap.sources.indexOf(runtimeSourcePath)] ?? null
      : null;
    const codeParams = mergeParamPresentation(def.params, paramPresentationOverrides[preset], {
      preset,
      category: def.category,
    });
    const supportStatus = getSupportStatus({
      preset,
      category: def.category,
      exported,
      runtimeSource,
      motionRuleEntry,
    });

    presets[preset] = {
      preset,
      category: def.category,
      uiCategory: supportedUiCategories.has(def.category) ? def.category : null,
      exported,
      typed: true,
      sourcePresent: Boolean(runtimeSource),
      motionRulesPresent: Boolean(motionRuleEntry),
      interactRuleRefs: interactPresetRefs[preset] ?? [],
      supportStatus,
      uiExposed: shouldExposeInUi({
        category: def.category,
        supportStatus,
        preset,
      }),
      codeParamNames: def.params.map((param) => param.name),
      codeParams,
      motionRuleParamNames: motionRuleEntry?.params.map((param) => param.name) ?? [],
      label: labelOverrides[preset] ?? splitCamelCase(preset),
      description: descriptionOverrides[preset] ?? null,
      behaviorNotes: collectBehaviorNotes({ preset, category: def.category, runtimeSource }),
    };
  }

  for (const typedOnly of ['DVD', 'Blink']) {
    if (!presets[typedOnly]) {
      const def = typeModel.presets[typedOnly];
      if (!def) continue;
      presets[typedOnly] = {
        preset: typedOnly,
        category: def.category,
        uiCategory: supportedUiCategories.has(def.category) ? def.category : null,
        exported: false,
        typed: true,
        sourcePresent: false,
        motionRulesPresent: Boolean(parsedMotionRules[def.category]?.[typedOnly]),
        interactRuleRefs: interactPresetRefs[typedOnly] ?? [],
        supportStatus: 'typed-but-not-exported',
        uiExposed: false,
        codeParamNames: def.params.map((param) => param.name),
        codeParams: mergeParamPresentation(def.params, paramPresentationOverrides[typedOnly], {
          preset: typedOnly,
          category: def.category,
        }),
        motionRuleParamNames:
          parsedMotionRules[def.category]?.[typedOnly]?.params.map((param) => param.name) ?? [],
        label: splitCamelCase(typedOnly),
        description: null,
        behaviorNotes: [],
      };
    }
  }

  const discrepancies = collectDiscrepancies({
    presets,
    interactRules,
    parsedMotionRules,
    motionTypesSource,
    motionCoreTypesSource,
    interactTypesSource,
  });

  const triggers = buildTriggerTruth(interactTypesSource, interactRules);
  const motion = {
    scrubTransitionEasings: parseStringUnionFromSource(
      motionCoreTypesSource,
      'ScrubTransitionEasing',
    ),
  };

  return {
    meta: {
      generatedAt: 'deterministic',
      trustOrder: [
        'shipped code/runtime behavior',
        '@wix/motion-presets rules',
        '@wix/interact rules',
        'docs in either package',
      ],
      packages,
      motionPresetRuleFiles: motionPresetRuleFiles.map(
        (file) =>
          `https://github.com/wix/interact/blob/master/packages/motion-presets/rules/presets/${file}`,
      ),
    },
    motion,
    triggers,
    presets,
    exportedPresetNames: [...exportedPresets].sort(),
    discrepancies,
    staleInteractRuleRefs: collectUnexpectedInteractPresetNames(interactRules, motionPresetNames),
    supportedTriggerCategories,
  };
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function fetchRuleFile(fileName) {
  const result = spawnSync(
    'gh',
    [
      'api',
      '-H',
      'Accept: application/vnd.github.raw+json',
      `${motionPresetsRulesBase}/${fileName}`,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Failed to fetch ${fileName} from upstream motion-presets rules.\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout;
}

function parsePresetRuleSections(markdown) {
  const sections = {};
  const matches = [...markdown.matchAll(/^###\s+([A-Za-z0-9]+)\s*$/gm)];
  for (let index = 0; index < matches.length; index += 1) {
    const name = matches[index][1];
    const start = matches[index].index + matches[index][0].length;
    const end = matches[index + 1]?.index ?? markdown.length;
    const body = markdown.slice(start, end);
    const params = [];

    if (/Parameters:\s*None/i.test(body)) {
      sections[name] = { params };
      continue;
    }

    const parameterBlock = body.match(/Parameters:\s*([\s\S]*?)(?:```|---)/);
    if (parameterBlock) {
      for (const line of parameterBlock[1].split('\n')) {
        const match = line.match(/^\s*-\s+`([^`]+)`:\s*([^(\n]+)?(?:\(default:\s*`?([^`)]+)`?\))?/);
        if (!match) continue;
        params.push({
          name: match[1],
          description: match[2]?.trim() ?? '',
          defaultText: match[3]?.trim() ?? null,
        });
      }
    }

    sections[name] = { params };
  }

  return sections;
}

function getTopLevelMotionPresetExports() {
  const script = "import('@wix/motion-presets').then((m)=>console.log(JSON.stringify(Object.keys(m).sort())))";
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`Failed to load @wix/motion-presets exports.\n${result.stderr}`);
  }

  return JSON.parse(result.stdout.trim());
}

function parseMotionPresetTypes(sourceText, extraAliasSources = []) {
  const aliases = new Map();
  for (const extraSource of extraAliasSources) {
    mergeTypeAliasesIntoMap(aliases, extraSource);
  }
  mergeTypeAliasesIntoMap(aliases, sourceText);

  const categories = {
    entrance: getUnionMembers(aliases.get('EntranceAnimation')),
    ongoing: getUnionMembers(aliases.get('OngoingAnimation')),
    scroll: getUnionMembers(aliases.get('ScrollAnimation')),
    mouse: getUnionMembers(aliases.get('MouseAnimation')),
    backgroundScroll: getUnionMembers(aliases.get('BackgroundScrollAnimation')),
  };

  const presets = {};
  for (const [category, names] of Object.entries(categories)) {
    for (const name of names) {
      presets[name] = {
        category,
        params: getTypeAliasProps(name, aliases).filter((prop) => prop.name !== 'type'),
      };
    }
  }

  return { presets };
}

function mergeTypeAliasesIntoMap(target, sourceText) {
  const sourceFile = ts.createSourceFile('types.d.ts', sourceText, ts.ScriptTarget.Latest, true);
  for (const statement of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(statement)) {
      target.set(statement.name.text, statement);
    }
  }
}

function getUnionMembers(aliasDecl) {
  if (!aliasDecl || !ts.isUnionTypeNode(aliasDecl.type)) return [];
  return aliasDecl.type.types
    .map((node) => (ts.isTypeReferenceNode(node) ? node.typeName.getText() : null))
    .filter(Boolean);
}

function getTypeAliasProps(aliasName, aliases, visited = new Set()) {
  if (visited.has(aliasName)) return [];
  visited.add(aliasName);

  const decl = aliases.get(aliasName);
  if (!decl) return [];

  return getTypeNodeProps(decl.type, aliases, visited);
}

function getTypeNodeProps(typeNode, aliases, visited) {
  if (ts.isTypeLiteralNode(typeNode)) {
    return typeNode.members
      .filter(ts.isPropertySignature)
      .map((member) => toPresetParam(member.name.getText(), member.type, member.questionToken != null, aliases));
  }

  if (ts.isIntersectionTypeNode(typeNode)) {
    return typeNode.types.flatMap((node) => getTypeNodeProps(node, aliases, visited));
  }

  if (ts.isTypeReferenceNode(typeNode)) {
    return getTypeAliasProps(typeNode.typeName.getText(), aliases, visited);
  }

  return [];
}

function toPresetParam(name, typeNode, optional, aliases) {
  const resolvedUnion = resolveStringUnion(typeNode, aliases);
  if (resolvedUnion) {
    return {
      name,
      type: 'string',
      required: !optional,
      enum: resolvedUnion,
    };
  }

  if (typeNode && typeNode.kind === ts.SyntaxKind.BooleanKeyword) {
    return { name, type: 'boolean', required: !optional };
  }

  if (typeNode && typeNode.kind === ts.SyntaxKind.NumberKeyword) {
    return { name, type: 'number', required: !optional };
  }

  const rawType = typeNode?.getText() ?? 'unknown';
  if (
    rawType.includes('Length') ||
    rawType.includes('Percentage') ||
    rawType === 'number | string' ||
    rawType.includes('number |')
  ) {
    return { name, type: 'number', required: !optional };
  }

  return { name, type: 'string', required: !optional };
}

function resolveStringUnion(typeNode, aliases) {
  if (!typeNode) return null;

  if (ts.isUnionTypeNode(typeNode)) {
    const values = [];
    for (const member of typeNode.types) {
      if (ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal)) {
        values.push(member.literal.text);
      } else if (member.kind === ts.SyntaxKind.NumberKeyword) {
        return null;
      } else if (ts.isTypeReferenceNode(member)) {
        const nested = resolveStringUnionFromAlias(member.typeName.getText(), aliases);
        if (!nested) return null;
        values.push(...nested);
      } else {
        return null;
      }
    }
    return values.length > 0 ? values : null;
  }

  if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
    return [typeNode.literal.text];
  }

  if (ts.isTypeReferenceNode(typeNode)) {
    return resolveStringUnionFromAlias(typeNode.typeName.getText(), aliases);
  }

  return null;
}

function resolveStringUnionFromAlias(aliasName, aliases) {
  const decl = aliases.get(aliasName);
  if (!decl) return null;
  return resolveStringUnion(decl.type, aliases);
}

function parseStringUnionFromSource(sourceText, aliasName) {
  const sourceFile = ts.createSourceFile('types.d.ts', sourceText, ts.ScriptTarget.Latest, true);
  for (const statement of sourceFile.statements) {
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === aliasName &&
      ts.isUnionTypeNode(statement.type)
    ) {
      return statement.type.types
        .filter((node) => ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal))
        .map((node) => node.literal.text);
    }
  }
  return [];
}

function readJoinedExistingTexts(relativePaths) {
  return relativePaths
    .filter((relativePath) => fs.existsSync(path.join(repoRoot, relativePath)))
    .map((relativePath) => readText(relativePath))
    .join('\n');
}

function findRuntimeSourcePath(sources, category, preset) {
  const dirMap = {
    entrance: 'entrance',
    ongoing: 'ongoing',
    scroll: 'scroll',
    mouse: 'mouse',
    backgroundScroll: 'backgroundScroll',
  };
  return sources.find((sourcePath) =>
    sourcePath.endsWith(`/library/${dirMap[category]}/${preset}.ts`),
  );
}

function collectInteractRuleReferences(interactRules, knownPresetNames) {
  const refs = {};
  for (const preset of knownPresetNames) refs[preset] = [];

  for (const [file, content] of Object.entries(interactRules)) {
    for (const preset of knownPresetNames) {
      const regex = new RegExp(`\\b${preset}\\b`);
      if (regex.test(content)) refs[preset].push(file);
    }
  }

  return refs;
}

function collectUnexpectedInteractPresetNames(interactRules, knownPresetNames) {
  const known = new Set(knownPresetNames);
  const unexpected = [];
  const tokenPattern = /`([A-Z][A-Za-z0-9]*(?:In|Scroll|Mouse))`/g;

  for (const [file, content] of Object.entries(interactRules)) {
    for (const match of content.matchAll(tokenPattern)) {
      if (!known.has(match[1])) {
        unexpected.push({ preset: match[1], file });
      }
    }
  }

  return unexpected;
}

function mergeParamPresentation(baseParams, overrides = {}, context = {}) {
  return baseParams.map((param) => {
    const merged = {
      ...param,
      ...(overrides[param.name] ?? {}),
    };

    if (context.category === 'scroll' && param.name === 'range') {
      merged.enum = LIMITED_CONTINUOUS_PRESETS.has(context.preset)
        ? ['in', 'out']
        : SCROLL_RANGE_ENUM;
    }

    return merged;
  });
}

function getSupportStatus({ preset, category, exported, runtimeSource, motionRuleEntry }) {
  if (preset === 'CustomMouse') return 'implementation-hook';
  if (!exported) return 'typed-but-not-exported';
  if (category === 'backgroundScroll') return 'audited-not-ui-exposed';
  if (!runtimeSource) return 'exported-without-runtime-source';
  if (!motionRuleEntry && category === 'mouse') return 'supported';
  return 'supported';
}

function shouldExposeInUi({ category, supportStatus, preset }) {
  if (!supportedUiCategories.has(category)) return false;
  if (supportStatus === 'typed-but-not-exported') return false;
  if (supportStatus === 'implementation-hook') return false;
  return true;
}

function collectBehaviorNotes({ preset, category, runtimeSource }) {
  if (!runtimeSource) return [];
  const notes = [];

  if (category === 'ongoing' && runtimeSource.includes('options.delay || 0')) {
    notes.push('Uses effect delay from animation options in shipped code.');
  }

  if (category === 'scroll') {
    if (preset === 'ParallaxScroll' && !runtimeSource.includes('range')) {
      notes.push('Does not read the range preset parameter in shipped code.');
    } else if (!runtimeSource.includes('continuous')) {
      notes.push('No explicit continuous branch found in shipped source.');
    } else {
      notes.push('Contains explicit continuous-mode logic in shipped source.');
    }
  }

  return notes;
}

function buildTriggerTruth(interactTypesSource, interactRules) {
  const pointerMoveParams = parseObjectTypeProps(interactTypesSource, 'PointerMoveParams');
  const viewEnterParams = parseObjectTypeProps(interactTypesSource, 'ViewEnterParams');
  const animationEndParams = parseObjectTypeProps(interactTypesSource, 'AnimationEndParams');
  const viewProgressRule = interactRules['viewprogress.md'] ?? '';

  return {
    click: {
      supportedTypes: ['once', 'repeat', 'state', 'alternate'],
      winningSource: '@wix/interact rules',
    },
    hover: {
      supportedTypes: ['once', 'repeat', 'state', 'alternate'],
      winningSource: '@wix/interact rules',
    },
    viewEnter: {
      params: viewEnterParams,
      supportedTypes: ['once', 'repeat', 'alternate', 'state'],
      foucGenerateRule: 'generate(config) only for viewEnter + once + same source and target.',
    },
    viewProgress: {
      params: viewEnterParams,
      ignoredParams: ['threshold', 'inset'],
      winningSource: 'shipped code/runtime behavior',
      discrepancy:
        viewProgressRule.includes('threshold') ||
        viewProgressRule.includes('inset')
          ? 'Local interact rule still shows threshold/inset placeholders for viewProgress.'
          : null,
    },
    pointerMove: {
      params: pointerMoveParams,
      note: 'Use interact trigger semantics from installed rules; preset inventory is audited separately.',
    },
    animationEnd: {
      params: animationEndParams,
    },
  };
}

function parseObjectTypeProps(sourceText, aliasName) {
  const sourceFile = ts.createSourceFile('types.d.ts', sourceText, ts.ScriptTarget.Latest, true);
  for (const statement of sourceFile.statements) {
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === aliasName &&
      ts.isTypeLiteralNode(statement.type)
    ) {
      return statement.type.members
        .filter(ts.isPropertySignature)
        .map((member) => member.name.getText());
    }
  }
  return [];
}

function collectDiscrepancies({
  presets,
  interactRules,
  parsedMotionRules,
  motionTypesSource,
  motionCoreTypesSource,
  interactTypesSource,
}) {
  const discrepancies = [];
  const hoverRules = interactRules['hover.md'] ?? '';
  const viewProgressRules = interactRules['viewprogress.md'] ?? '';

  for (const preset of Object.values(presets)) {
    if (preset.exported && !preset.motionRulesPresent && preset.category === 'mouse') {
      discrepancies.push({
        id: `${preset.preset}-missing-in-motion-rules`,
        classification: 'code-missing-in-motion-rules',
        title: `${preset.preset} exists in shipped code but is omitted from motion preset rules`,
        winner: 'shipped code/runtime behavior',
        losingSources: ['@wix/motion-presets rules'],
        preset: preset.preset,
      });
    }

    if (!preset.exported && (preset.motionRulesPresent || preset.typed)) {
      const losingSources = [];
      if (preset.motionRulesPresent) losingSources.push('@wix/motion-presets rules');
      if (preset.typed) losingSources.push('public @wix/motion-presets types');
      discrepancies.push({
        id: `${preset.preset}-typed-or-ruled-not-exported`,
        classification: 'typed-but-not-exported',
        title: `${preset.preset} appears in lower-priority sources but is not exported by shipped code`,
        winner: 'shipped code/runtime behavior',
        losingSources,
        preset: preset.preset,
      });
    }

    if (
      preset.preset === 'TurnScroll' &&
      preset.codeParamNames.includes('rotation') &&
      !preset.motionRuleParamNames.includes('rotation')
    ) {
      discrepancies.push({
        id: 'turn-scroll-rotation-missing-in-rules',
        classification: 'code-missing-in-motion-rules',
        title: 'TurnScroll.rotation exists in shipped code but is omitted from motion preset rules',
        winner: 'shipped code/runtime behavior',
        losingSources: ['@wix/motion-presets rules', '@wix/interact rules'],
        preset: 'TurnScroll',
      });
    }
  }

  if (
    !motionTypesExposeIterationDelay({ motionTypesSource }) &&
    parsedMotionRules.ongoing?.Bounce?.params.some((param) => param.name === 'iterationDelay')
  ) {
    discrepancies.push({
      id: 'ongoing-iteration-delay-rules-vs-code',
      classification: 'rules-claim-not-in-code',
      title: 'Ongoing preset rules document iterationDelay, but shipped code uses effect delay instead',
      winner: 'shipped code/runtime behavior',
      losingSources: ['@wix/motion-presets rules'],
    });
  }

  if (hoverRules.includes('GrowIn')) {
    discrepancies.push({
      id: 'hover-rule-stale-growin',
      classification: 'stale-interact-rule-reference',
      title: 'interact hover rules reference non-existent GrowIn preset',
      winner: '@wix/motion-presets rules',
      losingSources: ['@wix/interact rules'],
    });
  }

  if (hoverRules.includes('GlitchIn')) {
    discrepancies.push({
      id: 'hover-rule-stale-glitchin',
      classification: 'stale-interact-rule-reference',
      title: 'interact hover rules reference non-existent GlitchIn preset',
      winner: '@wix/motion-presets rules',
      losingSources: ['@wix/interact rules'],
    });
  }

  const scrubTransitionEasings = parseStringUnionFromSource(
    motionCoreTypesSource,
    'ScrubTransitionEasing',
  );
  if (
    JSON.stringify(scrubTransitionEasings) !==
    JSON.stringify(['linear', 'hardBackOut', 'easeOut', 'elastic', 'bounce'])
  ) {
    discrepancies.push({
      id: 'scrub-transition-easings-mismatch',
      classification: 'project-only gap',
      title: 'ScrubTransitionEasing union drifted from shipped code',
      winner: 'shipped code/runtime behavior',
      losingSources: ['project code'],
    });
  }

  if (
    viewProgressRules.includes('threshold') &&
    interactTypesSource.includes("export type ViewEnterParams =")
  ) {
    discrepancies.push({
      id: 'viewprogress-threshold-inset-placeholders',
      classification: 'stale-interact-rule-reference',
      title: 'interact viewProgress rule still shows threshold/inset placeholders although runtime ignores them',
      winner: 'shipped code/runtime behavior',
      losingSources: ['@wix/interact rules'],
    });
  }

  return discrepancies.sort((a, b) => a.title.localeCompare(b.title));
}

function motionTypesExposeIterationDelay({ motionTypesSource }) {
  return motionTypesSource.includes('iterationDelay');
}

function presetTruthExposesIterationDelay(data) {
  return Object.values(data.presets).some(
    (preset) => preset.category === 'ongoing' && preset.codeParamNames.includes('iterationDelay'),
  );
}

function splitCamelCase(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d+)/g, '$1 $2')
    .replace(/(\d+)([a-zA-Z])/g, '$1 $2');
}

function renderGeneratedModule(data) {
  return `/* eslint-disable */
// GENERATED FILE: run \`npm run audit:libraries\` to refresh.

export const LIBRARY_TRUTH_META = ${toLiteral(data.meta)} as const;

export const LIBRARY_TRUTH_MOTION = ${toLiteral(data.motion)} as const;

export const LIBRARY_TRIGGER_TRUTH = ${toLiteral(data.triggers)} as const;

export const LIBRARY_PRESET_TRUTH = ${toLiteral(data.presets)} as const;

export const LIBRARY_EXPORTED_PRESET_NAMES = ${toLiteral(data.exportedPresetNames)} as const;

export const LIBRARY_DISCREPANCIES = ${toLiteral(data.discrepancies)} as const;

export const LIBRARY_STALE_INTERACT_RULE_REFS = ${toLiteral(data.staleInteractRuleRefs)} as const;

export const SUPPORTED_TRIGGER_CATEGORIES = ${toLiteral(data.supportedTriggerCategories)} as const;
`;
}

function toLiteral(value) {
  return JSON.stringify(value, null, 2);
}
