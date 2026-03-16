export type StyleValue = string | number;
export type StyleRecord = Record<string, StyleValue>;

export type SharedCssRule = {
  selector: string;
  style: StyleRecord;
};
