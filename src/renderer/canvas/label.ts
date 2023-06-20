import { IPosition, Color } from '../../common';
import { drawRoundRect } from './shapes';

const DEFAULT_FONT_FAMILY = 'Roboto, sans-serif';
const DEFAULT_FONT_SIZE = 4;
const DEFAULT_FONT_COLOR = '#000000';
const DEFAULT_FONT_BACKGROUND_COLOR = 'transparent';
const DEFAULT_FONT_BORDER_COLOR = '#000000';

const FONT_BACKGROUND_MARGIN = 0.12;
const FONT_LINE_SPACING = 1.2;

export enum LabelTextBaseline {
  TOP = 'top',
  MIDDLE = 'middle',
}

export interface ILabelProperties {
  fontBackgroundColor: Color | string;
  fontBackgroundBorderWidth: number;
  fontBackgroundBorderColor: Color | string;
  fontBackgroundBorderRadius: number;
  fontBackgroundPadding: number;
  fontColor: Color | string;
  fontFamily: string;
  fontSize: number;
}

export interface ILabelData {
  textBaseline: LabelTextBaseline;
  position: IPosition;
  properties: Partial<ILabelProperties>;
}

type BorderPoint = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class Label {
  public readonly text: string;
  public readonly textLines: string[] = [];
  public readonly position: IPosition;
  public readonly properties: Partial<ILabelProperties>;
  public readonly fontSize: number = DEFAULT_FONT_SIZE;
  public readonly fontFamily: string = getFontFamily(DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY);
  public readonly textBaseline: LabelTextBaseline;

  constructor(text: string, data: ILabelData) {
    this.text = `${text === undefined ? '' : text}`;
    this.textLines = splitTextLines(this.text);
    this.position = data.position;
    this.properties = data.properties;
    this.textBaseline = data.textBaseline;

    if (this.properties.fontSize !== undefined || this.properties.fontFamily) {
      this.fontSize = Math.max(this.properties.fontSize ?? 0, 0);
      this.fontFamily = getFontFamily(this.fontSize, this.properties.fontFamily ?? DEFAULT_FONT_FAMILY);
    }

    this._fixPosition();
  }

  private _fixPosition() {
    if (this.textBaseline === LabelTextBaseline.MIDDLE && this.textLines.length) {
      const halfLineSpacingCount = Math.floor(this.textLines.length / 2);
      const halfLineCount = (this.textLines.length - 1) / 2;
      this.position.y -= halfLineCount * this.fontSize - halfLineSpacingCount * (FONT_LINE_SPACING - 1);
    }
  }
}

export const drawLabel = (context: CanvasRenderingContext2D, label: Label, type: 'node' | 'edge') => {
  const isDrawable = label.textLines.length > 0 && label.fontSize > 0;
  if (!isDrawable || !label.position) {
    return;
  }

  const borderPoints: BorderPoint[] | undefined = drawTextBackgroundAndBorder(context, label, type);

  if (!borderPoints) {
    return;
  }

  drawTextBackground(context, borderPoints, label);
  drawTextBackgroundBorder(context, borderPoints, label);
  drawText(context, borderPoints, label, type);
};

const drawTextBackgroundAndBorder = (
  context: CanvasRenderingContext2D,
  label: Label,
  type: 'node' | 'edge',
): BorderPoint[] | undefined => {
  if (!label.position) {
    return;
  }

  const margin = label.fontSize * FONT_BACKGROUND_MARGIN;

  const lineHeight = label.fontSize * FONT_LINE_SPACING;

  const baselineHeight = label.textBaseline === LabelTextBaseline.MIDDLE ? label.fontSize / 2 : 0;

  const borderPoints: BorderPoint[] = [];

  for (let i = 0; i < label.textLines.length; i++) {
    const line = label.textLines[i];

    let width = context.measureText(line).width + 2 * margin;
    let x = label.position.x - width / 2;
    let y = label.position.y - baselineHeight - margin + i * lineHeight;
    let height = label.fontSize + 2 * margin;

    if (label.properties.fontBackgroundPadding) {
      width += label.properties.fontBackgroundPadding * 2;
      height += label.properties.fontBackgroundPadding * 2;
      x -= label.properties.fontBackgroundPadding;

      if (type === 'node') {
        y += label.properties.fontBackgroundPadding * 2 * i;
      } else {
        if (i === 0) {
          y -= label.properties.fontBackgroundPadding;
        } else {
          y += label.properties.fontBackgroundPadding;
        }
      }
    }

    borderPoints.push({ x, y, width, height });
  }

  return borderPoints;
};

