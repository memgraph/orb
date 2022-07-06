import { IPosition } from '../common/position';
import { INodeStyle } from './node/interface';
import { IEdgeStyle } from './edge/interface';

const DEFAULT_FONT_FAMILY = 'Roboto, sans-serif';
const DEFAULT_FONT_SIZE = 4;
const DEFAULT_FONT_COLOR = '#000000';

const FONT_BACKGROUND_MARGIN = 0.12;
const FONT_LINE_SPACING = 1.2;

export enum LabelShapeTextBaseline {
  TOP = 'top',
  MIDDLE = 'middle',
}

export interface ILabelShapeData {
  textBaseline: LabelShapeTextBaseline;
}

export interface ILabelShapeDefinition {
  data: ILabelShapeData;
  position?: IPosition;
  style?: IEdgeStyle | INodeStyle;
}

export class LabelShape {
  protected readonly data: ILabelShapeData;
  protected position?: IPosition;
  protected text: string | undefined;
  protected textLines: string[] = [];
  protected style?: IEdgeStyle | INodeStyle;

  protected fontSize = DEFAULT_FONT_SIZE;
  protected fontFamily = getFontFamily(DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY);

  constructor(definition: ILabelShapeDefinition) {
    this.data = definition.data;
    if (definition.position) {
      this.setPosition(definition.position);
    }
    if (definition.style) {
      this.setStyle(definition.style);
    }
  }

  setPosition(position: IPosition) {
    // When nodes/edges are initializing, it is not defined
    if (position.x === undefined || position.y === undefined) {
      return;
    }
    this.position = position;
    this.fixPosition();
  }

  setStyle(style: IEdgeStyle | INodeStyle) {
    this.style = style;
    let isLabelChanged = false;

    // Text has changed
    if (this.style?.label && this.style?.label !== this.text) {
      this.text = this.style?.label;
      this.textLines = splitTextLines(this.text);
      isLabelChanged = true;
    }

    // Font has changed
    if (this.style?.fontSize !== undefined || this.style?.fontFamily) {
      this.fontSize = Math.max(this.style?.fontSize ?? 0, 0);
      this.fontFamily = getFontFamily(this.fontSize, this.style?.fontFamily ?? DEFAULT_FONT_FAMILY);
      isLabelChanged = true;
    }

    if (isLabelChanged) {
      this.fixPosition();
    }
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
    if (!this.style?.fontBackgroundColor || !this.position) {
      return;
    }

    context.fillStyle = this.style.fontBackgroundColor;
    const margin = this.fontSize * FONT_BACKGROUND_MARGIN;
    const height = this.fontSize + 2 * margin;
    const lineHeight = this.fontSize * FONT_LINE_SPACING;
    const baselineHeight = this.data.textBaseline === LabelShapeTextBaseline.MIDDLE ? this.fontSize / 2 : 0;

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

    context.fillStyle = this.style?.fontColor ?? DEFAULT_FONT_COLOR;
    context.font = this.fontFamily;
    context.textBaseline = this.data.textBaseline;
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

    if (this.data.textBaseline === LabelShapeTextBaseline.MIDDLE && this.textLines.length) {
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
