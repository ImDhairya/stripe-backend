import {db as _db} from "../../../db";
import {users} from "../../../db/models";

type Options = {
  shouldThrow?: boolean;
  db?: DbConnection;
};

export default async (
  email: string,
  opt: Options = {shouldThrow: true, db: _db},
) => {
  const db = opt.db ?? _db;
  try {
    const user = await db.query.users.findFirst({
      where: (users, {eq}) => eq(users.email, email.toLocaleLowerCase()),
     });
    console.log(user, "fejifjeifjiefjeii");
    if (user) return user;
    if (opt.shouldThrow) {
      throw new Error(`User with email ${email} not found.`);
    }
    return null;
  } catch (err) {
    console.error("getUserByEmail error:", err); // ← this will show the real error
    throw err;
  }
};
