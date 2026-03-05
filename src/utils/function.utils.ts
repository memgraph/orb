export const throttle = (fn: (...args: unknown[]) => unknown, waitMs = 300) => {
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function () {
    // eslint-disable-next-line prefer-rest-params
    const args = arguments;
    const now = Date.now();
    const remaining = waitMs - (now - lastTime);

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };
};
