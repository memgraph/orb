import { IPosition, Color } from '../../common';

const DEFAULT_FONT_FAMILY = 'Roboto, sans-serif';
const DEFAULT_FONT_SIZE = 4;
const DEFAULT_FONT_COLOR = '#000000';

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

export const drawLabel = (context: CanvasRenderingContext2D, label: Label) => {
  const isDrawable = label.textLines.length > 0 && label.fontSize > 0;
  if (!isDrawable || !label.position) {
    return;
  }

  drawTextBackground(context, label);
  drawText(context, label);
};

const drawTextBackground = (context: CanvasRenderingContext2D, label: Label) => {
  if (!label.properties.fontBackgroundColor || !label.position) {
    return;
  }

  context.fillStyle = label.properties.fontBackgroundColor.toString();
  const margin = label.fontSize * FONT_BACKGROUND_MARGIN;

  let height = label.fontSize + 2 * margin;
  const lineHeight = label.fontSize * FONT_LINE_SPACING;

  const baselineHeight = label.textBaseline === LabelTextBaseline.MIDDLE ? label.fontSize / 2 : 0;

  for (let i = 0; i < label.textLines.length; i++) {
    const line = label.textLines[i];

    let width = context.measureText(line).width + 2 * margin;
    let x = label.position.x - width / 2;
    const y = label.position.y - baselineHeight - margin + i * lineHeight;

    if (label.properties.fontBackgroundPadding) {
      width += label.properties.fontBackgroundPadding * 2;
      height += label.properties.fontBackgroundPadding * 2;
      x -= label.properties.fontBackgroundPadding;
    }

    if (label.properties.fontBackgroundBorderRadius) {
      const borderRadius = Math.min(label.properties.fontBackgroundBorderRadius, width / 2, height / 2);

      context.beginPath();
      context.lineWidth = label.properties.fontBackgroundBorderWidth ?? 0;

      context.moveTo(x + borderRadius, y);
      context.lineTo(x + width - borderRadius, y);
      context.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
      context.lineTo(x + width, y + height - borderRadius);
      context.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
      context.lineTo(x + borderRadius, y + height);
      context.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
      context.lineTo(x, y + borderRadius);
      context.quadraticCurveTo(x, y, x + borderRadius, y);
      context.closePath();
      context.fillStyle = (label.properties.fontBackgroundColor ?? DEFAULT_FONT_COLOR).toString();
      context.strokeStyle = (label.properties.fontBackgroundBorderColor ?? DEFAULT_FONT_COLOR).toString();
      context.fill();
      context.stroke();
    } else if (label.properties.fontBackgroundBorderWidth && !label.properties.fontBackgroundBorderRadius) {
      context.lineWidth = label.properties.fontBackgroundBorderWidth;
      context.strokeStyle = (label.properties.fontBackgroundBorderColor ?? DEFAULT_FONT_COLOR).toString();

      context.strokeRect(x, y, width, height);
    } else {
      context.fillRect(x, y, width, height);
    }
  }
};

const drawText = (context: CanvasRenderingContext2D, label: Label) => {
  if (!label.position) {
    return;
  }

  context.fillStyle = (label.properties.fontColor ?? DEFAULT_FONT_COLOR).toString();
  context.font = label.fontFamily;
  context.textBaseline = label.textBaseline;
  context.textAlign = 'center';
  const lineHeight = label.fontSize * FONT_LINE_SPACING;

  const x = label.position.x;
  let y = label.position.y;

  if (label.properties.fontBackgroundPadding) {
    y += label.properties.fontBackgroundPadding;
  }

  for (let i = 0; i < label.textLines.length; i++) {
    const line = label.textLines[i];
    context.fillText(line, x, y + i * lineHeight);
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
