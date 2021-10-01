import Knex from 'knex';
require('dotenv-flow').config();
import pg from 'pg';

// BigInt to int
pg.types.setTypeParser(20, function (value) {
  return parseInt(value);
});

export default Knex({
  client: 'pg',
  connection: {
    database: process.env.PGDATABASE,
    host: process.env.PGHOST,
    port: process.env.PGPORT as any,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: false
  },
  pool: {
    min: 5,
    max: 10,
    afterCreate: (connection: pg.Client, callback: Function) => {
      connection.query('SET timezone = UTC;', function (err) {
        callback(err, connection);
      });
    },
  },
});
