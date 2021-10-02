import { Knex } from 'knex';
import pg from './pg';
import { ORMEntityStatic, ORMEntityConstructor, ORMColumns } from './types';

export abstract class ORMEntity<Columns> implements ORMEntityConstructor<Columns> {
  readonly def: ORMEntityStatic<Columns>;
  readonly values: Columns;

  constructor ({ def, values }: ORMEntityConstructor<Columns>) {
    this.def = def;
    this.values = values;
  }

  static hydrate<Columns> (
    this: ORMEntityStatic<Columns>,
    values: ORMColumns<Columns, any>
  ) {
    this.validate('hydrate', values);
    return new this({
      def: this,
      values
    });
  }

  toJSON () {
    const json = {};
    for (const column of Object.keys(this.values)) {
      json[column] = this.values[column];
    }
    return json;
  }

  static select<Columns>(
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

  static async selectOne<Columns>(
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
    row: Partial<ORMColumns<Columns, any>>
  ): Promise<ORMEntity<Columns>>;
  static async insert<Columns>(
    this: ORMEntityStatic<Columns>,
    row: Array<Partial<ORMColumns<Columns, any>>>
  ): Promise<Array<ORMEntity<Columns>>>;
  static async insert<Columns>(
    this: ORMEntityStatic<Columns>,
    rowOrRows: Partial<ORMColumns<Columns, any>> | Array<Partial<ORMColumns<Columns, any>>>
  ): Promise<ORMEntity<Columns> | Array<ORMEntity<Columns>>> {
    let rows: Array<Partial<ORMColumns<Columns, any>>>;
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
    const entities = (insertedRows as ORMColumns<Columns, any>[]).map(this.hydrate);
    if (isArray) {
      return entities;
    } else {
      return entities[0];
    }
  }

  public async update<Columns> (
    this: ORMEntity<Columns>,
    row: Partial<ORMColumns<Columns, any>>
  ): Promise<void> {
    this.def.validate('update', row);
    const where = this.buildWhere();
    await pg.queryBuilder().update(row).from(this.def.table).where(where);
    for (const column of Object.keys(row)) {
      this.values[column] = row[column];
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
    for (const key of Object.keys(this.columns)) {
      if (this.columns[key].selectable === false) continue;
      select.push(`${this.table}.${key}`);
    }
    return select;
  }

  private buildWhere (): any {
    const where: any = {};
    for (const key of Object.keys(this.def.columns)) {
      if (this.def.columns[key].primaryKey !== true) continue;
      where[`${this.def.table}.${key}`] = this.values[key];
    }
    return where;
  }

  static validate<Columns> (
    this: ORMEntityStatic<Columns>,
    method: 'insert' | 'update' | 'hydrate',
    values: Partial<ORMColumns<Columns, any>>
  ): void {
    const errors: string[] = [];
    for (const key of Object.keys(values)) {
      const column = this.columns[key as keyof Columns];
      const value = values[key];
      if (value === null) {
        if (column.nullable !== true) {
          errors.push(`${key} expected not null, received: null`);
        }
      } else if (value.constructor !== column.type) {
        errors.push(`${key} expected: ${column.type.name}, received: ${JSON.stringify(value)}`);
      } else if (column.valid && !column.valid(value)) {
        errors.push(`${key} failed validation, received: ${JSON.stringify(value)}`);
      }
    }
    if (method === 'insert') {
      const requiredColumns = Object.keys(this.columns).filter(key =>
        this.columns[key as keyof Columns].required === true
      );
      for (const requiredColumn of requiredColumns) {
        if (typeof values[requiredColumn] === 'undefined') {
          errors.push(`${requiredColumn} is required`);
        }
      }
    }
    if (errors.length) {
      throw new TypeError(`${this.table}.${method}() failed to validate:\n  ${errors.join('\n  ')}`);
    }
  };
};
