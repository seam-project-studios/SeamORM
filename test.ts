require('dotenv-flow').config();
import { validate as uuid } from 'uuid';

import SeamORM from './src';
import { ORMColumns, ORMEntityStatic, StaticImplements } from './src/types';
import { ORMEntity } from './src/ORMEntity';

const UserColumns = {
  id: { type: String, primaryKey: true, required: true, valid: uuid },
  deleted: { type: Boolean, required: true },
  createdDate: { type: Date },
  updatedDate: { type: Date, nullable: true },
  deletedDate: { type: Date, nullable: true },
  token: { type: String, selectable: false, nullable: true },
  type: { type: String, required: true },
  email: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  avatar: { type: String, nullable: true }
};

@StaticImplements<ORMEntityStatic<ORMColumns<typeof UserColumns>>>()
class User extends ORMEntity<ORMColumns<typeof UserColumns>> {
  static table = 'user';
  static columns = UserColumns;
};

const StaffUserColumns = {
  id: { type: String, primaryKey: true, required: true, valid: uuid }
};

@StaticImplements<ORMEntityStatic<ORMColumns<typeof StaffUserColumns>>>()
class StaffUser extends ORMEntity<ORMColumns<typeof StaffUserColumns>> {
  static table = 'staffUser';
  static columns = StaffUserColumns;
};

(async () => {
  const knex = await SeamORM({ User, StaffUser });

  const q = knex.queryBuilder(); //.where({ id: 'e5335a91-bdc3-4461-aa7a-7992ff29e139' });
  for await (const row of User.select(q)) {
    console.log(row.toJSON());
    // await row.update({ firstName: 'Firm' });
    // console.log(row.toJSON());
  }
  
   const u = await User.insert({
     id: '1'
   });
})();