const calculateBorderRadius = (borderRadius: number, width: number, height: number) => {
  // ensure that the radius isn't too large for x
  if (width - 2 * borderRadius < 0) {
    borderRadius = width / 2;
  }

  // ensure that the radius isn't too large for y
  if (height - 2 * borderRadius < 0) {
    borderRadius = height / 2;
  }

  return borderRadius;
};

const drawTextBackground = (context: CanvasRenderingContext2D, borderPoints: BorderPoint[], label: Label) => {
  if (!label.properties.fontBackgroundColor) {
    return;
  }

  const backgroundColor = label.properties.fontBackgroundColor ?? DEFAULT_FONT_BACKGROUND_COLOR;
  const fontBorderRadius = label.properties.fontBackgroundBorderRadius ?? 0;

  context.fillStyle = backgroundColor.toString();

  for (let i = 0; i < borderPoints.length; i++) {
    const { x, y, width, height } = borderPoints[i];
    const borderRadius = calculateBorderRadius(fontBorderRadius, width, height);
    drawRoundRect(context, x, y, width, height, borderRadius, i === 0, true);
    context.fill();
  }
};

const drawTextBackgroundBorder = (context: CanvasRenderingContext2D, borderPoints: BorderPoint[], label: Label) => {
  if (!label.properties.fontBackgroundBorderWidth) {
    return;
  }

  const borderWidth = label.properties.fontBackgroundBorderWidth;
  const borderColor = label.properties.fontBackgroundBorderColor ?? DEFAULT_FONT_BORDER_COLOR;
  const fontBorderRadius = label.properties.fontBackgroundBorderRadius ?? 0;
  context.lineWidth = borderWidth;
  context.strokeStyle = borderColor.toString();

  context.beginPath();

  if (borderPoints.length === 1) {
    const { x, y, height, width } = borderPoints[0];
    const borderRadius = calculateBorderRadius(fontBorderRadius, width, height);
    drawRoundRect(context, x, y, width, height, borderRadius);
  } else {
    for (let i = 0; i < borderPoints.length; i++) {
      const { x, y, height, width } = borderPoints[i];
      const { x: nextX, width: nextWidth } = i !== borderPoints.length - 1 ? borderPoints[i + 1] : { x: 0, width: 0 };
      const borderRadius = calculateBorderRadius(fontBorderRadius, width, height);
      if (i === 0) {
        context.moveTo(x + borderRadius, y);
        context.lineTo(x + width - borderRadius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
        context.lineTo(x + width, y + height - borderRadius);
        context.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
        context.lineTo(nextX + nextWidth, y + height);
        context.moveTo(x + borderRadius, y);
        context.quadraticCurveTo(x, y, x, y + borderRadius);
        context.lineTo(x, y + height - borderRadius);
        context.quadraticCurveTo(x, y + height, x + borderRadius, y + height);
        context.lineTo(nextX, y + height);
      } else if (i === borderPoints.length - 1) {
        context.moveTo(x + width, y);
        context.lineTo(x + width, y + height - borderRadius);
        context.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
        context.lineTo(x + borderRadius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
        context.lineTo(x, y);
      } else {
        context.moveTo(x + width, y);
        context.lineTo(x + width, y + height - borderRadius);
        context.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
        context.lineTo(nextX + nextWidth, y + height);
        context.moveTo(x, y);
        context.lineTo(x, y + height - borderRadius);
        context.quadraticCurveTo(x, y + height, x + borderRadius, y + height);
        context.lineTo(nextX, y + height);
      }
    }
  }

  context.stroke();
};

const drawText = (context: CanvasRenderingContext2D, borderPoints: BorderPoint[], label: Label, type: String) => {
  if (!label.position) {
    return;
  }

  context.fillStyle = (label.properties.fontColor ?? DEFAULT_FONT_COLOR).toString();
  context.font = label.fontFamily;
  context.textBaseline = label.textBaseline;
  context.textAlign = 'center';

  if (label.textLines.includes('A -> B')) {
    console.log(borderPoints, label);
  }

  for (let i = 0; i < borderPoints.length; i++) {
    const { x, y, width, height } = borderPoints[i];
    const textLine = label.textLines[i];
    if (type === 'node') {
      context.fillText(textLine, x + width / 2, y + (label.properties.fontBackgroundPadding ?? 0));
    } else {
      context.fillText(textLine, x + width / 2, y + height / 2);
    }
  }
};

const getFontFamily = (fontSize: number, fontFamily: string): string => {
  return `${fontSize}px ${fontFamily}`;
};

const splitTextLines = (text: string): string[] => {
  const lines = text.split('\n');
  const trimmedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimLine = lines[i].trim();
    trimmedLines.push(trimLine);
  }

  return trimmedLines;
};
