import {z} from "zod";
import dotenv from "dotenv";
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number(),
  DB_URL: z.string(),
  DATABASE_URL: z.string(),

  NODE_ENV: z.enum(["development", "production"]),
  
  ACCESS_TOKEN_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRATION: z.string().default("15m"),

  REFRESH_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_EXPIRATION: z.string().default("30d"),

  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),

  REDIS_URL: z.string(),

  FRONTEND_URL: z.string().url(),
  WEBHOOK_BASE: z.string().url(),

  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((val) =>
      val
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
});

const parsed = envSchema.safeParse(process.env);
let env: z.infer<typeof envSchema>;

if (parsed.success === false) {
  const errors = parsed.error.issues.reduce(
    (acc, err) => {
      acc[err.path.join(".")] = err.message;
      return acc;
    },
    {} as Record<string, string>,
  );
  console.error("Invalid environment variables:", errors);
  throw new Error("Unable to parse the env data ");
}

env = parsed.data;
export default env;
