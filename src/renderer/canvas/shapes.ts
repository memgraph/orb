/**
 * Draws a circle shape.
 * @see {@link https://github.com/almende/vis/blob/master/lib/network/shapes.js}
 *
 * @param {CanvasRenderingContext2D} context Canvas rendering context
 * @param {number} x Horizontal center
 * @param {number} y Vertical center
 * @param {number} r Radius
 */
export const drawCircle = (context: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  context.beginPath();
  context.arc(x, y, r, 0, 2 * Math.PI, false);
  context.closePath();
};

/**
 * Draws a square shape.
 * @see {@link https://github.com/almende/vis/blob/master/lib/network/shapes.js}
 *
 * @param {CanvasRenderingContext2D} context Canvas rendering context
 * @param {number} x Horizontal center
 * @param {number} y Vertical center
 * @param {number} r Size (width and height) of the square
 */
export const drawSquare = (context: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  context.beginPath();
  context.rect(x - r, y - r, r * 2, r * 2);
  context.closePath();
};

/**
 * Draws a triangle shape.
 * @see {@link https://github.com/almende/vis/blob/master/lib/network/shapes.js}
 *
 * @param {CanvasRenderingContext2D} context Canvas rendering context
 * @param {number} x Horizontal center
 * @param {number} y Vertical center
 * @param {number} r Radius, half the length of the sides of the triangle
 */
export const drawTriangleUp = (context: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  // http://en.wikipedia.org/wiki/Equilateral_triangle
  context.beginPath();

  // the change in radius and the offset is here to center the shape
  r *= 1.15;
  y += 0.275 * r;

  const diameter = r * 2;
  const innerRadius = (Math.sqrt(3) * diameter) / 6;
  const height = Math.sqrt(diameter * diameter - r * r);

  context.moveTo(x, y - (height - innerRadius));
  context.lineTo(x + r, y + innerRadius);
  context.lineTo(x - r, y + innerRadius);
  context.lineTo(x, y - (height - innerRadius));
  context.closePath();
};

/**
 * Draws a triangle shape in downward orientation.
 * @see {@link https://github.com/almende/vis/blob/master/lib/network/shapes.js}
 *
 * @param {CanvasRenderingContext2D} context Canvas rendering context
 * @param {number} x Horizontal center
 * @param {number} y Vertical center
 * @param {number} r Radius, half the length of the sides of the triangle
 */
export const drawTriangleDown = (context: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  // http://en.wikipedia.org/wiki/Equilateral_triangle
  context.beginPath();

  // the change in radius and the offset is here to center the shape
  r *= 1.15;
  y -= 0.275 * r;

  const diameter = r * 2;
  const innerRadius = (Math.sqrt(3) * diameter) / 6;
  const height = Math.sqrt(diameter * diameter - r * r);

  context.moveTo(x, y + (height - innerRadius));
  context.lineTo(x + r, y - innerRadius);
  context.lineTo(x - r, y - innerRadius);
  context.lineTo(x, y + (height - innerRadius));
  context.closePath();
};

/**
 * Draw a star shape, a star with 5 points.
 * @see {@link https://github.com/almende/vis/blob/master/lib/network/shapes.js}
 *
 * @param {CanvasRenderingContext2D} context Canvas rendering context
 * @param {number} x Horizontal center
 * @param {number} y Vertical center
 * @param {number} r Radius, half the length of the sides of the triangle
 */
export const drawStar = (context: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  // http://www.html5canvastutorials.com/labs/html5-canvas-star-spinner/
  context.beginPath();

  // the change in radius and the offset is here to center the shape
  r *= 0.82;
  y += 0.1 * r;

  for (let n = 0; n < 10; n++) {
    const radius = r * (n % 2 === 0 ? 1.3 : 0.5);
    const newx = x + radius * Math.sin((n * 2 * Math.PI) / 10);
    const newy = y - radius * Math.cos((n * 2 * Math.PI) / 10);
    context.lineTo(newx, newy);
  }

  context.closePath();
};

