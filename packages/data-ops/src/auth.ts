import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./db/database";
import { account, session, user, verification } from "./drizzle-out/auth-schema";

type BetterAuthInstance = ReturnType<typeof betterAuth>;

let auth: BetterAuthInstance;

export function createBetterAuth(
    database: NonNullable<Parameters<typeof betterAuth>[0]>["database"],
    google?: { clientId: string; clientSecret: string },
  ): BetterAuthInstance {
    return betterAuth({
      database,
      emailAndPassword: {
        enabled: false,
      },
      socialProviders: {
        google: {
          clientId: google?.clientId ?? "",
          clientSecret: google?.clientSecret ?? "",
        },
      },
    });
  }


export function getAuth(google: { clientId: string; clientSecret: string }): BetterAuthInstance {
    if (auth) return auth;
  
    auth = createBetterAuth(
      drizzleAdapter(getDb(), {
        provider: "sqlite",
        schema: {
          user,
          session,
          account,
          verification
        }
      }),
      google,
    );
    return auth;
}
