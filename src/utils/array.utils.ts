/**
 * Copies input array into a new array. Doesn't do deep copy.
 *
 * The following implementation is faster:
 * - ~ 6x than `array.map(v => v)`
 * - ~15x than `[...array]
 *
 * @param {Array} array Input array
 * @return {Array} Copied array
 */
export const copyArray = <T>(array: Array<T>): Array<T> => {
  const newArray = new Array<T>(array.length);
  for (let i = 0; i < array.length; i++) {
    newArray[i] = array[i];
  }
  return newArray;
};
