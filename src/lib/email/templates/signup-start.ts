import {z} from "zod";
const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify your email</title>
    <style>
      /* Fallback for clients that honor <style> in head */
      .btn {
        background-color: #1a73e8;
        color: #ffffff !important;
        text-decoration: none;
        display: inline-block;
        padding: 12px 20px;
        border-radius: 6px;
        font-weight: 600;
      }
      @media (prefers-color-scheme: dark) {
        body { background: #0b0b0c !important; color: #e6e6e6 !important; }
        .container { background: #111214 !important; }
        .muted { color: #b3b3b3 !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#f7f7f9; color:#111111; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif; line-height:1.5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f9; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);" class="container">
            {{header}}
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 8px 0; font-size:14px; color:#666666;" class="muted">Hi there,</p>
                <h1 style="margin:0 0 12px 0; font-size:20px;">Verify your email to continue</h1>
                <p style="margin:0 0 20px 0; font-size:14px; color:#333333;">
                  Thanks for signing up for {{appName}}. Please confirm your email to finish creating your account.
                </p>
                <p style="margin:0 0 20px 0;">
                  <a href="{{verificationLink}}" class="btn" style="background:#1a73e8; color:#ffffff; text-decoration:none; display:inline-block; padding:12px 20px; border-radius:6px; font-weight:600;">
                    Verify email
                  </a>
                </p>
                <p style="margin:0 0 8px 0; font-size:12px; color:#666666;" class="muted">
                  Button not working? Paste this link into your browser:
                </p>
                <p style="margin:0 0 20px 0; font-size:12px; word-break:break-all;">
                  <a href="{{verificationLink}}" style="color:#1a73e8; text-decoration:underline;">{{verificationLink}}</a>
                </p>

                <p style="margin:0 0 12px 0; font-size:12px; color:#666666;" class="muted">
                  For your security, this link expires in 30 minutes and can only be used once.
                </p>

                <p style="margin:0; font-size:12px; color:#666666;" class="muted">
                  If you didn't create an account, you can safely ignore this email.
                </p>
              </td>
            </tr>
            {{footer}}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
const text = `
Hi there,

Thanks for signing up for Your App Name. Please confirm your email to finish creating your account.

Verify your email: {{verificationLink}}

For your security, this link expires in 30 minutes and can only be used once.
If you didn't create an account, you can ignore this message.

`;
export default {
  subject: "Welcome to Stripe! Please Verify Your Email",
  body: html,
  text: text,
  dataSchema: z.object({
    verificationLink: z.string().url(),
    name: z.string().optional(),
  }),
};
