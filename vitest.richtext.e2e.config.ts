import { defineConfig } from 'vitest/config';
import e2eConfig from './vitest.e2e.config';

export default defineConfig({
  ...e2eConfig,
  test: {
    ...e2eConfig.test,
    include: ['src/stage/tests/Stage.e2e.test.ts'],
    env: {
      ...(e2eConfig.test?.env ?? {}),
      RICHTEXT_E2E: '1',
    },
  },
});
