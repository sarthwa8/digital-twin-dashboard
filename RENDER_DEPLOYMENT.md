# 🎯 Deploy Motor Simulator to Render.com

## Step-by-Step Guide

### Step 1: Push Code to GitHub

```bash
# Navigate to your project
cd digital-twin-dashboard

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Add motor simulator for deployment"

# Create a new repo on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/digital-twin-motor.git
git branch -M main
git push -u origin main
```

---

### Step 2: Deploy to Render

1. **Go to**: https://render.com
2. **Sign Up** with GitHub (it's free)
3. Click **"New +"** button (top right)
4. Select **"Background Worker"**

---

### Step 3: Configure the Worker

**Connect Repository:**
- Click **"Connect account"** to link GitHub
- Find and select your `digital-twin-motor` repository
- Click **"Connect"**

**Worker Settings:**
- **Name**: `motor-simulator` (or whatever you prefer)
- **Region**: Oregon (US West) - *or closest to you*
- **Branch**: `main`
- **Root Directory**: `mock-sensors`
- **Runtime**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python motor_sensor_simulator.py`

**Plan:**
- Select **"Free"** plan
- Free tier includes 750 hours/month (plenty for 24/7 operation)

Click **"Create Background Worker"**

---

### Step 4: Monitor Deployment

1. Render will start building (~1-2 minutes)
2. Watch the **"Logs"** tab
3. You should see:
   ```
   ==> Building...
   ==> Installing dependencies...
   ==> Starting service...
   ✅ Connected to MQTT Broker: broker.hivemq.com
   🚀 Starting Digital Twin Motor Sensor Simulation
   [0000s] Normal      | Temp:  25.2°C | Current:  2.01A | ...
   ```

---

### Step 5: Verify It's Working

**Check Render Logs:**
- You should see continuous output every second
- Data cycling through fault types every 60 seconds

**Check Your Dashboard:**
1. Go to your Vercel site: `digital-twin-dashboard-five.vercel.app`
2. Refresh the page
3. Data should start appearing within 5-10 seconds!
4. Charts will populate
5. Fault predictions will update

---

## ✅ Success Checklist

- [ ] GitHub repo created and pushed
- [ ] Render account created
- [ ] Background Worker deployed
- [ ] Logs show "Connected to MQTT Broker"
- [ ] Vercel dashboard showing live data
- [ ] All sensor cards populated
- [ ] Fault detector showing predictions

---

## 🎮 Quick Alternative (No GitHub)

If you don't want to use GitHub, you can use Render's **Blueprint** feature:

1. Zip your `mock-sensors` folder
2. Upload to a public URL (Dropbox, Google Drive with public link)
3. Use Render's **"Deploy from Blueprint"** option

---

## 🔧 Troubleshooting

### Build Fails
**Error: "No such file or directory"**
- Make sure **Root Directory** is set to `mock-sensors`
- Verify `requirements.txt` exists in that folder

**Error: "Command not found: python"**
- Change start command to: `python3 motor_sensor_simulator.py`

### Runs But No Data
**Check MQTT connection:**
- View logs in Render
- Should see: "✅ Connected to MQTT Broker"
- If not, check internet connectivity

**Dashboard not updating:**
- Open browser console (F12)
- Check for MQTT connection errors
- Verify topics match in both simulator and dashboard

### Worker Stops Running
**Free tier limitations:**
- Render free tier: 750 hours/month
- That's ~25 days of continuous operation
- Should be plenty for your use case

---

## 📊 What You'll Have

```
┌──────────────────────┐
│   Render.com         │
│   (Free Worker)      │
│   Runs 24/7          │
│   • motor_sensor     │
│     _simulator.py    │
└──────────┬───────────┘
           │
           │ MQTT Publish
           ▼
┌──────────────────────┐
│   HiveMQ Broker      │
│   (Public MQTT)      │
│   broker.hivemq.com  │
└──────────┬───────────┘
           │
           │ MQTT Subscribe
           ▼
┌──────────────────────┐
│   Vercel.app         │
│   (Dashboard)        │
│   digital-twin-      │
│   dashboard-five     │
│   .vercel.app        │
└──────────────────────┘
           │
           ▼
    👥 Anyone worldwide
       can view your
       motor data!
```

**Everything runs in the cloud!**
- No local computer needed
- Available 24/7
- Accessible from anywhere
- Ready for your thesis demo!

---

## 🔄 Updates & Maintenance

**To update the simulator:**
```bash
# Make changes to code
git add .
git commit -m "Update simulator"
git push

# Render auto-deploys on push!
```

**To check status:**
- Visit Render dashboard
- View logs anytime
- Monitor uptime

**Free tier limits:**
- 750 hours/month = ~31 days @ 24/7
- Resets monthly
- More than enough for testing & demos

---

## 🎉 Next Steps

Once deployed:
1. ✅ Share your Vercel link with anyone
2. ✅ They'll see live motor data
3. ✅ Perfect for thesis presentations
4. ✅ When Raspberry Pi arrives, swap Render with Pi

---

## 📞 Need Help?

Common issues:
- **Can't find repo**: Make sure it's public or Render has access
- **Build fails**: Check Python version compatibility
- **No data**: Verify MQTT topics match exactly
- **Worker sleeps**: Free tier may sleep after inactivity, just redeploy

Ready to deploy? Let me know if you hit any snags! 🚀
