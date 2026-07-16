export interface ISVGAttributes {
  [key: string]: string | number | undefined | null;
}

export const formatNumber = (value: number): string => {
  if (!isFinite(value)) {
    return '0';
  }
  return `${Math.round(value * 1000) / 1000}`;
};

export const escapeXML = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const svgElement = (tag: string, attributes: ISVGAttributes, children?: string): string => {
  const serializedAttributes = Object.keys(attributes)
    .filter((key) => {
      const value = attributes[key];
      return value !== undefined && value !== null && value !== '';
    })
    .map((key) => {
      const value = attributes[key];
      const serializedValue = typeof value === 'number' ? formatNumber(value) : escapeXML(String(value));
      return `${key}="${serializedValue}"`;
    })
    .join(' ');

  const openTag = serializedAttributes ? `${tag} ${serializedAttributes}` : tag;
  if (children === undefined) {
    return `<${openTag}/>`;
  }
  return `<${openTag}>${children}</${tag}>`;
};
