import z, {keyof, TypeOf} from "zod";
import templates from "../email/templates/index";
import {SESv2Client, SendEmailCommand} from "@aws-sdk/client-sesv2";
import {Attachment} from "nodemailer/lib/mailer";
import nodemailer from "nodemailer";
import env from "../env";
import header from "./header";
import footer from "./footer";

type TemplateName = keyof typeof templates;

type Params<TName extends TemplateName> = {
  to: string;
  template: TName;
  data: z.infer<(typeof templates)[TName]["dataSchema"]>;
  attachments?: Attachment[];
};

type Send = <TName extends TemplateName>(
  params: Params<TName>,
) => Promise<void>;

const ses = new SESv2Client({
  apiVersion: "2010-12-01",
  region: env.AWS_REGION,
  credentials: {
    secretAccessKey: env.AWS_SECRET_KEY,
    accessKeyId: env.AWS_ACCESS_KEY,
  },
});

const transport = nodemailer.createTransport({
  SES: {sesClient: ses, SendEmailCommand: SendEmailCommand},
});

export const getCommonVariables = () => {
  return {
    appName: "Stripe",
    logoURL: env.FRONTEND_URL + "/logo.png",
    currentYear: new Date().getFullYear().toString(),
    support_url: `mailto:${env.SUPPORT_EMAIL}`,
    live_url: env.FRONTEND_URL,
  };
};

const compileHTML = (rawHTML: string, data: any) => {
  let compiledHTML = rawHTML;
  if (rawHTML.includes("{{header}}")) {
    compiledHTML = compiledHTML.replace("{{header}}", header);
  }
  if (rawHTML.includes("{{footer}}")) {
    compiledHTML = compiledHTML.replace("{{footer}}", footer);
  }
  const commonVariables = getCommonVariables();
  compiledHTML = compiledHTML.replace(/{{(.*?)}}/g, (_, key) => {
    const trimmedKey = key.trim();
    if (data[trimmedKey as keyof typeof data]) {
      return data[trimmedKey as keyof typeof data] as string;
    }
    if (commonVariables[trimmedKey as keyof typeof commonVariables]) {
      return commonVariables[
        trimmedKey as keyof typeof commonVariables
      ] as string;
    }
    return "";
  });
  return compiledHTML;
};

export const send: Send = async ({to, template, data, attachments}) => {
  const emailTemplate = templates[template];
  if (!emailTemplate) {
    throw new Error(`Email template ${template} does not exist`);
  }
  const commonVariables = getCommonVariables();

  const rawHTML = emailTemplate.body;

  const compiledHTML = compileHTML(rawHTML, data);

  const subject = emailTemplate.subject.replace(/{{(.*?)}}/g, (_, key) => {
    const trimmedKey = key.trim();
    if (data[trimmedKey as keyof typeof data]) {
      return data[trimmedKey as keyof typeof data] as string;
    }
    if (commonVariables[trimmedKey as keyof typeof commonVariables]) {
      return commonVariables[
        trimmedKey as keyof typeof commonVariables
      ] as string;
    }
    return "";
  });

  try {
    await transport.sendMail({
      from: env.AWS_SES_FROM,
      to,
      subject,
      html: compiledHTML,
      attachments,
    });
  } catch (err) {
    console.error("sendMail failed:", err); // ← will show exact AWS error
    throw err;
  }

  return;
};
