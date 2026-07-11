import {db as _db, DBConnection} from "../../../db";
import {users} from "../../../db/models";
import {errors} from "../../../lib/errors";

const getUserById = async (
  id: string,
  {tx = _db}: {tx?: DBConnection} = {},
) => {
  const user = await tx.query.users.findFirst({
    where: (users, {eq}) => eq(users.id, id),
    columns: {
      password: false,
    },
  });

  if (!user) {
    throw new errors.NotFoundError(
      "resource:not_found",
      "users",
      "Users not found.",
    );
  }
  return user;
};

export default getUserById;
