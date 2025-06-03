# Production Deployment Guide for Vercel

This guide will help you deploy your portfolio website to Vercel with proper production optimizations.

## Issues Fixed

1. **File System Access**: Modified all API routes to handle Vercel's serverless environment
2. **Environment Variables**: Added support for production configuration via environment variables
3. **Data Persistence**: Implemented fallback mechanisms for production data storage
4. **Authentication**: Enhanced security for production deployment

## Required Environment Variables for Vercel

Add these environment variables in your Vercel dashboard:

### Authentication
```
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production-2024
ADMIN_PASSWORD_HASH=your-bcrypt-hashed-password-here
```

### Contact Information
```
CONTACT_EMAIL=your-email@example.com
CONTACT_PHONE=your-phone-number
CONTACT_LOCATION=Your Location
CONTACT_STUDIO_VISITS=Your studio visit information
CONTACT_EMAIL_ROUTING=where-contact-emails-should-go@example.com
```

### Social Media Links
```
SOCIAL_INSTAGRAM=https://instagram.com/yourprofile
SOCIAL_FACEBOOK=https://facebook.com/yourprofile
SOCIAL_TWITTER=https://twitter.com/yourprofile
```

### Email Configuration (Optional)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## How to Generate Admin Password Hash

1. Install bcryptjs locally:
   ```bash
   npm install bcryptjs
   ```

2. Create a script to generate the hash:
   ```javascript
   const bcrypt = require('bcryptjs');
   const password = 'your-admin-password';
   const hash = bcrypt.hashSync(password, 10);
   console.log('Password hash:', hash);
   ```

3. Use the generated hash as the value for `ADMIN_PASSWORD_HASH`

## Deployment Steps

1. **Set Environment Variables in Vercel**:
   - Go to your Vercel dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add all the required variables listed above

2. **Deploy**:
   - Push your code to your repository
   - Vercel will automatically deploy

3. **Test Admin Functionality**:
   - Visit `/admin_CM` on your deployed site
   - Use your admin password to log in
   - Test updating contact info and social media links

## Important Notes

- **File Uploads**: In production, uploaded files are stored in `/tmp` which is ephemeral. Consider using a cloud storage service like Cloudinary or AWS S3 for persistent file storage.
- **Data Persistence**: Contact and social media data changes are temporary in the current setup. For permanent changes, consider using a database like Vercel KV or external database.
- **Security**: Make sure to use strong, unique values for `JWT_SECRET` and admin password.

## Troubleshooting

If you still encounter 500 errors:

1. Check Vercel function logs in your dashboard
2. Ensure all environment variables are set correctly
3. Verify that your admin password hash is generated correctly
4. Make sure the JWT_SECRET is set and matches between deployments

## Recommended Improvements for Production

1. **Database Integration**: Replace file-based storage with a proper database
2. **Cloud Storage**: Use services like Cloudinary for image uploads
3. **Monitoring**: Add error tracking and monitoring
4. **Backup**: Implement data backup strategies