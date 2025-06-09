import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { sendEmail } from '~/utils/email';

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  deadline: z.date().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  assignedToId: z.string(),
  tags: z.array(z.string()).optional(),
  dod: z.string().optional(),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
  })).optional(),
});

export const tasksRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.task.findMany({
      include: {
        assignedTo: true,
        createdBy: true,
        attachments: true,
        comments: {
          include: {
            author: true,
            attachments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: { id: input.id },
        include: {
          assignedTo: true,
          createdBy: true,
          attachments: true,
          comments: {
            include: {
              author: true,
              attachments: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      return task;
    }),

  create: protectedProcedure
    .input(taskSchema)
    .mutation(async ({ ctx, input }) => {
      const { attachments, ...taskData } = input;
      
      const task = await ctx.db.task.create({
        data: {
          ...taskData,
          createdById: ctx.session.user.id,
        },
        include: {
          assignedTo: true,
          createdBy: true,
          attachments: true,
        },
      });

      // Create attachments if provided
      if (attachments && attachments.length > 0) {
        await ctx.db.attachment.createMany({
          data: attachments.map(attachment => ({
            taskId: task.id,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            fileSize: attachment.fileSize,
            mimeType: attachment.mimeType,
          }))
        });
      }

      // Send email notification to assigned user
      await sendEmail({
        to: task.assignedTo.email,
        subject: `New Task Assigned: ${task.title}`,
        text: `You have been assigned a new task: ${task.title}\n\nDescription: ${task.description ?? 'No description'}\nPriority: ${task.priority}\nDeadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}`,
      });

      return task;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      deadline: z.date().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
      tags: z.array(z.string()).optional(),
      assignedToId: z.string().optional(),
      status: z.enum(["OPEN", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
      dod: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      
      // First check if task exists and get current data
      const task = await ctx.db.task.findUnique({
        where: { id },
        include: {
          assignedTo: true,
          createdBy: true,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Check if user has permission to update task
      const isAdmin = ctx.session.user.role === 'ADMIN';
      const isCreator = task.createdById === ctx.session.user.id;

      if (!isAdmin && !isCreator) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins and task creators can update tasks',
        });
      }
      
      const updatedTask = await ctx.db.task.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: true,
          createdBy: true,
          attachments: true,
          comments: {
            include: {
              author: true,
              attachments: true,
            },
          },
        }
      });

      // Send email notification if assignee was changed
      if (updateData.assignedToId && updateData.assignedToId !== task.assignedToId) {
        try {
          await sendEmail({
            to: updatedTask.assignedTo.email,
            subject: `Task Reassigned: ${updatedTask.title}`,
            text: `You have been assigned to task "${updatedTask.title}" by ${ctx.session.user.name}.`,
            html: `
              <h2>Task Reassigned</h2>
              <p>You have been assigned to task "<strong>${updatedTask.title}</strong>" by <strong>${ctx.session.user.name}</strong>.</p>
              <p><strong>Description:</strong> ${updatedTask.description ?? 'No description'}</p>
              <p><strong>Priority:</strong> ${updatedTask.priority}</p>
              <p><strong>Deadline:</strong> ${updatedTask.deadline ? new Date(updatedTask.deadline).toLocaleDateString() : 'No deadline'}</p>
            `
          });
        } catch (emailError) {
          console.error('Failed to send assignment email:', emailError);
        }
      }

      return updatedTask;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.task.delete({
        where: { id: input.id }
      });
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['OPEN', 'IN_PROGRESS', 'REVIEW', 'DONE']),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: { id: input.id },
        include: {
          assignedTo: true,
          createdBy: true,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Check if user has permission to change status
      const isAdmin = ctx.session.user.role === 'ADMIN';
      const isAssignedUser = task.assignedToId === ctx.session.user.id;

      if (!isAdmin && !isAssignedUser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins and assigned users can change task status',
        });
      }

      const updatedTask = await ctx.db.task.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          assignedTo: true,
          createdBy: true,
        },
      });

      // Send email notification to task creator
      if (task.createdById !== ctx.session.user.id) {
        await sendEmail({
          to: task.createdBy.email,
          subject: `Task Status Updated: ${task.title}`,
          text: `The status of task "${task.title}" has been updated to ${input.status} by ${ctx.session.user.name}.`,
        });
      }

      return updatedTask;
    }),

  addComment: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      content: z.string(),
      mentions: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // First verify the author exists
      const author = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!author) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Author not found. Session user ID: ${ctx.session.user.id}`,
        });
      }

      const task = await ctx.db.task.findUnique({
        where: { id: input.taskId },
        include: {
          assignedTo: true,
          createdBy: true,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Get mentioned users
      const mentionedUsers = await ctx.db.user.findMany({
        where: {
          id: {
            in: input.mentions,
          },
        },
      });

      // Create the comment first
      const comment = await ctx.db.comment.create({
        data: {
          content: input.content,
          taskId: input.taskId,
          authorId: author.id,
          mentions: {
            create: input.mentions.map(userId => ({
              userId: userId,
            })),
          },
        },
        include: {
          author: true,
          mentions: {
            include: {
              user: true,
            },
          },
        },
      });

      // Send email notifications asynchronously
      try {
        // Send email notifications to mentioned users
        for (const user of mentionedUsers) {
          if (user.id !== author.id && user.email) {
            try {
              await sendEmail({
                to: user.email,
                subject: `You were mentioned in a task comment`,
                text: `${author.name} mentioned you in a comment on task "${task.title}":\n\n${input.content}`,
              });
            } catch (emailError) {
              // Continue with other emails even if one fails
            }
          }
        }

        // Send email notification to task creator and assigned user if they weren't the commenter
        const notifyUsers = [task.createdBy, task.assignedTo].filter(
          user => user.id !== author.id && user.email
        );

        for (const user of notifyUsers) {
          try {
            await sendEmail({
              to: user.email,
              subject: `New comment on task: ${task.title}`,
              text: `${author.name} commented on task "${task.title}":\n\n${input.content}`,
            });
          } catch (emailError) {
            // Continue with other emails even if one fails
          }
        }
      } catch (error) {
        // Don't throw the error - we still want to return the comment
      }

      return comment;
    }),

  addAttachment: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      attachments: z.array(z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify task exists and user has access
      const task = await ctx.db.task.findUnique({
        where: { id: input.taskId },
        include: {
          assignedTo: true,
          createdBy: true,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Check if user has permission to add attachments
      const isAdmin = ctx.session.user.role === 'ADMIN';
      const isAssignedUser = task.assignedToId === ctx.session.user.id;
      const isCreator = task.createdById === ctx.session.user.id;

      if (!isAdmin && !isAssignedUser && !isCreator) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins, assigned users, and task creators can add attachments',
        });
      }

      // Create attachments
      await ctx.db.attachment.createMany({
        data: input.attachments.map(attachment => ({
          taskId: input.taskId,
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
        }))
      });

      return { success: true };
    }),
});
