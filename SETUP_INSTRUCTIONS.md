# Complete Setup Instructions

This guide will walk you through setting up the Task Management and Collaboration Tool from scratch.

## 1. Prerequisites Check
- Node.js 18 or later installed on your system
- Supabase account created (free tier works fine)
- SMTP email service for notifications (Gmail, SendGrid, etc.)
- Git installed (optional, for version control)
- Code editor of your choice

## 2. Supabase Project Setup

### Create Project
1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to be ready (2-3 minutes)
3. Note your project reference ID from the URL

### Get Database URL
1. Go to Settings > Database
2. Scroll down to "Connection string"
3. Copy the URI and replace `[YOUR-PASSWORD]` with your actual password

### Get API Keys
1. Go to Settings > API
2. Copy the "Project URL"
3. Copy the "anon public" key
4. Copy the "service_role secret" key

### Enable Authentication
1. Go to Authentication > Settings
2. Enable "Enable email confirmations" if desired
3. The app will handle user creation via Supabase Auth

## 3. Environment Configuration

1. In your project root, copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your actual values:
   ```env
   # Database Configuration
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
   
   # NextAuth Configuration
   NEXTAUTH_SECRET="run: openssl rand -base64 32"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key_here"
   SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
   
   # Email Configuration (for notifications and OTP)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   EMAIL_FROM="your-email@gmail.com"
   ```

3. Generate a secure NextAuth secret:
   ```bash
   openssl rand -base64 32
   ```

## 4. Database and Dependencies

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

3. Push database schema:
   ```bash
   npm run db:push
   ```

4. Seed the database with demo data:
   ```bash
   npm run db:seed
   ```

## 5. Supabase Storage Setup

1. In your Supabase dashboard, go to Storage
2. Create a new bucket named `attachments`
3. Make it public by editing bucket settings
4. Set up the following bucket policies in the SQL editor:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

-- Allow everyone to view files (since bucket is public)
CREATE POLICY "Anyone can view attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'attachments');
```

## 6. Start Development

```bash
npm run dev
```

Visit `http://localhost:3000` and sign in with:
- **Admin**: pmdnawaz1@gmail.com / Qwert1@
- **User**: pmdnawaz123@gmail.com / Asdfg1@

## 7. Verify Everything Works

Test the following features to ensure proper setup:

- **Authentication**: Sign in with demo accounts and access the dashboard
- **Profile Management**: Navigate to /profile and test profile updates with OTP verification
- **Dashboard**: View tasks in grid layout with real-time updates
- **Task Management**: Create, edit, and update task status
- **Comments System**: Add comments with @mentions and file attachments
- **File Upload**: Upload files to tasks and verify storage
- **User Management**: Admin can invite new users via email
- **Theme Support**: Toggle between dark and light themes
- **Real-time Updates**: Make changes and see them reflect immediately

## 8. Optional: API Testing

1. Import `postman_collection.json` into Postman
2. Set up environment variables in Postman
3. Test all API endpoints

## 9. Deployment (Optional)

1. Install AWS CLI and configure credentials
2. Deploy to AWS:
   ```bash
   npm run deploy
   ```

## Troubleshooting

### Common Issues:

**Database Connection Error**
- Check your DATABASE_URL is correct
- Ensure Supabase project is running
- Verify password doesn't contain special characters that need encoding

**Authentication Not Working**
- Verify all Supabase keys are correct
- Check NEXTAUTH_SECRET is set
- Ensure Supabase Auth is enabled

**File Upload Failing**
- Verify attachments bucket exists in Supabase Storage
- Check bucket is set to public
- Ensure storage policies are created

**Prisma Errors**
- Run `npm run db:generate` after schema changes
- Check database connection
- Verify DATABASE_URL format

### Need Help?

1. Check the README.md for detailed documentation
2. Review error messages in browser console
3. Check Supabase dashboard for any issues
4. Ensure all environment variables are set correctly

## Success!

You should now have a fully functional task management application with:

### Core Features
- Secure user authentication with NextAuth.js and Supabase
- Comprehensive task management with full CRUD operations
- Real-time collaborative comment system with user mentions
- File attachment support with Supabase Storage
- Admin user invitation and management system

### Enhanced Features
- Dedicated profile management page with OTP verification
- Real-time dashboard updates without page refresh
- Advanced task filtering and search capabilities
- Grid-based task card layout for better organization
- Dark and light theme support
- Email notifications for mentions and task updates
- Responsive design for all device sizes

### Technical Highlights
- Type-safe API with tRPC
- Real-time data synchronization
- Secure file upload and storage
- Email integration for notifications
- Modern UI with Tailwind CSS
- Robust error handling and validation

The application is now ready for development, testing, and production use!
