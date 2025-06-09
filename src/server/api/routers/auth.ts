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
        console.log('🔍 Checking if user exists in Prisma database:', input.email);
        
        // Check if user already exists in our database
        const existingUser = await ctx.db.user.findUnique({
          where: { email: input.email }
        });

        console.log('👤 User found in Prisma:', {
          found: !!existingUser,
          email: existingUser?.email,
          id: existingUser?.id
        });

        if (existingUser) {
          console.log('❌ User already exists in Prisma database');
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A user with this email already exists",
          });
        }

        console.log('✅ User does not exist in Prisma, proceeding with invitation...');

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

        console.log('🔧 Creating user in Supabase Auth...');
        
        // Create user in Supabase Auth
        const { data: supabaseUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: tempPassword,
          email_confirm: true,
        });

        console.log('📊 Supabase user creation result:', {
          success: !error,
          error: error?.message,
          userId: supabaseUser?.user?.id
        });

        if (error) {
          console.log('❌ Supabase user creation failed:', error.message);
          
          // Check if the error is because user already exists in Supabase
          if (error.message.includes('already been registered')) {
            console.log('⚠️  User exists in Supabase but not in Prisma - deleting from Supabase first...');
            
            try {
              // Try to find and delete the existing user in Supabase
              const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
              const existingSupabaseUser = existingUsers.users.find(u => u.email === input.email);
              
              if (existingSupabaseUser) {
                console.log('🗑️  Deleting existing Supabase user:', existingSupabaseUser.id);
                await supabaseAdmin.auth.admin.deleteUser(existingSupabaseUser.id);
                console.log('✅ Deleted existing Supabase user');
                
                // Now try to create the user again
                console.log('🔄 Retrying user creation in Supabase...');
                const { data: retryUser, error: retryError } = await supabaseAdmin.auth.admin.createUser({
                  email: input.email,
                  password: tempPassword,
                  email_confirm: true,
                });
                
                if (retryError) {
                  console.log('❌ Retry failed:', retryError.message);
                  await ctx.db.user.delete({ where: { id: user.id } });
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `Supabase retry error: ${retryError.message}`,
                  });
                }
                
                console.log('✅ User created successfully on retry');
              }
            } catch (cleanupError) {
              console.log('❌ Cleanup failed:', cleanupError);
              await ctx.db.user.delete({ where: { id: user.id } });
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Cleanup error: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`,
              });
            }
          } else {
            // Different error - just fail
            await ctx.db.user.delete({ where: { id: user.id } });
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Supabase error: ${error.message}`,
            });
          }
        } else {
          console.log('✅ User created successfully in Supabase');
        }

        // Send invitation email
        const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/auth/set-password?token=${resetToken}`;

        console.log('📧 Preparing invitation email...');
        console.log('   Email:', input.email);
        console.log('   Reset URL:', resetUrl);
        console.log('   Temp Password:', tempPassword);

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

        // Find the corresponding Supabase user by email
        console.log('🔍 Finding Supabase user for password update...');
        const { data: supabaseUsers } = await supabaseAdmin.auth.admin.listUsers();
        const supabaseUser = supabaseUsers.users.find(u => u.email === user.email);
        
        if (!supabaseUser) {
          console.log('❌ Supabase user not found for email:', user.email);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "User not found in authentication service",
          });
        }

        console.log('🔧 Updating password in Supabase for user:', supabaseUser.id);
        
        // Update password in Supabase using the correct Supabase user ID
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          supabaseUser.id,
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
      image: z.string().optional(),
      otp: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('updateProfile input:', input);
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

        // Prepare update data with validation
        const updateData: { name?: string; image?: string } = {};
        if (input.name) {
          updateData.name = input.name;
        }
        if (input.image) {
          // Basic URL validation
          try {
            new URL(input.image);
            updateData.image = input.image;
          } catch {
            console.log('Invalid URL provided:', input.image);
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid image URL provided",
            });
          }
        }

        // Update user profile
        console.log('Updating user with data:', updateData);
        const updatedUser = await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: updateData,
        });
        console.log('Updated user:', { id: updatedUser.id, name: updatedUser.name, image: updatedUser.image });

        // Find and update the corresponding Supabase user
        console.log('🔍 Finding Supabase user for profile update...');
        const { data: supabaseUsers } = await supabaseAdmin.auth.admin.listUsers();
        const supabaseUser = supabaseUsers.users.find(u => u.email === updatedUser.email);
        
        if (supabaseUser) {
          console.log('🔧 Updating Supabase user metadata...');
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            supabaseUser.id,
            {
              user_metadata: {
                name: input.name,
                avatar_url: input.image,
              }
            }
          );

          if (updateError) {
            console.error('Supabase metadata update error:', updateError);
            // Don't fail the whole operation for metadata update failure
            console.log('⚠️  Profile updated in database but Supabase metadata update failed');
          } else {
            console.log('✅ Supabase user metadata updated successfully');
          }
        } else {
          console.log('⚠️  Supabase user not found for profile metadata update');
        }

        return { 
          user: updatedUser,
          message: 'Profile updated successfully' 
        };
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
