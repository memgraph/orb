export const copyObject = <T extends any[] | any>(obj: T): T => {
  if (obj instanceof Date) {
    return copyDate(obj) as T;
  }

  if (Array.isArray(obj)) {
    return copyArray(obj) as T;
  }

  if (obj !== null && obj && typeof obj === 'object') {
    return copyPlainObject(obj) as T;
  }

  if (typeof obj === 'function') {
    return obj;
  }

  // It is a primitive
  return obj;
};

const copyDate = (date: Date): Date => {
  return new Date(date);
};

const copyArray = (array: any[]): any[] => {
  return array.map((value) => copyObject(value));
};

const copyPlainObject = (obj: any): any => {
  const newObject: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    newObject[key] = copyObject(obj[key]);
  });
  return newObject;
};

export const isObjectEqual = (obj1: any, obj2: any): boolean => {
  const isDate1 = obj1 instanceof Date;
  const isDate2 = obj2 instanceof Date;

  if ((isDate1 && !isDate2) || (!isDate1 && isDate2)) {
    return false;
  }

  if (isDate1 && isDate2) {
    return obj1.getTime() === obj2.getTime();
  }

  const isArray1 = Array.isArray(obj1);
  const isArray2 = Array.isArray(obj2);

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

  const isObject1 = obj1 !== null && obj1 && typeof obj1 === 'object';
  const isObject2 = obj1 !== null && obj2 && typeof obj2 === 'object';

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
