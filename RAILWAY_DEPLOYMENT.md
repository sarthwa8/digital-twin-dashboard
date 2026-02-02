# 🚂 Deploy to Railway.app (100% Free)

Railway still offers a genuine free tier with no credit card required!

## 🎯 Quick Deploy (5 minutes)

### Method 1: Railway Website (Easiest)

1. **Go to**: https://railway.app
2. **Sign up** with GitHub (free, no card needed)
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. **Connect** your repository
6. **Configure**:
   - Root Directory: `mock-sensors`
   - Start Command: `python motor_sensor_simulator.py`
7. Click **"Deploy"**

Railway auto-detects Python and installs dependencies!

---

### Method 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to mock-sensors
cd digital-twin-dashboard/mock-sensors

# Initialize project
railway init

# Deploy
railway up

# View logs
railway logs
```

---

## 📊 Railway Free Tier

**What you get FREE:**
- ✅ 500 hours/month execution time
- ✅ $5 monthly credits
- ✅ No credit card required
- ✅ Unlimited projects
- ✅ Automatic deploys from GitHub

**For your simulator:**
- 24 hours × 21 days = 504 hours
- You get ~21 days of 24/7 operation
- Perfect for demos and testing!

---

## 🔧 Configuration

Railway will automatically:
1. Detect it's a Python project
2. Install from `requirements.txt`
3. Run `motor_sensor_simulator.py`

No extra config needed!

---

## 📝 Verify Deployment

1. **Check logs** in Railway dashboard:
   ```
   ✅ Connected to MQTT Broker: broker.hivemq.com
   🚀 Starting Digital Twin Motor Sensor Simulation
   ```

2. **Refresh your Vercel dashboard**
   - Data should appear within 10 seconds
   - All sensor cards will populate

---

## 🆚 Why Railway Over Render?

| Feature | Railway | Render |
|---------|---------|--------|
| **Free Tier** | ✅ Yes (500 hrs) | ⚠️ Trial only |
| **Credit Card** | ❌ Not needed | ✅ Required |
| **Setup** | Easier | Medium |
| **Best For** | Students/demos | Production |

---

## 🚀 Deploy Now!

Railway is perfect for your thesis project:
- No payment info needed
- Simple deployment
- Great for demos
- Upgrade later if needed

Ready to deploy? Just push to GitHub and connect to Railway! 🎉
