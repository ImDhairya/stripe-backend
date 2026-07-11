import {db} from "../../../db";
import {UserInsert, users} from "../../../db/models";

type Data = {
  user: UserInsert;
};
const createUser = async (data: Data, tx: DbConnection = db) => {
  console.log(data.user, "JJJI");
  const [user] = await tx
    .insert(users)
    .values({
      ...data.user,
      email: data.user.email.toLowerCase(),
    })
    .returning();

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
};

export default createUser;
