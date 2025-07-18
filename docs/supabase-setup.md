# Supabase Setup Guide

This guide will help you set up a Supabase project for the GSR Operations application.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `gsr-operations-dev` (or your preferred name)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose the region closest to your users
5. Click "Create new project"

## 2. Get API Keys

Once your project is created:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-ref.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## 3. Configure Environment Variables

1. Open your `.env` file in the project root
2. Replace the placeholder values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Application Environment
VITE_APP_ENV=development
```

## 4. Test Connection

Run the application to test the connection:

```bash
npm run dev
```

The application should start without errors. Check the browser console for any Supabase connection issues.

## 5. Multiple Environments

For production deployment, you'll need separate Supabase projects:

### Development
- Project name: `gsr-operations-dev`
- Use for local development

### Staging (Optional)
- Project name: `gsr-operations-staging`
- Use for testing before production

### Production
- Project name: `gsr-operations-prod`
- Use for live application

## 6. Next Steps

After setting up the basic project:

1. **Database Migration**: Run database migrations to create tables
2. **Authentication Setup**: Configure authentication providers
3. **Row Level Security**: Set up RLS policies for data security
4. **Real-time Setup**: Configure real-time subscriptions

## Troubleshooting

### Common Issues

**Error: Missing VITE_SUPABASE_URL environment variable**
- Make sure your `.env` file exists and contains the correct URL
- Restart your development server after changing environment variables

**Error: Missing VITE_SUPABASE_ANON_KEY environment variable**
- Verify you copied the anon key correctly from Supabase dashboard
- Make sure there are no extra spaces or characters

**Connection timeout or network errors**
- Check your internet connection
- Verify the Supabase project URL is correct
- Ensure your Supabase project is active (not paused)

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Visit the [Supabase Community](https://github.com/supabase/supabase/discussions)
- Review the application logs in the browser console