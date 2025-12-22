import { cookies as getCookies } from "next/headers";

interface Props {
  prefix: string;
  value: string;
  rememberMe?: boolean; // If true, session persists; if false, session expires when browser closes
};

export const generateAuthCookie = async ({
  prefix,
  value,
  rememberMe = true, // Default to persistent session
}: Props) => {
  const cookies = await getCookies();

  const isProduction = process.env.NODE_ENV === "production";
  const isLocalhost = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.includes("localhost");

  // Set maxAge based on rememberMe
  // If rememberMe is true: 30 days (2592000 seconds)
  // If rememberMe is false: undefined (session cookie - expires when browser closes)
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : undefined;

  cookies.set({
    name: `${prefix}-token`,
    value,
    httpOnly: true,
    path: "/",
    maxAge, // Session persists for 30 days if rememberMe, otherwise expires on browser close
    // For production with actual domain (not localhost)
    ...(isProduction && !isLocalhost && {
      sameSite: "none",
      domain: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
      secure: true,
    }),
    // For localhost in production mode or development
    ...((isLocalhost || !isProduction) && {
      sameSite: "lax",
      // Don't set domain for localhost - let browser handle it
    }),
  });
};

export const clearAuthCookie = async (prefix: string) => {
  const cookies = await getCookies();

  const isProduction = process.env.NODE_ENV === "production";
  const isLocalhost = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.includes("localhost");

  cookies.set({
    name: `${prefix}-token`,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0, // Expire immediately
    // For production with actual domain (not localhost)
    ...(isProduction && !isLocalhost && {
      sameSite: "none",
      domain: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
      secure: true,
    }),
    // For localhost in production mode or development
    ...((isLocalhost || !isProduction) && {
      sameSite: "lax",
      // Don't set domain for localhost - let browser handle it
    }),
  });
};
