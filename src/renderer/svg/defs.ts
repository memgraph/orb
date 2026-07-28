import { IRectangle } from '../../common';

export interface ISVGDefs {
  readonly filterRegion?: IRectangle;
  add(signature: string, build: (id: string) => string): string;
  toSVG(): string;
}

export class SVGDefs implements ISVGDefs {
  private _idBySignature = new Map<string, string>();
  private _entries: string[] = [];
  private _counter = 0;

  constructor(public readonly filterRegion?: IRectangle) {}

  add(signature: string, build: (id: string) => string): string {
    const existing = this._idBySignature.get(signature);
    if (existing !== undefined) {
      return existing;
    }

    const id = `orb-def-${this._counter}`;
    this._counter += 1;
    this._idBySignature.set(signature, id);
    this._entries.push(build(id));
    return id;
  }

  toSVG(): string {
    if (!this._entries.length) {
      return '';
    }
    return `<defs>${this._entries.join('')}</defs>`;
  }
}
