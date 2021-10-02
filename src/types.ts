import { Knex } from "knex";
import { ORMEntity } from "./ORMEntity";

export function StaticImplements<T>() {
  return <U extends T>(constructor: U) => { constructor }
};

export type ConstructorOf<T> = {
  new (...args: any[]): T,
};

export interface ORMColumn {
  type: ConstructorOf<String | Number | Date | Boolean>,
  primaryKey?: boolean,
  selectable?: boolean,
  required?: boolean,
  nullable?: boolean,
  valid?: (value: any) => boolean
};

export type ORMColumns<Columns, T = ORMColumn> = Record<keyof Columns, T>;

export interface ORMEntityStatic<Columns> {
  table: string,
  columns: ORMColumns<Columns>,
  hydrate (row: ORMColumns<Columns, any>): ORMEntity<Columns>,
  new (params: ORMEntityConstructor<Columns>): ORMEntity<Columns>,
  buildSelect (): string[],
  validate (method: 'insert' | 'update' | 'hydrate', values: Partial<ORMColumns<Columns, any>>): void,
};

export interface ORMEntityConstructor<Columns> {
  def: ORMEntityStatic<Columns>,
  values: Columns,
};
