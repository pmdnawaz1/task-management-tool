import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { supabase, supabaseAdmin } from "~/lib/supabase";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { sendEmail } from "~/utils/email";
import { Prisma } from "@prisma/client";

export const authRouter = createTRPCRouter({
  signUp: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(input.password, 10);

        // Create user in Supabase Auth first
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
        });

        if (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        // Create user in our database
        const user = await ctx.db.user.create({
          data: {
            email: input.email,
            name: input.name,
            password: hashedPassword,
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=random`,
          },
        });

        return { user, supabaseUser: data.user };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A user with this email already exists",
            });
          }
        }
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }
    }),

  inviteUser: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user is admin
      const currentUser = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id }
      });

      if (currentUser?.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can invite users",
        });
      }

      try {
        // Check if user already exists
        const existingUser = await ctx.db.user.findUnique({
          where: { email: input.email }
        });

        if (existingUser) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A user with this email already exists",
          });
        }

        const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Generate reset token
        const resetToken = await bcrypt.hash(input.email + Date.now().toString(), 10);
        const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user in our database first
        const user = await ctx.db.user.create({
          data: {
            email: input.email,
            name: input.name,
            password: hashedPassword,
            invitedById: ctx.session.user.id,
            resetToken,
            resetTokenExpiry,
          },
        });

        // Create user in Supabase Auth
        const { error } = await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: tempPassword,
          email_confirm: true,
        });

        if (error) {
          // If Supabase creation fails, delete the user from our database
          await ctx.db.user.delete({
            where: { id: user.id }
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        // Send invitation email
        const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
        const resetUrl = `${frontendUrl}/auth/set-password?token=${resetToken}`;

        console.log('Sending invitation email to:', input.email);
        console.log('Reset URL:', resetUrl);
        console.log('Frontend URL:', frontendUrl);

        try {
          await sendEmail({
            to: input.email,
            subject: "Welcome to Task Management Tool",
            text: `You have been invited to join the Task Management Tool. Please set your password by clicking the following link: ${resetUrl}`,
            html: `
              <h1>Welcome to Task Management Tool</h1>
              <p>You have been invited to join the Task Management Tool.</p>
              <p>Please set your password by clicking the following link:</p>
              <p>Your temporary password is: ${tempPassword}</p>
              <a href="${resetUrl}">Set Password</a>
              <p>This link will expire in 24 hours.</p>
            `,
          });
          console.log('Invitation email sent successfully');
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Don't throw the error - we still want to return the user
        }

        return { user };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A user with this email already exists",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to invite user",
        });
      }
    }),

  setPassword: publicProcedure
    .input(z.object({
      token: z.string(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Find user with valid reset token
        const user = await ctx.db.user.findFirst({
          where: {
            resetToken: input.token,
            resetTokenExpiry: {
              gt: new Date(),
            },
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired token",
          });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(input.password, 10);

        // Update user's password in our database first
        await ctx.db.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null,
          },
        });

        // Update password in Supabase
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          {
            password: input.password,
            email_confirm: true,
          }
        );

        if (updateError) {
          console.error('Supabase password update error:', updateError);
          // If Supabase update fails, revert our database change
          await ctx.db.user.update({
            where: { id: user.id },
            data: {
              password: user.password,
              resetToken: user.resetToken,
              resetTokenExpiry: user.resetTokenExpiry,
            },
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update password in authentication service",
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set password",
        });
      }
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      image: z.string().url().optional(),
      otp: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Find valid OTP
        const otpRecord = await ctx.db.oTP.findFirst({
          where: {
            userId: ctx.session.user.id,
            otp: input.otp,
            type: "PROFILE_UPDATE",
            isUsed: false,
            expiresAt: {
              gt: new Date(),
            },
          },
        });

        if (!otpRecord) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired OTP",
          });
        }

        // Mark OTP as used
        await ctx.db.oTP.update({
          where: { id: otpRecord.id },
          data: { isUsed: true },
        });

        // Update user profile
        const updatedUser = await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            name: input.name,
            image: input.image,
          },
        });

        // Update Supabase user metadata
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            name: input.name,
            avatar_url: input.image,
          },
        });

        if (updateError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update profile in authentication service",
          });
        }

        return { user: updatedUser };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
        });
      }
    }),

  sendProfileUpdateOtp: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
        });

        if (!user?.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User email not found",
          });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create OTP record
        await ctx.db.oTP.create({
          data: {
            userId: user.id,
            otp,
            type: "PROFILE_UPDATE",
            expiresAt: otpExpiry,
          },
        });

        // Send OTP via email
        await sendEmail({
          to: user.email,
          subject: "Profile Update OTP",
          text: `Your OTP for profile update is: ${otp}. This OTP will expire in 10 minutes.`,
          html: `
            <h1>Profile Update OTP</h1>
            <p>Your OTP for profile update is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 10 minutes.</p>
          `,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send OTP",
        });
      }
    }),
});
