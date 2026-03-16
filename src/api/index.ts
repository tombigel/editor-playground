import * as documentApi from './documentApi';
import * as editorApi from './editorApi';
import * as editorViewApi from './editorViewApi';
import * as siteApi from './siteApi';

export const api = {
  ...documentApi,
  ...editorApi,
  ...editorViewApi,
  ...siteApi,
};

export * from './documentApi';
export * from './editorApi';
export * from './editorViewApi';
export * from './siteApi';
