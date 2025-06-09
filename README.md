# Task Management and Collaboration Tool

A full-stack task management application built with the T3 Stack (Next.js, TypeScript, Tailwind CSS, tRPC, Prisma, NextAuth.js) with Supabase for database and authentication.

## Features

### User Management
- **Admin Role**: Can invite new users via email and manage all aspects of the system
- **User Role**: Can view all tasks, update assigned tasks, and participate in collaboration
- Secure authentication via Supabase Auth integrated with NextAuth.js
- Dedicated profile management page with OTP verification for updates
- User profile pictures and customizable display names

### Task System
- Complete task lifecycle management: create, read, update, delete
- Comprehensive task properties: title, description, deadline, priority, tags, assigned user, definition of done, attachments, and status tracking
- Four-stage workflow: OPEN → IN_PROGRESS → REVIEW → DONE
- Three priority levels: LOW, MEDIUM, HIGH with visual indicators
- File attachment support via Supabase Storage with multiple file format support
- Real-time task updates across all user interfaces

### Comments & Collaboration
- Threaded comment system for detailed task discussions
- User mention system with @ syntax and automatic notifications
- Email notifications for mentions and task updates
- File attachments within comments for better collaboration
- Real-time comment synchronization across all users

### Dashboard & Interface
- Comprehensive dashboard with task overview and statistics
- Advanced filtering by status, priority, assignee, and search functionality
- Grid-based task card layout for better visual organization
- Real-time updates without page refresh requirements
- Responsive design with dark/light theme support
- Task statistics and team member overview

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: tRPC for type-safe API, NextAuth.js for authentication
- **Database**: PostgreSQL (Supabase) with Prisma ORM
- **Storage**: Supabase Storage for file attachments
- **Authentication**: Supabase Auth integrated with NextAuth.js
- **Email**: SMTP integration for notifications and OTP verification
- **Deployment**: SST (Serverless Stack) on AWS

## Prerequisites

- Node.js 18 or later
- Supabase account and project
- SMTP email service (for notifications)
- AWS account (for deployment)

## Quick Start

### 1. Environment Setup

Copy the environment example:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials in `.env.local`:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

### 2. Database Setup

Generate Prisma client and push schema:
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 👥 Demo Accounts

After seeding the database:

**Admin Account:**
- Email: pmdnawaz1@gmail.com
- Password: Qwert1@

**Regular User:**
- Email: pmdnawaz123@gmail.com
- Password: Asdfg1@

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/trpc/auth.signUp` - Register new user
- `POST /api/trpc/auth.inviteUser` - Invite user (Admin only)

### Task Endpoints
- `GET /api/trpc/tasks.getAll` - Get all tasks (with filters)
- `GET /api/trpc/tasks.getById` - Get task by ID
- `POST /api/trpc/tasks.create` - Create new task
- `POST /api/trpc/tasks.update` - Update task
- `DELETE /api/trpc/tasks.delete` - Delete task

### Comment Endpoints
- `POST /api/trpc/comments.create` - Create comment with mentions
- `POST /api/trpc/comments.update` - Update comment
- `DELETE /api/trpc/comments.delete` - Delete comment

### User Endpoints
- `GET /api/trpc/users.getAll` - Get all users
- `GET /api/trpc/users.getProfile` - Get current user profile
- `POST /api/trpc/users.updateProfile` - Update user profile

### File Upload
- `POST /api/upload` - Upload file attachment

## 🗄️ Database Schema

The application uses the following main entities:

- **User**: Authentication and profile information
- **Task**: Core task entity with all properties
- **Comment**: Task comments with mention support
- **Mention**: User mentions in comments
- **Attachment**: File attachments for tasks

## 🧪 Testing

Run the test suite:
```bash
npm test
npm run test:watch
```

## 🚀 Deployment

Deploy to AWS using SST:

```bash
npm run deploy
```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── TaskForm.tsx    # Task creation/editing form
│   ├── TaskCard.tsx    # Task display card with real-time updates
│   ├── TaskDetails.tsx # Detailed task view with comments
│   ├── CommentSection.tsx # Comments with mention support
│   ├── FileUpload.tsx  # File upload component
│   └── Header.tsx      # Navigation header with profile access
├── pages/              # Next.js pages and API routes
│   ├── auth/           # Authentication pages (signin, signup, etc.)
│   ├── api/            # API endpoints and tRPC routes
│   ├── dashboard.tsx   # Main dashboard with task overview
│   ├── profile.tsx     # User profile management page
│   └── index.tsx       # Landing page
├── server/             # Backend API and configuration
│   ├── api/routers/    # tRPC routers (tasks, users, auth, comments)
│   ├── auth/           # NextAuth configuration and providers
│   ├── auth.ts         # Authentication setup
│   └── db.ts           # Prisma client configuration
├── contexts/           # React contexts
│   └── ThemeContext.tsx # Theme management (dark/light mode)
├── styles/             # CSS and styling
│   └── globals.css     # Global styles and theme variables
└── utils/              # Utility functions
    ├── api.ts          # tRPC client setup
    └── email.ts        # Email notification utilities
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build optimized production version
- `npm run start` - Start production server
- `npm test` - Run test suite with Jest
- `npm run db:generate` - Generate Prisma client from schema
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with demo data and users
- `npm run db:studio` - Open Prisma Studio for database management
- `npm run deploy` - Deploy to AWS using SST

## Supabase Setup

1. Create a new Supabase project
2. Copy the project URL and keys to your `.env.local`
3. Enable email authentication in Supabase Auth settings
4. Create a storage bucket named `attachments` with public access
5. Run database migrations

## 📬 API Testing

Import `postman_collection.json` into Postman to test all API endpoints with proper authentication.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License

## 🆘 Troubleshooting

### Common Issues

1. **Prisma Client Not Generated**: Run `npm run db:generate`
2. **Database Connection Error**: Check your `DATABASE_URL` in `.env.local`
3. **Authentication Issues**: Verify Supabase keys and NextAuth configuration
4. **File Upload Errors**: Ensure Supabase Storage bucket exists and is public

### Getting Help

- Check the issues section of this repository
- Review the Supabase documentation
- Consult the T3 Stack documentation

## Roadmap

### Completed Features
- Real-time task updates across all interfaces
- Email notifications for mentions and task updates
- Comprehensive user profile management with OTP verification
- Advanced task filtering and search functionality
- Mobile-responsive design with theme support

### Upcoming Features
- Push notifications for mobile devices
- Task templates for recurring workflows
- Time tracking and productivity analytics
- Advanced reporting dashboard with charts
- Team collaboration spaces and channels
- Integration with external calendar services
- Bulk task operations and management
- Advanced file preview and annotation tools