/**
 * Draws a Diamond shape.
 * @see {@link https://github.com/almende/vis/blob/master/lib/network/shapes.js}
 *
 * @param {CanvasRenderingContext2D} context Canvas rendering context
 * @param {number} x Horizontal center
 * @param {number} y Vertical center
 * @param {number} r Radius, half the length of the sides of the triangle
 */
export const drawDiamond = (context: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  // http://www.html5canvastutorials.com/labs/html5-canvas-star-spinner/
  context.beginPath();

  context.lineTo(x, y + r);
  context.lineTo(x + r, y);
  context.lineTo(x, y - r);
  context.lineTo(x - r, y);

  context.closePath();
};

/**
 * Draws a rounded rectangle.
 * @see {@link https://github.com/almende/vis/blob/master/lib/network/shapes.js}
 * @see {@link http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas}
 *
 * @param {CanvasRenderingContext2D} context Canvas rendering context
 * @param {number} x Horizontal center
 * @param {number} y Vertical center
 * @param {number} w Width
 * @param {number} h Height
 * @param {number} r Border radius
 */
export const drawRoundRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const r2d = Math.PI / 180;

  // ensure that the radius isn't too large for x
  if (w - 2 * r < 0) {
    r = w / 2;
  }

  // ensure that the radius isn't too large for y
  if (h - 2 * r < 0) {
    r = h / 2;
  }

  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.arc(x + w - r, y + r, r, r2d * 270, r2d * 360, false);
  context.lineTo(x + w, y + h - r);
  context.arc(x + w - r, y + h - r, r, 0, r2d * 90, false);
  context.lineTo(x + r, y + h);
  context.arc(x + r, y + h - r, r, r2d * 90, r2d * 180, false);
  context.lineTo(x, y + r);
  context.arc(x + r, y + r, r, r2d * 180, r2d * 270, false);
  context.closePath();
};

/**
 * Draws an ellipse.
 * @see {@link https://github.com/almende/vis/blob/master/lib/network/shapes.js}
 * @see {@link http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas}
 *
 * @param {CanvasRenderingContext2D} context Canvas rendering context
 * @param {number} x Horizontal center
 * @param {number} y Vertical center
 * @param {number} w Width
 * @param {number} h Height
 */
export const drawEllipse = (context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  const kappa = 0.5522848;
  const ox = (w / 2) * kappa; // control point offset horizontal
  const oy = (h / 2) * kappa; // control point offset vertical
  const xend = x + w;
  const yend = y + h;
  const xmiddle = x + w / 2;
  const ymiddle = y + h / 2;

  context.beginPath();
  context.moveTo(x, ymiddle);
  context.bezierCurveTo(x, ymiddle - oy, xmiddle - ox, y, xmiddle, y);
  context.bezierCurveTo(xmiddle + ox, y, xend, ymiddle - oy, xend, ymiddle);
  context.bezierCurveTo(xend, ymiddle + oy, xmiddle + ox, yend, xmiddle, yend);
  context.bezierCurveTo(xmiddle - ox, yend, x, ymiddle + oy, x, ymiddle);
  context.closePath();
};

/**
 * Draws a Hexagon shape with 6 sides.
 *
 * @param {CanvasRenderingContext2D} context Canvas rendering context
 * @param {Number} x Horizontal center
 * @param {Number} y Vertical center
 * @param {Number} r Radius
 */
export const drawHexagon = (context: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  drawNgon(context, x, y, r, 6);
};

/**
 * Draws a N-gon shape with N sides.
 *
 * @param {CanvasRenderingContext2D} context Canvas rendering context
 * @param {Number} x Horizontal center
 * @param {Number} y Vertical center
 * @param {Number} r Radius
 * @param {Number} sides Number of sides
 */
export const drawNgon = (context: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number) => {
  context.beginPath();
  context.moveTo(x + r, y);

  const arcSide = (Math.PI * 2) / sides;
  for (let i = 1; i < sides; i++) {
    context.lineTo(x + r * Math.cos(arcSide * i), y + r * Math.sin(arcSide * i));
  }

  context.closePath();
};
