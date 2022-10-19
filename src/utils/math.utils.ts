export const getThrottleMsFromFPS = (fps: number): number => {
  const validFps = Math.max(fps, 1);
  return Math.round(1000 / validFps);
};
