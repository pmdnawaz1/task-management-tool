/// <reference path="./.sst/platform/config.d.ts" />

import { type StackContext, NextjsSite } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "task-management-tool",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }: StackContext) {
      const site = new NextjsSite(stack, "TaskManagementApp", {
        openNextVersion: "3.1.0",
        environment: {
          DATABASE_URL: process.env.DATABASE_URL ?? "",
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "",
          NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "",
          NEXTAUTH_SUPABASE_URL: process.env.NEXTAUTH_SUPABASE_URL ?? "",
          NEXTAUTH_SUPABASE_ANON_KEY: process.env.NEXTAUTH_SUPABASE_ANON_KEY ?? "",
          NEXTAUTH_SUPABASE_SERVICE_ROLE_KEY: process.env.NEXTAUTH_SUPABASE_SERVICE_ROLE_KEY ?? "",
          EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER ?? "",
          EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD ?? "",
          EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST ?? "",
          EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT ?? "",
          EMAIL_FROM: process.env.EMAIL_FROM ?? "",
        },
      });

      stack.addOutputs({
        SiteUrl: site.url,
      });
    });
  },
};
