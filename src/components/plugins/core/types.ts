import z, {ZodTypeAny} from "zod";

type OnEvent<T extends ZodTypeAny> = (
  event: Event,
  options: {
    configuration: z.infer<T>;
    tx: DbConnection;
    userId: string;
    pluginInstanceId: string;
  },
) => Promise<void>;

type OnInstall<T extends ZodTypeAny> = (ctx: {
  tx: DbConnection;
  configuration: z.infer<T>;
  userId: string;
  pluginInstanceId: string;
}) => Promise<void>;

export type Webhook<T extends ZodTypeAny> = {
  /**
   * The path at which the webhook will be exposed
   * The base path for the webhook will be
   * `/api/v1/plugins/webhooks/<plugin-id>`
   * @example
   *  path = "/invited" will resolve to "/api/v1/plugins/webhooks/<plugin-id>/invited"
   */
  path: string;
  method: "post" | "get";
  handler: (ctx: {
    req: Request;
    res: Response;
    configuration: z.infer<T>;
    pluginInstanceId: string;
    tx: DbConnection;
  }) => Promise<void> | void;
};

export type Plugin<T extends ZodTypeAny = ZodTypeAny> = {
  id: string;
  type: "data";
  configurationSchema: T;
  description?: string;
  /**
   * Set to true to allow multiple installations of the plugin per user
   */
  allowMultiple?: boolean;
  /**
   * Will be called when an event is received
   * @note This is async — if you need to do something before
   * the response is sent, use `onEventSync` instead
   */
  onEvent?: OnEvent<T>;
  /**
   * Will be called synchronously when an event is received.
   * Useful for plugins that need to respond to events immediately.
   */
  onEventSync?: OnEvent<T>;
  /**
   * Will be called when the plugin is installed
   * @note This is async — if you need to do something before
   * the response is sent, use `onInstallSync` instead
   */
  onInstall?: OnInstall<T>;
  /**
   * Will be called synchronously when the plugin is installed.
   * Useful for plugins that need to setup webhooks or other
   * resources before the installation is complete.
   */
  onInstallSync?: OnInstall<T>;
  /**
   * @deprecated Use `onInstallSync` instead.
   *
   * Validates configuration beyond what `configurationSchema` covers
   * (e.g. checking if provided API keys are valid by calling upstream services).
   */
  additionalValidation?: (config: z.infer<T>) => Promise<void>;
  /**
   * Webhooks exposed by this plugin
   */
  webhooks?: Webhook<T>[];
};

export const createPlugin = <T extends ZodTypeAny>(plugin: Plugin<T>) => {
  return {
    ...plugin,
  } as const;
};
