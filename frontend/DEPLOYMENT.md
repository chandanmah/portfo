# Deployment Guide for Portfolio Website

This guide will help you deploy your portfolio website to Vercel with Vercel Blob storage for production use.

## Prerequisites

1. A Vercel account
2. Your portfolio website code
3. An email service for contact form (Gmail, SendGrid, etc.)

## Step 1: Set up Vercel Blob Storage

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project or create a new one
3. Go to the **Storage** tab
4. Click **Create Database** and select **Blob**
5. Create a new Blob store
6. Copy the `BLOB_READ_WRITE_TOKEN` from the connection details

## Step 2: Configure Environment Variables

In your Vercel project settings, add the following environment variables:

### Required Variables:

```bash
# Vercel Blob Storage Token
BLOB_READ_WRITE_TOKEN=your_actual_blob_token_here

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# SMTP Configuration for contact form
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Site URL
NEXT_PUBLIC_SITE_URL=https://your-actual-domain.vercel.app
```

### Setting up Gmail SMTP (Recommended):

1. Enable 2-factor authentication on your Gmail account
2. Generate an "App Password" for your application
3. Use this app password as `SMTP_PASS`
4. Use your Gmail address as `SMTP_USER`

## Step 3: Deploy to Vercel

### Option A: Deploy from Git Repository

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel
3. Vercel will automatically deploy on every push

### Option B: Deploy using Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

## Step 4: Initial Setup After Deployment

1. Visit your deployed website
2. Go to `/admin_CM` (your admin panel)
3. Set up your admin password on first visit
4. Upload your avatar image
5. Configure your contact information
6. Add your social media links
7. Upload your gallery images

## Important Notes

### Data Migration from Local Storage

If you have existing data in local JSON files, you'll need to manually re-enter it through the admin panel after deployment, as the production version now uses Vercel Blob storage instead of local files.

### File Storage

- All images (gallery and avatar) are now stored in Vercel Blob storage
- All configuration data (contact info, social links, etc.) is stored in Vercel Blob storage
- No local file system dependencies

### Security

- Always use strong, unique passwords
- Keep your environment variables secure
- Regularly update your JWT secret
- Use app-specific passwords for email services

### Troubleshooting

#### 500 Internal Server Error
- Check that all environment variables are set correctly
- Verify your BLOB_READ_WRITE_TOKEN is valid
- Check Vercel function logs for detailed error messages

#### Email not sending
- Verify SMTP credentials
- Check that your email provider allows SMTP access
- Ensure app passwords are used instead of regular passwords

#### Images not uploading
- Verify BLOB_READ_WRITE_TOKEN is correct
- Check Vercel Blob storage quota
- Ensure file sizes are within limits

## Performance Optimizations

The website is now optimized for production with:

- Serverless functions for all API routes
- CDN-delivered images through Vercel Blob
- No local file system dependencies
- Optimized for Vercel's edge network

## Support

If you encounter issues:

1. Check Vercel function logs
2. Verify all environment variables
3. Test API endpoints individually
4. Check browser console for client-side errors