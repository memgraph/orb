interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export class Color {
  readonly hex: string;
  readonly rgb: ColorRGB;

  constructor(hex: string) {
    this.hex = hex;
    this.rgb = hexToRgb(hex);
  }

  toString(): string {
    return this.hex;
  }

  getDarkerColor(factor = 0.3): Color {
    return Color.getColorFromRGB({
      r: this.rgb.r - factor * this.rgb.r,
      g: this.rgb.g - factor * this.rgb.g,
      b: this.rgb.b - factor * this.rgb.b,
    });
  }

  getLighterColor(factor = 0.3): Color {
    return Color.getColorFromRGB({
      r: this.rgb.r + factor * (255 - this.rgb.r),
      g: this.rgb.g + factor * (255 - this.rgb.g),
      b: this.rgb.b + factor * (255 - this.rgb.b),
    });
  }

  getMixedColor(color: Color): Color {
    return Color.getColorFromRGB({
      r: (this.rgb.r + color.rgb.r) / 2,
      g: (this.rgb.g + color.rgb.g) / 2,
      b: (this.rgb.b + color.rgb.b) / 2,
    });
  }

  isEqual(color: Color): boolean {
    return this.rgb.r === color.rgb.r && this.rgb.g === color.rgb.g && this.rgb.b === color.rgb.b;
  }

  static getColorFromRGB(rgb: ColorRGB): Color {
    const r = Math.round(Math.max(Math.min(rgb.r, 255), 0));
    const g = Math.round(Math.max(Math.min(rgb.g, 255), 0));
    const b = Math.round(Math.max(Math.min(rgb.b, 255), 0));

    return new Color(rgbToHex({ r, g, b }));
  }

  static getRandomColor(): Color {
    return Color.getColorFromRGB({
      r: Math.round(255 * Math.random()),
      g: Math.round(255 * Math.random()),
      b: Math.round(255 * Math.random()),
    });
  }
}

const hexToRgb = (hex: string): ColorRGB => {
  return {
    r: parseInt(hex.substring(1, 3), 16),
    g: parseInt(hex.substring(3, 5), 16),
    b: parseInt(hex.substring(6, 7), 16),
  };
};

const rgbToHex = (rgb: ColorRGB): string => {
  return '#' + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1);
};
