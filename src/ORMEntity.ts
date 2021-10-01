import { Knex } from 'knex';
import pg from './pg';
import { ORMEntityStatic, ORMEntityConstructor, ORMColumnPrimitives, ORMColumnPrimitivesPartial } from './types';

export abstract class ORMEntity<Columns> implements ORMEntityConstructor<Columns> {
  readonly def: ORMEntityStatic<Columns>;
  readonly values: Columns;

  constructor ({ def, values }: ORMEntityConstructor<Columns>) {
    this.def = def;
    this.values = values;
  }

  static hydrate<Columns> (
    this: ORMEntityStatic<Columns>,
    values: ORMColumnPrimitives<Columns>
  ) {
    return new this({
      def: this,
      values: this.validate('hydrate', values)
    });
  }

  toJSON () {
    const json = {};
    for (const column of Object.keys(this.values)) {
      json[column] = this.values[column].value
    }
    return json;
  }

  static query<Columns>(
    this: ORMEntityStatic<Columns>,
    query?: Knex.QueryBuilder<ORMEntity<Columns>>,
  ): AsyncIterable<ORMEntity<Columns>> {
    const Entity = this;
    if (!query) query = pg.queryBuilder();
    const select = Entity.buildSelect();
    query.select(select).from(Entity.table);

    const stream = query.stream();
    return {
      [Symbol.asyncIterator]: async function* () {
        for await (const row of stream) {
          yield Entity.hydrate(row);
        }
      }
    }
  }

  static async queryOne<Columns>(
    this: ORMEntityStatic<Columns>,
    query?: Knex.QueryBuilder<ORMEntity<Columns>>,
  ): Promise<ORMEntity<Columns>> {
    const Entity = this;
    if (!query) query = pg.queryBuilder();
    const select = Entity.buildSelect();
    query.select(select).from(Entity.table).first();

    const row = await query;
    return Entity.hydrate(row);
  }

  static async insert<Columns>(
    this: ORMEntityStatic<Columns>,
    row: ORMColumnPrimitivesPartial<Columns>
  ): Promise<ORMEntity<Columns>>;
  static async insert<Columns>(
    this: ORMEntityStatic<Columns>,
    row: Array<ORMColumnPrimitivesPartial<Columns>>
  ): Promise<Array<ORMEntity<Columns>>>;
  static async insert<Columns>(
    this: ORMEntityStatic<Columns>,
    rowOrRows: ORMColumnPrimitivesPartial<Columns> | Array<ORMColumnPrimitivesPartial<Columns>>
  ): Promise<ORMEntity<Columns> | Array<ORMEntity<Columns>>> {
    let rows: Array<ORMColumnPrimitivesPartial<Columns>>;
    let isArray: boolean;
    if (!Array.isArray(rowOrRows)) {
      isArray = false;
      rows = [rowOrRows];
    } else {
      isArray = true;
      rows = rowOrRows;
    }
    
    for (const row of rows) {
      this.validate('insert', row);
    }

    const query = pg.queryBuilder().insert(rows).from(this.table).returning(this.buildSelect());
    const insertedRows = await query;
    const entities = (insertedRows as ORMColumnPrimitives<Columns>[]).map(this.hydrate);
    if (isArray) {
      return entities;
    } else {
      return entities[0];
    }
  }

  public async update<Columns> (
    this: ORMEntity<Columns>,
    row: ORMColumnPrimitivesPartial<Columns>
  ): Promise<void> {
    const updatedValues = this.def.validate('update', row);
    for (const column of Object.keys(row)) {
      updatedValues[column] = new this.def.ColumnValue[column](row[column]);
    }
    const where = this.buildWhere();
    await pg.queryBuilder().update(row).from(this.def.table).where(where);
    for (const column of Object.keys(updatedValues)) {
      this.values[column] = updatedValues[column];
    }
  }

  public async delete<Columns> (
    this: ORMEntity<Columns>,
  ): Promise<void> {
    const where = this.buildWhere();
    await pg.queryBuilder().delete().from(this.def.table).where(where);
  }
  
  public static buildSelect<Columns> (
    this: ORMEntityStatic<Columns>
  ): string[] {
    const select: string[] = [];
    for (const key of Object.keys(this.ColumnValue)) {
      select.push(`${this.table}.${key}`);
    }
    return select;
  }

  private buildWhere (): any {
    const where: any = {};
    for (const key of this.def.pkeys) {
      where[`${this.def.table}.${key}`] = (this.values[key] as any).value;
    }
    return where;
  }

  static validate<Columns> (
    this: ORMEntityStatic<Columns>,
    functionName: string,
    values: ORMColumnPrimitivesPartial<Columns>
  ): Columns {
    const errors: string[] = [];
    const row = {};
    for (const column of Object.keys(this.ColumnValue)) {
      try {
        row[column] = new this.ColumnValue[column](values[column]);
      } catch (e) {
        errors.push(`Column ${column}: ` + (e as Error).message);
      }
    }
    if (errors.length) {
      throw new TypeError(`${this.table}.${functionName}() failed to validate:\n  ${errors.join('\n  ')}`);
    }
    return row as Columns;
  };
};
