import { isArray, isDate, isPlainObject } from './type.utils';

/**
 * Creates a new deep copy of the received object. Dates, arrays and
 * plain objects will be created as new objects (new reference).
 *
 * @param {any} obj Object
 * @return {any} Deep copied object
 */
export const copyObject = <T extends any[] | any>(obj: T): T => {
  if (isDate(obj)) {
    return copyDate(obj) as T;
  }

  if (isArray(obj)) {
    return copyArray(obj) as T;
  }

  if (isPlainObject(obj)) {
    return copyPlainObject(obj) as T;
  }

  // It is a primitive, function or a custom class
  return obj;
};

/**
 * Checks if two objects are equal by value. It does deep checking for
 * values within arrays or plain objects. Equality for anything that is
 * not a Date, Array, or a plain object will be checked as `a === b`.
 *
 * @param {any} obj1 Object
 * @param {any} obj2 Object
 * @return {boolean} True if objects are deeply equal, otherwise false
 */
export const isObjectEqual = (obj1: any, obj2: any): boolean => {
  const isDate1 = isDate(obj1);
  const isDate2 = isDate(obj2);

  if ((isDate1 && !isDate2) || (!isDate1 && isDate2)) {
    return false;
  }

  if (isDate1 && isDate2) {
    return obj1.getTime() === obj2.getTime();
  }

  const isArray1 = isArray(obj1);
  const isArray2 = isArray(obj2);

  if ((isArray1 && !isArray2) || (!isArray1 && isArray2)) {
    return false;
  }

  if (isArray1 && isArray2) {
    if (obj1.length !== obj2.length) {
      return false;
    }

    return obj1.every((value: any, index: number) => {
      return isObjectEqual(value, obj2[index]);
    });
  }

  const isObject1 = isPlainObject(obj1);
  const isObject2 = isPlainObject(obj2);

  if ((isObject1 && !isObject2) || (!isObject1 && isObject2)) {
    return false;
  }

  if (isObject1 && isObject2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (!isObjectEqual(keys1, keys2)) {
      return false;
    }

    return keys1.every((key) => {
      return isObjectEqual(obj1[key], obj2[key]);
    });
  }

  return obj1 === obj2;
};

/**
 * Copies date object into a new date object.
 *
 * @param {Date} date Date
 * @return {Date} Date object copy
 */
const copyDate = (date: Date): Date => {
  return new Date(date);
};

/**
 * Deep copies an array into a new array. Array values will
 * be deep copied too.
 *
 * @param {Array} array Array
 * @return {Array} Deep copied array
 */
const copyArray = <T>(array: T[]): T[] => {
  return array.map((value) => copyObject(value));
};

/**
 * Deep copies a plain object into a new plain object. Object
 * values will be deep copied too.
 *
 * @param {Record} obj Object
 * @return {Record} Deep copied object
 */
const copyPlainObject = <T>(obj: Record<string, T>): Record<string, T> => {
  const newObject: Record<string, T> = {};
  Object.keys(obj).forEach((key) => {
    newObject[key] = copyObject(obj[key]);
  });
  return newObject;
};
