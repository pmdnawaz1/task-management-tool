import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig as any);

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any
const auth = cache(uncachedAuth as any);

export { auth, handlers, signIn, signOut };
