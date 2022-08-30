export class OrbError extends Error {
  message: string;

  constructor(message: string) {
    super(message);

    this.message = message;

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }
}
