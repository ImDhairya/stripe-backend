import {z} from "zod";
import dotenv from "dotenv";
import {availableParallelism} from "node:os";
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number(),
  DB_URL: z.string(),

  NODE_ENV: z.enum(["development", "production"]),
  // ------tokens start-------
  ACCESS_TOKEN_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRATION: z.string().default("7d"),

  VERIFICATION_TOKEN_SECRET: z.string(),
  VERIFICATION_TOKEN_EXPIRATION: z.string().default("1h"),

  PAYMENT_LINK_TOKEN_SECRET: z.string(),
  PAYMENT_LINK_TOKEN_EXPIRATION: z.string().default("15m"),

  INVITE_LINK_EXPIRATION: z.string().default("1d"),
  SUPPORT_EMAIL: z.email(),
  REDIS_URL: z.string(),
  AWS_ACCESS_KEY: z.string(),
  AWS_SECRET_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_SES_FROM: z.string(),
  AWS_S3_BUCKET: z.string(),

  OPENAI_API_KEY: z.string(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  FRONTEND_URL: z.string().url(),
  WEBHOOK_BASE: z.url(),

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
