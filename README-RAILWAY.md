# Railway Deployment Guide

This guide will help you deploy the Second Support accounting platform on Railway with PostgreSQL.

## Prerequisites

1. A Railway account (sign up at [railway.app](https://railway.app))
2. The project code ready for deployment

## Step-by-Step Deployment

### 1. Create a New Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo" and connect your repository
4. Railway will automatically detect this as a Node.js project

### 2. Add PostgreSQL Database

1. In your Railway project dashboard, click "New Service"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a PostgreSQL database and provide the `DATABASE_URL`

### 3. Configure Environment Variables

In the Railway dashboard, go to your app service → Variables tab and add:

```
NODE_ENV=production
SESSION_SECRET=your-super-secure-random-session-secret-key-here
```

**Important**: Generate a secure random string for `SESSION_SECRET`. You can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Database Migration

Railway will automatically run the build process, but you need to push the database schema:

1. In your Railway dashboard, go to the PostgreSQL service
2. Click "Connect" to get connection details
3. Use the provided `DATABASE_URL` to run: `npm run db:push`

Alternatively, Railway will handle this automatically during deployment if the `DATABASE_URL` is properly configured.

### 5. Deploy

1. Push your code to GitHub (Railway will auto-deploy on commits)
2. Railway will:
   - Install dependencies (`npm install`)
   - Build the application (`npm run build`)
   - Start the server (`npm start`)

### 6. Access Your Application

1. Once deployed, Railway will provide a public URL (e.g., `your-app-name.up.railway.app`)
2. Visit the URL to access your accounting platform
3. Use the demo credentials to test:
   - Email: `demo@company.com`
   - Password: `demo123`

## Environment Variables Reference

Railway automatically provides some variables:
- `DATABASE_URL` - PostgreSQL connection string (auto-generated)
- `PORT` - Server port (auto-assigned by Railway)
- `RAILWAY_PUBLIC_DOMAIN` - Your app's domain (auto-generated)

You need to set:
- `SESSION_SECRET` - Secure random string for session encryption
- `NODE_ENV=production` - Enables production optimizations

## Production Features Enabled

✅ **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection  
✅ **CORS Configuration**: Properly configured for Railway domains  
✅ **Session Security**: Secure cookies with proper domain settings  
✅ **Error Handling**: Production-safe error messages  
✅ **Health Checks**: `/health` endpoint for Railway monitoring  
✅ **Static File Serving**: Optimized for production  
✅ **Database Connection Pooling**: Configured for Railway PostgreSQL  

## Troubleshooting

### Build Failures
- Check that all dependencies are in `package.json`
- Ensure build scripts are correct
- Check Railway build logs for specific errors

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check that PostgreSQL service is running
- Ensure database schema is pushed (`npm run db:push`)

### Session/Authentication Problems
- Verify `SESSION_SECRET` is set and secure
- Check cookie settings for HTTPS domains
- Ensure PostgreSQL sessions table exists

### Performance Issues
- Monitor Railway metrics dashboard
- Check database connection pool settings
- Review application logs for bottlenecks

## Support

For Railway-specific issues, check:
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord Community](https://discord.gg/railway)

For application issues, review the logs in Railway dashboard under your service.