import pg from './pg';
import { ORMEntityStatic } from './ORMEntity';

type Tables = {
  [className: string]: ORMEntityStatic<any>
};
export default async function (
  tables: Tables
): Promise<typeof pg> {
  console.log('SeamORM: Checking tables...');

  const { rows: pgTables } = await pg.raw(`
    SELECT *
    FROM information_schema.tables
    WHERE table_schema='public'
  `);
  for (const pgTable of pgTables) {
    const tableName = pgTable.table_name;
    const table = Object.values(tables).find(t => t.table === tableName);
    if (!table) {
      console.log(`SeamORM: Table with no definition: ${tableName}`);
      continue;
    }
    
    const { rows: pgColumns } = await pg.raw(`
      SELECT
        c.table_name, c.column_name, c.data_type, c.column_default, c.is_nullable,
        tc.constraint_type = 'PRIMARY KEY' as primary_key
      FROM information_schema.columns c
      LEFT JOIN information_schema.constraint_column_usage cc ON
        cc.constraint_schema = c.table_schema AND
        cc.table_name = c.table_name AND
        cc.column_name = c.column_name
      LEFT JOIN information_schema.table_constraints tc ON
        tc.constraint_name = cc.constraint_name AND
        tc.constraint_schema = c.table_schema AND
        tc.table_name = c.table_name AND
        tc.constraint_type = 'PRIMARY KEY'
      WHERE
        c.table_schema = 'public' AND
        c.table_name = '${tableName}' AND
        (
          cc.constraint_catalog IS NULL OR
          tc.constraint_type = 'PRIMARY KEY'
        )
    `);
    const tableKeys: string[] = [];
    for (const pgColumn of pgColumns) {
      const column = pgColumn.column_name;
      if (!table.ColumnValue[column]) {
        console.log(`SeamORM: Table column with no definition: ${tableName}.${column}`);
      }
      if (pgColumn.primary_key) {
        tableKeys.push(column);
      }
    }
    if (table.pkeys.sort().toString() !== tableKeys.sort().toString()) {
      throw new Error(`SeamORM: Table keys (${table.pkeys.toString()}) do not match database keys (${tableKeys.toString()})`);
    }
  }

  for (const { table: tableName } of Object.values(tables)) {
    if (!pgTables.find(row => row.table_name === tableName)) {
      console.error(`SeamORM: Definition with no table found: ${tableName}`);
    }
  }

  return pg;
};
