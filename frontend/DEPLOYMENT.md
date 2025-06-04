# Portfolio Website - Production Deployment Guide

This guide will help you deploy your portfolio website to Vercel with Neon PostgreSQL database and cloud storage.

## 🚀 Quick Start

### 1. Database Setup (Neon)

1. **Create a Neon Account**
   - Go to [Neon Console](https://console.neon.tech/)
   - Sign up or log in
   - Create a new project

2. **Get Database URL**
   - In your Neon project dashboard, go to "Connection Details"
   - Copy the connection string (it looks like: `postgresql://username:password@hostname/database?sslmode=require`)

### 2. Cloud Storage Setup

**Option A: Vercel Blob (Recommended)**
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Storage → Blob
3. Create a new Blob store
4. Copy the `BLOB_READ_WRITE_TOKEN`

**Option B: Cloudinary (Alternative)**
1. Create account at [Cloudinary](https://cloudinary.com/)
2. Get your Cloud Name, API Key, and API Secret from dashboard
3. Create an upload preset in Settings → Upload

### 3. Environment Variables

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your environment variables:**
   ```env
   # Required
   DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
   JWT_SECRET=your-super-secure-jwt-secret-key
   
   # Choose one storage option
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxx
   # OR
   # CLOUDINARY_CLOUD_NAME=your-cloud-name
   # CLOUDINARY_API_KEY=your-api-key
   # CLOUDINARY_API_SECRET=your-api-secret
   ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Database Migration

```bash
npm run migrate
```

### 6. Test Locally

```bash
npm run dev
```

Visit `http://localhost:3000` to test your application.

## 🌐 Vercel Deployment

### 1. Deploy to Vercel

**Option A: Vercel CLI**
```bash
npm i -g vercel
vercel
```

**Option B: GitHub Integration**
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Vercel will automatically deploy

### 2. Set Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add all the environment variables from your `.env.local`:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `BLOB_READ_WRITE_TOKEN` (or Cloudinary variables)

### 3. Neon Integration (Optional)

1. In Vercel Dashboard, go to Integrations
2. Search for "Neon" and install the integration
3. This will automatically set up database branching for preview deployments

## 🔧 Key Changes for Production

### File System → Database
- All JSON files (`galleryData.json`, `contactData.json`, etc.) are now stored in PostgreSQL
- Data persistence across deployments
- Better performance and scalability

### Local Storage → Cloud Storage
- Images are now stored in Vercel Blob or Cloudinary
- No more file system dependencies
- Automatic CDN distribution
- Better performance and reliability

### API Routes Optimization
- Removed all `fs` (file system) operations
- Added proper error handling
- Database connection pooling
- Serverless-friendly architecture

## 🛠️ Troubleshooting

### Common Issues

1. **500 Internal Server Error**
   - Check if `DATABASE_URL` is set correctly
   - Verify database connection
   - Check Vercel function logs

2. **Image Upload Failures**
   - Verify cloud storage credentials
   - Check file size limits
   - Ensure proper CORS settings

3. **Database Connection Issues**
   - Verify Neon database is active
   - Check connection string format
   - Ensure SSL is enabled

### Debug Commands

```bash
# Check environment variables
echo $DATABASE_URL

# Test database connection
npm run migrate

# Check build logs
vercel logs
```

## 📊 Performance Optimizations

### Database
- Connection pooling with Neon
- Optimized queries with Drizzle ORM
- Automatic scaling

### Storage
- CDN-backed image delivery
- Automatic image optimization
- Global edge distribution

### Caching
- Static generation where possible
- API route caching
- Image caching via CDN

## 🔒 Security Best Practices

1. **Environment Variables**
   - Never commit `.env.local` to git
   - Use strong JWT secrets
   - Rotate credentials regularly

2. **Database Security**
   - Use SSL connections
   - Limit database access
   - Regular backups

3. **API Security**
   - JWT token validation
   - Rate limiting
   - Input validation

## 📈 Monitoring

### Vercel Analytics
- Enable Vercel Analytics for performance monitoring
- Monitor function execution times
- Track error rates

### Database Monitoring
- Use Neon's built-in monitoring
- Set up alerts for connection issues
- Monitor query performance

## 🆘 Support

If you encounter issues:

1. Check the [Vercel Documentation](https://vercel.com/docs)
2. Review [Neon Documentation](https://neon.tech/docs)
3. Check the application logs in Vercel Dashboard
4. Verify all environment variables are set correctly

---

**Happy Deploying! 🚀**