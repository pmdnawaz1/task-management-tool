import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  try {
    // Create users in our database (skip Supabase for now)
    console.log('Creating users in database...');
    
    // Check if admin already exists
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
      console.log('✅ Created admin user');
    } else {
      admin = existingAdmin;
      console.log('✅ Admin user already exists');
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
      console.log('✅ Created normal user');
    } else {
      user = existingUser;
      console.log('✅ Normal user already exists');
    }

    // Create sample tasks
    console.log('Creating sample tasks...');
    
    const existingTasks = await prisma.task.findMany();
    if (existingTasks.length === 0) {
      // Create first task
      await prisma.task.create({
        data: {
          title: 'Setup Project Structure',
          description: 'Initialize the T3 stack project with all required dependencies',
          priority: 'HIGH',
          status: 'DONE',
          assignedToId: admin.id,
          createdById: admin.id,
        },
      });

      // Create second task
      await prisma.task.create({
        data: {
          title: 'Implement Authentication',
          description: 'Setup NextAuth with Supabase integration',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          assignedToId: user.id,
          createdById: admin.id,
          deadline: new Date('2025-06-15'),
        },
      });

      // Create third task
      await prisma.task.create({
        data: {
          title: 'Create Task Management UI',
          description: 'Build the task creation and management interface',
          priority: 'MEDIUM',
          status: 'OPEN',
          assignedToId: user.id,
          createdById: admin.id,
          deadline: new Date('2025-06-20'),
        },
      });

      console.log('✅ Created sample tasks');
    } else {
      console.log('✅ Sample tasks already exist');
    }

    console.log('');
    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('🔍 Database contents:');
    
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });
    console.table(allUsers);
    
    const allTasks = await prisma.task.findMany({
      select: { id: true, title: true, status: true, assignedToId: true }
    });
    console.table(allTasks);
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
