/**
 * Makes all deep properties partial. Same as Partial<T> but deep.
 */
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

/**
 * Makes all deep properties required. Same as Required<T> but deep.
 */
export type DeepRequired<T> = T extends object ? { [P in keyof T]-?: DeepRequired<T[P]> } : T;

/**
 * Type check for string values.
 *
 * @param {any} value Any value
 * @return {boolean} True if it is a string, false otherwise
 */
export const isString = (value: any): value is string => {
  return typeof value === 'string';
};

/**
 * Type check for number values.
 *
 * @param {any} value Any value
 * @return {boolean} True if it is a number, false otherwise
 */
export const isNumber = (value: any): value is number => {
  return typeof value === 'number';
};

/**
 * Type check for boolean values.
 *
 * @param {any} value Any value
 * @return {boolean} True if it is a boolean, false otherwise
 */
export const isBoolean = (value: any): value is boolean => {
  return typeof value === 'boolean';
};

/**
 * Type check for Date values.
 *
 * @param {any} value Any value
 * @return {boolean} True if it is a Date, false otherwise
 */
export const isDate = (value: any): value is Date => {
  return value instanceof Date;
};

/**
 * Type check for Array values. Alias for `Array.isArray`.
 *
 * @param {any} value Any value
 * @return {boolean} True if it is an Array, false otherwise
 */
export const isArray = (value: any): value is Array<any> => {
  return Array.isArray(value);
};

/**
 * Type check for plain object values: { [key]: value }
 *
 * @param {any} value Any value
 * @return {boolean} True if it is a plain object, false otherwise
 */
export const isPlainObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && value.constructor.name === 'Object';
};

/**
 * Type check for null values.
 *
 * @param {any} value Any value
 * @return {boolean} True if it is a null, false otherwise
 */
export const isNull = (value: any): value is null => {
  return value === null;
};

/**
 * Type check for Function values.
 *
 * @param {any} value Any value
 * @return {boolean} True if it is a Function, false otherwise
 */
export const isFunction = (value: any): value is Function => {
  return typeof value === 'function';
};
