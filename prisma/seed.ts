import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // Create users in our database (skip Supabase for now)
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'pmdnawaz1@gmail.com' }
    });
    const hashedPasswordAdmin = await bcrypt.hash(`${process.env.ADMIN_PASSWORD}`, 10);
    
    let admin;
    if (!existingAdmin) {
      admin = await prisma.user.create({
        data: {
          email: 'pmdnawaz1@gmail.com',
          name: 'Admin User',
          password:  hashedPasswordAdmin,
          role: 'ADMIN',
        },
      });
    } else {
      admin = existingAdmin;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'pmdnawaz123@gmail.com' }
    });

    let user;
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(`${process.env.USER_PASSWORD}`, 10);
      user = await prisma.user.create({
        data: {
          email: 'pmdnawaz123@gmail.com',
          name: 'Normal User',
          password: hashedPassword,
          role: 'USER',
          invitedById: admin.id,
        },
      });
    } else {
      user = existingUser;
    }

    // Create sample tasks
    const existingTasks = await prisma.task.findMany();
    if (existingTasks.length === 0) {
      await prisma.task.create({
        data: {
          title: 'Setup Project Structure',
          description: 'Initialize the T3 stack project with all required dependencies',
          priority: 'HIGH',
          status: 'DONE',
          assignedToId: admin.id,
          createdById: admin.id,
          tags: ['setup', 'initialization'],
          dod: 'Project structure is complete with all dependencies installed',
        },
      });

      await prisma.task.create({
        data: {
          title: 'Implement Authentication',
          description: 'Setup NextAuth with Supabase integration',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          assignedToId: user.id,
          createdById: admin.id,
          deadline: new Date('2025-06-15'),
          tags: ['auth', 'security'],
          dod: 'Users can login and logout securely',
        },
      });

      await prisma.task.create({
        data: {
          title: 'Create Task Management UI',
          description: 'Build the task creation and management interface',
          priority: 'MEDIUM',
          status: 'OPEN',
          assignedToId: user.id,
          createdById: admin.id,
          deadline: new Date('2025-06-20'),
          tags: ['frontend', 'ui'],
          dod: 'Users can create, edit, and manage tasks through the interface',
        },
      });
    }
  } catch (error) {
    throw error;
  }
}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
