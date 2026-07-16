import { IPosition } from '../../common';
import { Label, LabelTextBaseline, ILabelProperties } from '../canvas/label';
import { escapeXML, svgElement } from './utils';

const DEFAULT_FONT_FAMILY = 'Roboto, sans-serif';
const DEFAULT_FONT_COLOR = '#000000';
const FONT_LINE_SPACING = 1.2;
const FONT_BACKGROUND_MARGIN = 0.12;
const AVERAGE_GLYPH_WIDTH_RATIO = 0.6;

export interface ILabelToSVGData {
  position: IPosition;
  textBaseline: LabelTextBaseline;
  properties: Partial<ILabelProperties>;
}

export const labelToSVG = (text: string | undefined, data: ILabelToSVGData): string => {
  if (text === undefined || text === null || `${text}` === '') {
    return '';
  }

  const label = new Label(text, {
    position: data.position,
    textBaseline: data.textBaseline,
    properties: data.properties,
  });

  if (!label.textLines.length || label.fontSize <= 0) {
    return '';
  }

  const fontFamily = data.properties.fontFamily ?? DEFAULT_FONT_FAMILY;
  const fontColor = (data.properties.fontColor ?? DEFAULT_FONT_COLOR).toString();
  const lineHeight = label.fontSize * FONT_LINE_SPACING;
  const dominantBaseline = data.textBaseline === LabelTextBaseline.MIDDLE ? 'middle' : 'text-before-edge';

  const background = labelBackgroundToSVG(label, lineHeight);

  const tspans = label.textLines
    .map((line, i) => svgElement('tspan', { x: label.position.x, dy: i === 0 ? 0 : lineHeight }, escapeXML(line)))
    .join('');

  const textElement = svgElement(
    'text',
    {
      x: label.position.x,
      y: label.position.y,
      'font-size': label.fontSize,
      'font-family': fontFamily,
      fill: fontColor,
      'text-anchor': 'middle',
      'dominant-baseline': dominantBaseline,
    },
    tspans,
  );

  return `${background}${textElement}`;
};

const labelBackgroundToSVG = (label: Label, lineHeight: number): string => {
  const backgroundColor = label.properties.fontBackgroundColor;
  if (!backgroundColor) {
    return '';
  }

  const margin = label.fontSize * FONT_BACKGROUND_MARGIN;
  const height = label.fontSize + 2 * margin;
  const baselineHeight = label.textBaseline === LabelTextBaseline.MIDDLE ? label.fontSize / 2 : 0;
  const color = backgroundColor.toString();

  return label.textLines
    .map((line, i) => {
      const width = line.length * label.fontSize * AVERAGE_GLYPH_WIDTH_RATIO + 2 * margin;
      return svgElement('rect', {
        x: label.position.x - width / 2,
        y: label.position.y - baselineHeight - margin + i * lineHeight,
        width,
        height,
        fill: color,
      });
    })
    .join('');
};
