export const throttle = (fn: Function, waitMs = 300) => {
  let isInThrottle = false;
  let lastTimer: ReturnType<typeof setTimeout>;
  let lastTimestamp: number = Date.now();

  return function () {
    // eslint-disable-next-line prefer-rest-params
    const args = arguments;
    const now = Date.now();

    if (!isInThrottle) {
      fn(...args);
      lastTimestamp = now;
      isInThrottle = true;
      return;
    }

    clearTimeout(lastTimer);
    const timerWaitMs = Math.max(waitMs - (now - lastTimestamp), 0);

    lastTimer = setTimeout(() => {
      if (now - lastTimestamp >= waitMs) {
        fn(...args);
        lastTimestamp = now;
      }
    }, timerWaitMs);
  };
};
