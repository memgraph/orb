export const setupContainer = (container: HTMLElement, areCollapsedDimensionsAllowed = false) => {
  container.style.position = 'relative';
  const style = getComputedStyle(container);
  if (!style.display) {
    container.style.display = 'block';
    console.warn("[Orb] Graph container doesn't have defined 'display' property. Setting 'display' to 'block'...");
  }
  if (!areCollapsedDimensionsAllowed && isCollapsedDimension(style.width)) {
    container.style.width = '100%';

    // Check if the dimension is still collapsed.
    // This means that a percentage value has no effect
    // since the container parent also doesn't have defined height/position.
    if (isCollapsedDimension(getComputedStyle(container).width)) {
      container.style.width = '400px';
      console.warn(
        "[Orb] The graph container element and its parent don't have defined width properties.",
        'If you are using percentage values,',
        'please make sure that the parent element of the graph container has a defined position and width.',
        "Setting the width of the graph container to an arbitrary value of '400px'...",
      );
    } else {
      console.warn("[Orb] The graph container element doesn't have defined width. Setting width to 100%...");
    }
  }
  if (!areCollapsedDimensionsAllowed && isCollapsedDimension(style.height)) {
    container.style.height = '100%';
    if (isCollapsedDimension(getComputedStyle(container).height)) {
      container.style.height = '400px';
      console.warn(
        "[Orb] The graph container element and its parent don't have defined height properties.",
        'If you are using percentage values,',
        'please make sure that the parent element of the graph container has a defined position and height.',
        "Setting the height of the graph container to an arbitrary value of '400px'...",
      );
    } else {
      console.warn("[Orb] Graph container doesn't have defined height. Setting height to 100%...");
    }
  }
};

export const collapsedDimensionRegex = /^\s*0+\s*(?:px|rem|em|vh|vw)?\s*$/i;

export const isCollapsedDimension = (dimension: string | null | undefined) => {
  if (dimension === null || dimension === undefined || dimension === '') {
    return true;
  }

  return collapsedDimensionRegex.test(dimension);
};

export const appendCanvas = (container: HTMLElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  container.appendChild(canvas);
  return canvas;
};

export type IObserveDPRCallback = (devicePixelRatio: number) => void;
export type IObserveDPRUnsubscribe = () => void;

export const observeDevicePixelRatioChanges = (callback: IObserveDPRCallback): IObserveDPRUnsubscribe => {
  let currentDpr = window.devicePixelRatio;
  let unsubscribe: IObserveDPRUnsubscribe = () => {
    return;
  };

  const listenForDPRChanges = () => {
    unsubscribe();

    const media = matchMedia(`(resolution: ${currentDpr}dppx)`);
    media.addEventListener('change', listenForDPRChanges);
    unsubscribe = () => media.removeEventListener('change', listenForDPRChanges);

    if (window.devicePixelRatio !== currentDpr) {
      currentDpr = window.devicePixelRatio;
      callback(currentDpr);
    }
  };

  listenForDPRChanges();
  return () => unsubscribe();
};
