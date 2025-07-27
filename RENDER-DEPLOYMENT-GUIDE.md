# Complete Render Deployment Guide
## From Replit to Render with PostgreSQL

This guide walks you through deploying your Second Support accounting platform from Replit to Render with a PostgreSQL database.

## Prerequisites
- GitHub account
- Render account (free tier available at [render.com](https://render.com))
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
3. Can be public or private (Render supports both)
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

---

## Step 2: Set Up Render Account

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended for easy repo access)

### 2.2 Connect GitHub
1. After signing up, Render will ask to connect to GitHub
2. Allow Render access to your repositories
3. You can limit access to specific repos for security

---

## Step 3: Create PostgreSQL Database

### 3.1 Create Database Service
1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Configure database:
   - **Name**: `second-support-db`
   - **Database**: `second_support`
   - **User**: `admin` (or your preference)
   - **Region**: Choose closest to your users
   - **Plan**: Free tier or Starter ($7/month)

### 3.2 Get Database URL
1. After creation, go to your database dashboard
2. Find the "Internal Database URL" 
3. Copy it - looks like: `postgresql://user:pass@hostname:port/database`
4. Keep this handy for the next step

---

## Step 4: Deploy Web Service

### 4.1 Create Web Service
1. In Render dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub repository
4. Configure service:
   - **Name**: `second-support-app`
   - **Environment**: `Node`
   - **Region**: Same as your database
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 4.2 Set Environment Variables
In the "Environment Variables" section, add:

```
NODE_ENV=production
SESSION_SECRET=[Generate secure random string]
DATABASE_URL=[Your PostgreSQL Internal URL from Step 3.2]
```

### 4.3 Generate Secure Session Secret
```bash
# Run this locally to generate a secure session secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Use the output as your `SESSION_SECRET` value.

---

## Step 5: Alternative: One-Click Deploy

### 5.1 Using render.yaml (Recommended)
Your project includes a `render.yaml` file for one-click deployment:

1. Fork or upload your repository to GitHub
2. Go to [render.com](https://render.com)
3. Click "New +" → "Blueprint"
4. Connect your repository
5. Render will automatically:
   - Create PostgreSQL database
   - Create web service
   - Set up environment variables
   - Deploy your application

### 5.2 Manual Environment Setup
If not using Blueprint, you'll need to manually:
1. Create PostgreSQL service first
2. Create web service second
3. Link them via environment variables

---

## Step 6: Database Schema Setup

### 6.1 Automatic Schema Creation
Your app will automatically create database tables on first run. The connection includes:
```javascript
createTableIfMissing: true
```

### 6.2 Manual Schema Push (Optional)
If you prefer manual control:
```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render login

# Push database schema
render exec npm run db:push
```

---

## Step 7: Create Demo User

### 7.1 Access Your Deployed App
1. After deployment, Render provides a URL like: `https://second-support-app.onrender.com`
2. Visit the URL to see your application

### 7.2 Create Demo User via Database Console
Use Render's database console or connect directly:

1. In Render dashboard → your PostgreSQL service
2. Click "Connect" → "PSQL Command"
3. Run this SQL:

```sql
INSERT INTO company_users (id, email, password, company_id, company_name, first_name, last_name, is_active) 
VALUES ('demo-user-123', 'demo@company.com', '$2b$10$P9ENS6lzhMYXn/j3aY0G4env.xQ6w2HTUe2NULY0w7yScHyYICjxe', 'vomcompany', 'VoM Company', 'Demo', 'User', true);
```

### 7.3 Test Login
- Email: `demo@company.com`
- Password: `demo123`

---

## Step 8: Custom Domain (Optional)

### 8.1 Add Custom Domain
1. In Render dashboard → your web service
2. Go to "Settings" → "Custom Domains"
3. Add your domain (e.g., `app.yourcompany.com`)
4. Update your DNS records as instructed
5. Render provides free SSL certificates

---

## Render vs Railway Comparison

| Feature | Render | Railway |
|---------|--------|---------|
| **Free Tier** | Yes (with limitations) | Limited hours |
| **PostgreSQL** | $7/month | ~$5/month |
| **Web Service** | $7/month | $5/month |
| **Build Time** | Fast | Very Fast |
| **Scaling** | Good | Excellent |
| **Interface** | User-friendly | Modern |
| **GitHub Integration** | Excellent | Excellent |

---

## Troubleshooting Common Issues

### Build Failures
- **Issue**: Build fails with dependency errors
- **Solution**: 
  ```bash
  # Locally test build process
  npm install
  npm run build
  npm start
  ```

### Database Connection Issues
- **Issue**: "Connection refused" or timeout errors
- **Solution**: 
  - Use **Internal Database URL** (not External)
  - Ensure database service is in same region
  - Check environment variables are set correctly

### Slow Cold Starts
- **Issue**: App takes time to respond after inactivity
- **Solution**: 
  - Upgrade to paid plan to avoid spinning down
  - Implement health check pinging
  - Consider using Render's "Auto-Deploy" feature

### Session/Login Problems
- **Issue**: Users get logged out frequently
- **Solution**:
  - Verify `SESSION_SECRET` is set and consistent
  - Check database connectivity
  - Ensure sessions table exists

---

## Render Configuration Files

### `render.yaml` - One-click deployment
```yaml
services:
  - type: web
    name: second-support-accounting
    env: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: SESSION_SECRET
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: second-support-db
          property: connectionString

  - type: pserv
    name: second-support-db
    env: postgresql
    plan: starter
```

---

## Production Features Enabled

✅ **Security Headers** - XSS protection, content type security  
✅ **CORS Configuration** - Properly configured for Render domains  
✅ **Session Security** - Secure cookies with PostgreSQL storage  
✅ **Error Handling** - Production-safe error messages  
✅ **Health Checks** - `/health` endpoint for Render monitoring  
✅ **Static File Serving** - Optimized for production  
✅ **Database Connection Pooling** - Configured for Render PostgreSQL  
✅ **Auto-scaling** - Render handles traffic spikes automatically  

---

## Cost Estimation

### Render Pricing:
- **Starter Web Service**: $7/month
- **Starter PostgreSQL**: $7/month  
- **Total**: $14/month for production deployment

### Free Tier Limitations:
- Web services spin down after 15 minutes of inactivity
- 750 hours/month limit
- No custom domains on free tier

---

## Deployment Checklist

- [ ] Code uploaded to GitHub
- [ ] Render account created and connected to GitHub
- [ ] PostgreSQL database service created
- [ ] Web service created and configured
- [ ] Environment variables set (`NODE_ENV`, `SESSION_SECRET`, `DATABASE_URL`)
- [ ] Application deployed successfully
- [ ] Health check endpoint responding
- [ ] Demo user created and login tested
- [ ] Custom domain configured (optional)

---

## Support Resources

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Render Community**: [community.render.com](https://community.render.com)
- **Render Status**: [status.render.com](https://status.render.com)

Your Second Support accounting platform is now production-ready on Render with PostgreSQL!