# Complete Railway Deployment Guide
## From Replit to Railway with PostgreSQL

This guide walks you through deploying your Second Support accounting platform from Replit to Railway with a PostgreSQL database.

## Prerequisites
- GitHub account
- Railway account (free tier available at [railway.app](https://railway.app))
- Your project code ready

---

## Step 1: Export Your Code from Replit

### 1.1 Download Project Files
1. In your Replit project, click the three dots (⋯) menu
2. Select "Download as ZIP"
3. Extract the ZIP file to your local computer

### 1.2 Create GitHub Repository
1. Go to [github.com](https://github.com) and create a new repository
2. Name it something like `second-support-accounting`
3. Make it public (Railway free tier requires public repos)
4. Don't initialize with README (we'll upload existing code)

### 1.3 Upload Code to GitHub
```bash
# In your extracted project folder
git init
git add .
git commit -m "Initial commit from Replit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Or use GitHub's web interface to upload files directly.

---

## Step 2: Set Up Railway Account

### 2.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with GitHub (recommended for easy repo access)

### 2.2 Connect GitHub
1. After signing up, Railway will ask to connect to GitHub
2. Allow Railway access to your repositories
3. You can limit access to specific repos for security

---

## Step 3: Create New Railway Project

### 3.1 Deploy from GitHub
1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `second-support-accounting` repository
4. Railway will automatically detect it as a Node.js project

### 3.2 Initial Configuration
Railway will automatically:
- Detect `package.json` and install dependencies
- Run the build command (`npm run build`)
- Start the server with `npm start`

---

## Step 4: Add PostgreSQL Database

### 4.1 Add Database Service
1. In your Railway project dashboard, click "New Service"
2. Select "Database"
3. Choose "Add PostgreSQL"
4. Railway will create a PostgreSQL instance automatically

### 4.2 Get Database Connection
1. Click on the PostgreSQL service in your dashboard
2. Go to "Connect" tab
3. Copy the `DATABASE_URL` (it looks like: `postgresql://user:pass@host:port/db`)
4. Keep this handy - you'll need it in the next step

---

## Step 5: Configure Environment Variables

### 5.1 Set Required Variables
In your app service (not database service):
1. Click on your app service
2. Go to "Variables" tab
3. Add these environment variables:

```
NODE_ENV=production
SESSION_SECRET=your-super-secure-random-session-secret-here
```

### 5.2 Generate Secure Session Secret
Run this command to generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and use it as your `SESSION_SECRET` value.

### 5.3 Verify Auto-Generated Variables
Railway automatically provides:
- `DATABASE_URL` - Your PostgreSQL connection string
- `PORT` - The port your app should listen on
- `RAILWAY_PUBLIC_DOMAIN` - Your app's public domain

---

## Step 6: Database Schema Setup

### 6.1 Method 1: Using Railway CLI (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Push database schema
railway run npm run db:push
```

### 6.2 Method 2: Using Database Connection
1. Install a PostgreSQL client like `psql` or use a GUI tool
2. Connect using the `DATABASE_URL` from Step 4.2
3. The app will automatically create tables on first run

---

## Step 7: Deploy and Test

### 7.1 Trigger Deployment
1. Railway automatically deploys when you push to GitHub
2. Or manually trigger: In Railway dashboard → Deployments → "Deploy Latest"

### 7.2 Monitor Deployment
1. Watch the build logs in Railway dashboard
2. Build process should complete successfully
3. App will start on the assigned port

### 7.3 Get Your App URL
1. In Railway dashboard, your app service will show a public URL
2. It looks like: `https://your-app-name.up.railway.app`
3. Click it to access your deployed application

---

## Step 8: Create Demo User

### 8.1 Access Your Deployed App
1. Visit your Railway app URL
2. You should see the VoM login page

### 8.2 Create Demo User via Database
Use Railway's database console or connect directly:
```sql
INSERT INTO company_users (id, email, password, company_id, company_name, first_name, last_name, is_active) 
VALUES ('demo-user-123', 'demo@company.com', '$2b$10$P9ENS6lzhMYXn/j3aY0G4env.xQ6w2HTUe2NULY0w7yScHyYICjxe', 'vomcompany', 'VoM Company', 'Demo', 'User', true);
```

### 8.3 Test Login
- Email: `demo@company.com`
- Password: `demo123`

---

## Step 9: Domain Setup (Optional)

### 9.1 Custom Domain
1. In Railway dashboard → your app service
2. Go to "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

---

## Troubleshooting Common Issues

### Build Failures
- **Issue**: Build fails with dependency errors
- **Solution**: Check `package.json` dependencies, run `npm install` locally first

### Database Connection Issues
- **Issue**: "DATABASE_URL not found" error
- **Solution**: Verify PostgreSQL service is running and `DATABASE_URL` is set

### Session/Login Problems
- **Issue**: Login doesn't work or sessions don't persist
- **Solution**: Check `SESSION_SECRET` is set and secure cookies are configured

### Port Binding Issues
- **Issue**: App doesn't start or "port already in use"
- **Solution**: Ensure app uses `process.env.PORT` (already configured in your code)

---

## Railway Configuration Files

Your project already includes these Railway-optimized files:

### `railway.json` - Railway deployment configuration
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### `nixpacks.toml` - Build environment configuration
```toml
[build]
cmd = "npm install && npm run build"

[start]
cmd = "npm start"
```

### `.env.example` - Environment variables reference
```
DATABASE_URL=postgresql://username:password@hostname:port/database
SESSION_SECRET=your-super-secure-session-secret-key-here
NODE_ENV=production
PORT=5000
```

---

## Production Features Enabled

Your deployed app includes:
✅ **Security Headers** - XSS protection, content type security  
✅ **CORS Configuration** - Properly configured for Railway domains  
✅ **Session Security** - Secure cookies with PostgreSQL storage  
✅ **Error Handling** - Production-safe error messages  
✅ **Health Checks** - `/health` endpoint for Railway monitoring  
✅ **Static File Serving** - Optimized for production  
✅ **Database Connection Pooling** - Configured for Railway PostgreSQL  

---

## Cost Estimation

### Railway Pricing (as of 2025):
- **Starter Plan**: $5/month per service
- **PostgreSQL**: ~$5/month
- **Total**: ~$10/month for production deployment

### Free Tier:
- Limited hours per month
- Good for testing and development

---

## Next Steps After Deployment

1. **Set up monitoring** - Use Railway's built-in monitoring
2. **Configure backups** - Set up automated database backups  
3. **Add custom domain** - Point your domain to Railway
4. **Set up CI/CD** - Automatic deployments from GitHub
5. **Scale resources** - Upgrade plans as needed

---

## Support Resources

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **GitHub Issues**: Report issues in your repository

Your Second Support accounting platform is now production-ready on Railway with PostgreSQL!