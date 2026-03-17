# 🚀 Deployment Guide for Instant Screen Share

## 📋 Deployment Options

### 1. Render (Recommended)

#### Prerequisites
- Render account (free tier available)
- GitHub repository with your code

#### Step-by-Step Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Instant Screen Share"
   git branch -M main
   git remote add origin https://github.com/yourusername/instant-screenshare.git
   git push -u origin main
   ```

2. **Create Render Service**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure settings:
     - **Name**: instant-screenshare
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Free (or paid for better performance)

3. **Environment Variables**
   Set these in Render dashboard:
   ```
   NODE_ENV=production
   PORT=10000
   HOST=0.0.0.0
   CORS_ORIGIN=https://your-app-name.onrender.com
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Your app will be available at `https://your-app-name.onrender.com`

#### Post-Deployment Setup

1. **Update PWA Manifest**
   - Edit `client/manifest.json`
   - Update `start_url` and `scope` to your Render URL
   - Update icons if needed

2. **Test HTTPS**
   - Render provides automatic HTTPS
   - Test screen sharing (requires HTTPS)

3. **Optional: Add Custom Domain**
   - Go to Render dashboard → Custom Domains
   - Add your domain and update DNS

---

### 2. Docker Deployment

#### Build Docker Image
```bash
docker build -t instant-screenshare .
```

#### Run Locally
```bash
docker run -p 10000:10000 instant-screenshare
```

#### Deploy to Cloud Services
- **AWS ECS**: Push to ECR and deploy to ECS
- **Google Cloud Run**: Push to GCR and deploy to Cloud Run
- **Azure Container Instances**: Push to ACR and deploy

---

### 3. Vercel (Frontend Only)

#### Separate Frontend Deployment
```bash
# Deploy frontend to Vercel
cd client
vercel --prod
```

#### Backend Deployment
- Deploy backend to Render, Railway, or Heroku
- Update Socket.IO URL in `client/app.js`

---

## 🔧 Production Configuration

### Environment Variables

#### Required
```bash
NODE_ENV=production
PORT=5678
HOST=0.0.0.0
```

#### Optional (Recommended)
```bash
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=warn
SESSION_TIMEOUT=1800000
MAX_PEERS_PER_ROOM=10
```

#### TURN Servers (for restricted networks)
```bash
TURN_SERVER_URL=turn:your-turn-server.com
TURN_USERNAME=your-username
TURN_PASSWORD=your-password
```

### Security Headers
The application includes security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Performance Optimization

1. **Enable Gzip Compression** (add to server.js):
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Rate Limiting** (add to server.js):
   ```javascript
   const rateLimit = require('express-rate-limit');
   const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
   app.use(limiter);
   ```

3. **CDN for Static Assets**
   - Upload icons to CDN
   - Update manifest.json URLs

---

## 🌐 Network Requirements

### Ports
- **HTTP**: 80 (redirects to HTTPS)
- **HTTPS**: 443
- **WebSocket**: 443 (same as HTTPS)

### Firewall Rules
Ensure these are open:
- Incoming: 443 (HTTPS/WebSocket)
- Outgoing: 443 (for external APIs)

### STUN/TURN Servers
- **STUN**: `stun:stun.l.google.com:19302` (default)
- **TURN**: Add your own for production

---

## 📱 Mobile App Installation

### PWA Installation
1. Open the app in mobile browser
2. Look for "Add to Home Screen" prompt
3. Tap "Add" to install as native app

### Testing on Mobile
1. Ensure HTTPS is working
2. Test camera permissions
3. Test screen sharing (mobile hosts)
4. Test QR code scanning

---

## 🔍 Monitoring & Debugging

### Health Check
- Endpoint: `/api/health`
- Returns: Server status and metrics

### Logs
- **Render**: View in dashboard
- **Docker**: Use `docker logs`
- **Local**: Check console output

### Common Issues

1. **WebSocket Connection Failed**
   - Check CORS settings
   - Verify WebSocket support
   - Check firewall rules

2. **Screen Sharing Not Working**
   - Ensure HTTPS is enabled
   - Check browser permissions
   - Verify WebRTC support

3. **QR Code Not Scanning**
   - Check camera permissions
   - Ensure good lighting
   - Test different devices

---

## 📊 Scaling Considerations

### Horizontal Scaling
- Use Redis for session storage
- Load balancer with sticky sessions
- Multiple server instances

### Vertical Scaling
- Increase RAM for concurrent sessions
- Faster CPU for video processing
- Better network bandwidth

### Database (Optional)
- Store user sessions
- Analytics and usage metrics
- Room persistence

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy to Render
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: your-service-id
          api-key: ${{ secrets.RENDER_API_KEY }}
```

---

## 🎯 Production Checklist

### Before Deployment
- [ ] Test all features locally
- [ ] Update environment variables
- [ ] Generate production icons
- [ ] Test HTTPS functionality
- [ ] Verify mobile compatibility

### After Deployment
- [ ] Test screen sharing functionality
- [ ] Test QR code scanning
- [ ] Test PWA installation
- [ ] Monitor server logs
- [ ] Set up monitoring alerts

### Ongoing Maintenance
- [ ] Regular dependency updates
- [ ] Performance monitoring
- [ ] Security audits
- [ ] Backup strategy
- [ ] User feedback collection

---

## 🆘 Support

### Troubleshooting
1. Check deployment logs
2. Verify environment variables
3. Test network connectivity
4. Monitor resource usage

### Getting Help
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **WebRTC Docs**: [webrtc.org](https://webrtc.org/)
- **PWA Docs**: [web.dev/progressive-web-apps](https://web.dev/progressive-web-apps/)

---

**🎉 Your Instant Screen Share app is ready for production deployment!**