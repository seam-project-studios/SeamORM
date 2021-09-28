import pg from './pg';
import SeamORM from './src';
import { ORMColumns, ORMEntity, ORMEntityStatic, ORMEntityPKeys, StaticImplements } from './src/ORMEntity';
import { vBoolean, vDateOrNull, vString, vStringOrNull, vUUID } from './src/ORMValue';

type UserColumns = ORMColumns<typeof User.ColumnValue>;
@StaticImplements<ORMEntityStatic<UserColumns>>()
class User extends ORMEntity<UserColumns> {
  static table = 'user';
  static pkeys: ORMEntityPKeys<UserColumns> = ['id'];
  static ColumnValue = {
    id: vUUID,
    deleted: vBoolean,
    createdDate: vDateOrNull,
    updatedDate: vDateOrNull,
    deletedDate: vDateOrNull,
    type: vString,
    email: vString,
    token: vString,
    firstName: vString,
    lastName: vString,
    avatar: vStringOrNull
  };
};

type StaffUserColumns = ORMColumns<typeof StaffUser.ColumnValue>;
@StaticImplements<ORMEntityStatic<StaffUserColumns>>()
class StaffUser extends ORMEntity<StaffUserColumns> {
  static table = 'staffUser';
  static pkeys: ORMEntityPKeys<StaffUserColumns> = ['id'];
  static ColumnValue = {
    id: vUUID,
  };
};

(async () => {
  await SeamORM(pg, {
    User, StaffUser
  });

  const q = pg.queryBuilder().where({ id: 'e5335a91-bdc3-4461-aa7a-7992ff29e139' });
  for await (const row of User.query(q)) {
    console.log(row.toJSON());
    // await row.update({ firstName: 'testington' });
    // console.log(row.toJSON());
  }

  const su = await StaffUser.insert([{
    id: 'test'
  }]);

  for await (const row of StaffUser.query()) {
    console.log(JSON.stringify(row, null, 2));
  }
})();