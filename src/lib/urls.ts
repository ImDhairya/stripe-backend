import env from "./env";

const generateSignupUrl = ({token, email}: {token: string; email: string}) => {
  return `${
    env.FRONTEND_URL
  }/auth?mode=signup-complete&token=${token}&email=${encodeURIComponent(
    email,
  )}`;
};

export default {
  generateSignupUrl,
};
