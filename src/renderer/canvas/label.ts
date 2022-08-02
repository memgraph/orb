import { IPosition } from '../../common/position';
import { Color } from '../../models/color';

const DEFAULT_FONT_FAMILY = 'Roboto, sans-serif';
const DEFAULT_FONT_SIZE = 4;
const DEFAULT_FONT_COLOR = '#000000';

const FONT_BACKGROUND_MARGIN = 0.12;
const FONT_LINE_SPACING = 1.2;

export enum LabelTextBaseline {
  TOP = 'top',
  MIDDLE = 'middle',
}

export interface ILabelData {
  textBaseline: LabelTextBaseline;
}

export interface ILabelProperties {
  fontBackgroundColor: Color | string;
  fontColor: Color | string;
  fontFamily: string;
  fontSize: number;
  label: string;
}

export interface ILabelDefinition {
  settings: ILabelData;
  position: IPosition;
  properties: Partial<ILabelProperties>;
}

export class LabelCanvas {
  protected readonly settings: ILabelData;
  protected position?: IPosition;
  protected text: string | undefined;
  protected textLines: string[] = [];

  protected fontSize = DEFAULT_FONT_SIZE;
  protected fontFamily = getFontFamily(DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY);

  protected properties: Partial<ILabelProperties>;

  constructor(definition: ILabelDefinition) {
    this.settings = definition.settings;
    this.position = definition.position;

    this.properties = definition.properties;
    this.text = this.properties.label ?? '';
    this.textLines = splitTextLines(this.text);

    if (this.properties.fontSize !== undefined || this.properties.fontFamily) {
      this.fontSize = Math.max(this.properties.fontSize ?? 0, 0);
      this.fontFamily = getFontFamily(this.fontSize, this.properties.fontFamily ?? DEFAULT_FONT_FAMILY);
    }

    this.fixPosition();
  }

  isDrawable(): boolean {
    return this.textLines.length > 0 && this.fontSize > 0;
  }

  draw(context: CanvasRenderingContext2D) {
    if (!this.isDrawable() || !this.position) {
      return;
    }

    this.drawTextBackground(context);
    this.drawText(context);
  }

  protected drawTextBackground(context: CanvasRenderingContext2D) {
    if (!this.properties.fontBackgroundColor || !this.position) {
      return;
    }

    context.fillStyle = this.properties.fontBackgroundColor.toString();
    const margin = this.fontSize * FONT_BACKGROUND_MARGIN;
    const height = this.fontSize + 2 * margin;
    const lineHeight = this.fontSize * FONT_LINE_SPACING;
    const baselineHeight = this.settings.textBaseline === LabelTextBaseline.MIDDLE ? this.fontSize / 2 : 0;

    for (let i = 0; i < this.textLines.length; i++) {
      const line = this.textLines[i];
      const width = context.measureText(line).width + 2 * margin;
      context.fillRect(
        this.position.x - width / 2,
        this.position.y - baselineHeight - margin + i * lineHeight,
        width,
        height,
      );
    }
  }

  protected drawText(context: CanvasRenderingContext2D) {
    if (!this.position) {
      return;
    }

    context.fillStyle = (this.properties.fontColor ?? DEFAULT_FONT_COLOR).toString();
    context.font = this.fontFamily;
    context.textBaseline = this.settings.textBaseline;
    context.textAlign = 'center';
    const lineHeight = this.fontSize * FONT_LINE_SPACING;

    for (let i = 0; i < this.textLines.length; i++) {
      const line = this.textLines[i];
      context.fillText(line, this.position.x, this.position.y + i * lineHeight);
    }
  }

  protected fixPosition() {
    if (!this.position) {
      return;
    }

    if (this.settings.textBaseline === LabelTextBaseline.MIDDLE && this.textLines.length) {
      const halfLineSpacingCount = Math.floor(this.textLines.length / 2);
      const halfLineCount = (this.textLines.length - 1) / 2;
      this.position.y -= halfLineCount * this.fontSize - halfLineSpacingCount * (FONT_LINE_SPACING - 1);
    }
  }
}

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
