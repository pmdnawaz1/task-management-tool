import { authRouter } from "~/server/api/routers/auth";
import { tasksRouter } from "~/server/api/routers/tasks";
import { commentsRouter } from "~/server/api/routers/comments";
import { usersRouter } from "~/server/api/routers/users";
import { createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  tasks: tasksRouter,
  comments: commentsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
