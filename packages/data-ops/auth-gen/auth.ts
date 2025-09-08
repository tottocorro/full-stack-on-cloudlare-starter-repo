import { createBetterAuth } from "@/auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

type BetterAuthInstance = ReturnType<typeof createBetterAuth>;

export const auth: BetterAuthInstance = createBetterAuth(drizzleAdapter(
  {},
  {
    provider: "sqlite"
  }
))
