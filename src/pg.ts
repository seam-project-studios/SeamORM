import Knex from 'knex';
import pg from 'pg';

// BigInt to int
pg.types.setTypeParser(20, function (value) {
  return parseInt(value);
});

export default Knex({
  client: 'pg',
  connection: {
    database: process.env.ORM_DATABASE,
    host: process.env.ORM_HOST,
    port: process.env.ORM_PORT as any,
    user: process.env.ORM_USER,
    password: process.env.ORM_PASSWORD,
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
