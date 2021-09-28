import { Knex } from 'knex';
import { JSPrimitive, ORMValue } from './ORMValue';
import pg from '../pg';

export function StaticImplements<T>() {
  return <U extends T>(constructor: U) => { constructor }
};
export type ConstructorOf<T> = {
  new (...args: any[]): T,
};

export type ORMColumns<Columns> = { [columnName in keyof Columns]: ORMValue };
export type ORMEntityPKeys<Columns> = Array<keyof Columns>;
type ORMColumnConstructors<Columns> = { [columnName in keyof Columns]: ConstructorOf<ORMValue> };
type ORMColumnPrimitives<Columns> = { [columnName in keyof Columns]: JSPrimitive };
type ORMColumnPrimitivesPartial<Columns> = Partial<ORMColumnPrimitives<Columns>>;

export interface ORMEntityStatic<Columns> {
  hydrate (row: ORMColumnPrimitives<Columns>): ORMEntity<Columns>,
  new (params: ORMEntityConstructor<Columns>): ORMEntity<Columns>,
  table: string,
  ColumnValue: ORMColumnConstructors<Columns>,
  pkeys: ORMEntityPKeys<Columns>
};

interface ORMEntityConstructor<Columns> {
  def: ORMEntityStatic<Columns>,
  values: Columns,
};
export abstract class ORMEntity<Columns> implements ORMEntityConstructor<Columns> {
  public readonly def: ORMEntityStatic<Columns>;
  public readonly values: Columns;

  constructor ({ def, values }: ORMEntityConstructor<Columns>) {
    this.def = def;
    this.values = values;
  }

  public static hydrate<Columns> (
    this: ORMEntityStatic<Columns>,
    values: ORMColumnPrimitives<Columns>
  ) {
    const row = {};
    const errors: string[] = [];
    for (const column of Object.keys(this.ColumnValue)) {
      try {
        row[column] = new this.ColumnValue[column](values[column]);
      } catch (e) {
        errors.push(`Column ${column}: ` + (e as Error).message);
      }
    }
    if (errors.length) {
      throw new TypeError(`${this.name}.hydrate() failed to validate:\n  ${errors.join('\n  ')}`);
    }
    return new this({
      def: this,
      values: row as Columns
    });
  }

  toJSON () {
    const json = {};
    for (const column of Object.keys(this.values)) {
      json[column] = this.values[column].value
    }
    return json;
  }

  public static query<Columns>(
    this: ORMEntityStatic<Columns>,
    query?: Knex.QueryBuilder<ORMEntity<Columns>>,
  ): AsyncIterable<ORMEntity<Columns>> {
    const Entity = this;
    if (!query) query = pg.queryBuilder();
    const stream = query.select('*').from(Entity.table).stream();
    return {
      [Symbol.asyncIterator]: async function* () {
        for await (const row of stream) {
          yield Entity.hydrate(row);
        }
      }
    }
  }

  public static async insert<Columns>(
    this: ORMEntityStatic<Columns>,
    row: ORMColumnPrimitivesPartial<Columns>
  ): Promise<ORMEntity<Columns>>;
  public static async insert<Columns>(
    this: ORMEntityStatic<Columns>,
    row: Array<ORMColumnPrimitivesPartial<Columns>>
  ): Promise<Array<ORMEntity<Columns>>>;
  public static async insert<Columns>(
    this: ORMEntityStatic<Columns>,
    rowOrRows: ORMColumnPrimitivesPartial<Columns> | Array<ORMColumnPrimitivesPartial<Columns>>
  ): Promise<ORMEntity<Columns> | Array<ORMEntity<Columns>>> {
    let rows: Array<ORMColumnPrimitivesPartial<Columns>>;
    if (!Array.isArray(rowOrRows)) {
      rows = [rowOrRows];
    } else {
      rows = rowOrRows;
    }

    const errors: string[] = [];
    let idx=0;
    for (const row of rows) {
      for (const column of Object.keys(row)) {
        try {
          new this.ColumnValue[column](row[column]);
        } catch (e) {
          errors.push(`Row ${idx}, column ${column}: ` + (e as Error).message);
        }
      }
      idx++;
    }
    
    if (errors.length) {
      throw new TypeError(`${this.name}.insert() failed to validate:\n  ${errors.join('\n  ')}`);
    }
    
    const insertedRows  = await pg.queryBuilder().insert(rows).returning('*');
    const entities = insertedRows.map(this.hydrate);
    if (Array.isArray(rowOrRows)) {
      return entities;
    } else {
      return entities[0];
    }
  }

  public async update<Columns> (
    this: ORMEntity<Columns>,
    row: Partial<ORMColumnPrimitives<Columns>>
  ): Promise<void> {
    const updatedValues: Partial<Columns> = {};
    for (const column of Object.keys(row)) {
      updatedValues[column] = new this.def.ColumnValue[column](row[column]);
    }
    const where: any = {};
    for (const key of this.def.pkeys) {
      where[key] = (this.values[key] as any).value;
    }

    await pg.queryBuilder().update(row).from(this.def.table).where(where);
    for (const column of Object.keys(updatedValues)) {
      this.values[column] = updatedValues[column];
    }
  }
};
