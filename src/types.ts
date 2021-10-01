export function StaticImplements<T>() {
  return <U extends T>(constructor: U) => { constructor }
};

export type ConstructorOf<T> = {
  new (...args: any[]): T,
};

export type JSPrimitive = string | number | boolean | Date | null | undefined;
