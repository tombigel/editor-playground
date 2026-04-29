import type { Effect, InteractConfig, SequenceConfig } from '@wix/interact/web';

export const INTERACT_ROOT_KEY = 'interact-root';

export const INTERACT_CDN_VERSION = '2.2.1';
export const MOTION_PRESETS_CDN_VERSION = '1.0.1';

export const INTERACT_CDN_URL = `https://unpkg.com/@wix/interact@${INTERACT_CDN_VERSION}/dist/es/web.js`;
export const MOTION_PRESETS_CDN_URL = `https://unpkg.com/@wix/motion-presets@${MOTION_PRESETS_CDN_VERSION}/dist/es/motion-presets.js`;

export type InteractDiagnostics = {
  expectedKeys: string[];
  domKeys: string[];
  missingKeys: string[];
  extraKeys: string[];
  duplicateKeys: string[];
  interactionCount: number;
  versions: {
    interact: string;
    motionPresets: string;
  };
};

function addEffectKey(keys: Set<string>, effect: Effect | undefined) {
  const key = effect?.key;
  if (typeof key === 'string' && key) {
    keys.add(key);
  }
}

function addSequenceKeys(keys: Set<string>, sequence: SequenceConfig | undefined) {
  for (const effect of sequence?.effects ?? []) {
    addEffectKey(keys, effect as Effect);
  }
}

export function collectInteractKeysFromConfig(config: InteractConfig): Set<string> {
  const keys = new Set<string>();

  for (const interaction of config.interactions) {
    if (interaction.key) {
      keys.add(interaction.key);
    }
    for (const effect of interaction.effects ?? []) {
      addEffectKey(keys, effect);
    }
    for (const sequence of interaction.sequences ?? []) {
      if ('effects' in sequence) {
        addSequenceKeys(keys, sequence);
      } else {
        addSequenceKeys(keys, config.sequences?.[sequence.sequenceId]);
      }
    }
  }

  for (const effect of Object.values(config.effects)) {
    addEffectKey(keys, effect);
  }
  for (const sequence of Object.values(config.sequences ?? {})) {
    addSequenceKeys(keys, sequence);
  }

  return keys;
}

export function collectDomInteractKeys(
  root: ParentNode | undefined = typeof document === 'undefined' ? undefined : document,
): string[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>('[data-interact-key]'))
    .map((element) => element.getAttribute('data-interact-key'))
    .filter((key): key is string => Boolean(key));
}

export function buildInteractDiagnostics(
  config: InteractConfig,
  root: ParentNode | undefined = typeof document === 'undefined' ? undefined : document,
): InteractDiagnostics {
  const expectedKeys = [...collectInteractKeysFromConfig(config)].sort();
  const domKeys = root ? collectDomInteractKeys(root).sort() : [];
  const expected = new Set(expectedKeys);
  const dom = new Set(domKeys);
  const duplicateKeys = domKeys.filter((key, index) => domKeys.indexOf(key) !== index);

  return {
    expectedKeys,
    domKeys,
    missingKeys: expectedKeys.filter((key) => !dom.has(key)),
    extraKeys: domKeys.filter((key) => !expected.has(key)),
    duplicateKeys: [...new Set(duplicateKeys)].sort(),
    interactionCount: config.interactions.length,
    versions: {
      interact: INTERACT_CDN_VERSION,
      motionPresets: MOTION_PRESETS_CDN_VERSION,
    },
  };
}

export function buildInteractExportScript(config: InteractConfig): string {
  const configJson = JSON.stringify(config);
  return [
    '<script type="module">',
    `import { Interact, add } from '${INTERACT_CDN_URL}';`,
    `import * as presets from '${MOTION_PRESETS_CDN_URL}';`,
    'Interact.registerEffects(presets);',
    'Interact.setup({ allowA11yTriggers: true });',
    `const interactConfig = ${configJson};`,
    'const interactInstance = Interact.create(interactConfig, { useCustomElement: false });',
    'for (const element of document.querySelectorAll("[data-interact-key]")) {',
    '  add(element, element.getAttribute("data-interact-key"));',
    '}',
    'window.__stickyPlaygroundInteract = interactInstance;',
    '</script>',
  ].join('\n');
}
