import { validate as uuid } from 'uuid';
import { JSPrimitive } from './types';

export class ORMTypeError extends TypeError {
  constructor (
    message: string,
    public value: any
  ) {
    super(`${message}, received: ${JSON.stringify(value)}`);
  }
};

export abstract class ORMValue<Primitive = JSPrimitive> {
  public readonly value: Primitive;
  constructor (value: any) {
    this.value = this.validate(value);
  }
  abstract validate (value: any): Primitive;
};

export class vNumber extends ORMValue<number> {
  validate (value: any): number {
    if (typeof value === 'number') return value;
    throw new ORMTypeError('expected a number', value);
  }
};

export class vNumberOrNull extends ORMValue<number | null> {
  validate (value: any): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    throw new ORMTypeError('expected a number or null', value);
  }
};

export class vBoolean extends ORMValue<boolean> {
  validate (value: any): boolean {
    if (typeof value === 'boolean') return value;
    throw new ORMTypeError('expected a boolean', value);
  }
};

export class vBooleanOrNull extends ORMValue<boolean | null> {
  validate (value: any): boolean | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;
    throw new ORMTypeError('expected a boolean or null', value);
  }
};

export class vString extends ORMValue<string> {
  validate (value: any): string {
    if (typeof value === 'string') return value;
    throw new ORMTypeError('expected a string', value);
  }
};

export class vStringOrNull extends ORMValue<string | null> {
  validate (value: any): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    throw new ORMTypeError('expected a string or null', value);
  }
};

const trStringToDate = (value: any): Date | void => {
  
};

export class vDate extends ORMValue<Date> {
  validate (value: any): Date {
    if (value instanceof Date) return value;
    const fromString = trStringToDate(value);
    if (fromString) return fromString;

    throw new ORMTypeError('expected a Date', value);
  }
};

export class vDateOrNull extends ORMValue<Date | null> {
  validate (value: any): Date | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value;
    const fromString = trStringToDate(value);
    if (fromString) return fromString;

    throw new ORMTypeError('expected a Date or null', value);
  }
};

export class vUUID extends vString {
  validate (value: any): string {
    if (uuid(value)) return value;

    throw new ORMTypeError('expected a UUID', value);
  }
};
