export const setupContainer = (container: HTMLElement) => {
  container.style.position = 'relative';
  const style = getComputedStyle(container);
  if (!style.display) {
    container.style.display = 'block';
    console.warn("[Orb] Graph container doesn't have defined 'display' property. Setting 'display' to 'block'...");
  }
  if (!style.width || style.width === '0px') {
    container.style.width = '100%';
    if (getComputedStyle(container).width === '0px') {
      container.style.width = '400px';
      console.warn(
        "[Orb] The graph container element and its parent don't have defined width properties.",
        'If you are using percentage values,',
        'please make sure that the parent element of the graph container has a defined position and width.',
        "Setting the width of the graph container to an arbirtrary value of '400px'...",
      );
    } else {
      console.warn("[Orb] The graph container element doesn't have defined width. Setting width to 100%...");
    }
  }
  if (!style.height || style.height === '0px') {
    container.style.height = '100%';
    if (getComputedStyle(container).height === '0px') {
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
