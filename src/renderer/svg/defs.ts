import { IRectangle } from '../../common';

export class SVGDefs {
  private _idBySignature = new Map<string, string>();
  private _entries: string[] = [];
  private _counter = 0;
  private readonly _filterRegion?: IRectangle;

  constructor(filterRegion?: IRectangle) {
    this._filterRegion = filterRegion;
  }

  get filterRegion(): IRectangle | undefined {
    return this._filterRegion;
  }

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
