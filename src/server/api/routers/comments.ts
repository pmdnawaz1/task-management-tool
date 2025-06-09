import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const commentsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      content: z.string().min(1),
      taskId: z.string(),
      mentions: z.array(z.string()).default([]),
      attachments: z.array(z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      })).default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const { mentions, attachments, ...commentData } = input;
      
      const comment = await ctx.db.comment.create({
        data: {
          ...commentData,
          authorId: ctx.session.user.id,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          attachments: true,
          mentions: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });

      // Create mentions
      if (mentions.length > 0) {
        await ctx.db.mention.createMany({
          data: mentions.map(userId => ({
            commentId: comment.id,
            userId,
          }))
        });
      }

      // Create attachments
      if (attachments.length > 0) {
        await ctx.db.commentAttachment.createMany({
          data: attachments.map(attachment => ({
            commentId: comment.id,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            fileSize: attachment.fileSize,
            mimeType: attachment.mimeType,
          }))
        });
      }

      return comment;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.comment.update({
        where: { 
          id: input.id,
          authorId: ctx.session.user.id, // Only allow updating own comments
        },
        data: { 
          content: input.content,
          updatedAt: new Date(),
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.comment.delete({
        where: { 
          id: input.id,
          authorId: ctx.session.user.id, // Only allow deleting own comments
        }
      });
    }),
});
