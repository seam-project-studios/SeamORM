import { ORMEntity } from "./ORMEntity";
import { ORMValue } from "./ORMValue";

export function StaticImplements<T>() {
  return <U extends T>(constructor: U) => { constructor }
};

export type ConstructorOf<T> = {
  new (...args: any[]): T,
};

export type JSPrimitive = string | number | boolean | Date | null | undefined;

export type ORMColumns<Columns> = { [columnName in keyof Columns]: ORMValue };
export type ORMEntityPKeys<Columns> = Array<keyof Columns>;
export type ORMColumnConstructors<Columns> = { [columnName in keyof Columns]: ConstructorOf<ORMValue> };
export type ORMColumnPrimitives<Columns> = { [columnName in keyof Columns]: JSPrimitive };
export type ORMColumnPrimitivesPartial<Columns> = Partial<ORMColumnPrimitives<Columns>>;

export interface ORMEntityStatic<Columns> {
  hydrate (row: ORMColumnPrimitives<Columns>): ORMEntity<Columns>,
  new (params: ORMEntityConstructor<Columns>): ORMEntity<Columns>,
  table: string,
  ColumnValue: ORMColumnConstructors<Columns>,
  pkeys: ORMEntityPKeys<Columns>,
  buildSelect (): string[],
  validate (functionName: string, values: ORMColumnPrimitivesPartial<Columns>): Columns,
};

export interface ORMEntityConstructor<Columns> {
  def: ORMEntityStatic<Columns>,
  values: Columns,
};
