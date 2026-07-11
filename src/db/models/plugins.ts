import { jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { commonFields } from "./common";
import { users } from "./users";

export const pluginInstances = pgTable("plugins", {
  ...commonFields,
  name: text("name").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  configuration: jsonb("configuration").notNull(),
  state: jsonb("state").default({}),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export type PluginsInstance = typeof pluginInstances.$inferSelect;
export type NewPluginInstance = typeof pluginInstances.$inferInsert;
