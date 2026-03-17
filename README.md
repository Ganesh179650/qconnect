# 🎯 QCast

A full-stack Progressive Web App (PWA) for global screen sharing with QR codes and WebRTC technology.

## ✨ Features

- **📱 Cross-Platform**: Works on desktop browsers and mobile devices
- **🔗 QR Code Connection**: Scan QR codes to instantly join screen sharing sessions
- **🌐 Global Connectivity**: Connect devices across different networks using WebRTC
- **🎥 Screen + Audio**: Share both screen content and audio in real-time
- **📲 PWA Support**: Install as a native app on mobile devices
- **🎨 Modern UI**: Glassmorphism design with smooth animations
- **⚡ Real-time**: Low-latency streaming with WebSocket signaling
- **🔐 Secure**: HTTPS-only with session validation

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- Modern web browser with WebRTC support
- HTTPS (required for screen capture and camera access)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/instant-screenshare.git
   cd instant-screenshare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate app icons**
   - Open `client/icons/icon-generator.html` in your browser
   - Click "Generate Icons" and download all icon files
   - Place them in the `client/icons/` directory

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`
   - For mobile testing, use your device's browser and connect to your local network

## 📱 Usage

### For Host (Sharing Screen)

1. Open the app and click **"Start Sharing"**
2. A unique QR code will be generated
3. Click **"Start Screen Capture"** and select your screen/audio
4. Share the QR code with others to join

### For Viewer (Joining Session)

1. Open the app and click **"Scan QR Code"**
2. Point your camera at the host's QR code
3. The screen share will start automatically
4. Use audio controls and fullscreen as needed

## 🏗️ Project Structure

```
instant-screenshare/
├── client/                     # Frontend application
│   ├── index.html             # Main home page
│   ├── join.html              # Join session page
│   ├── styles.css             # Styling with glassmorphism
│   ├── app.js                 # Main JavaScript application
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # Service worker for offline
│   ├── offline.html           # Offline fallback page
│   └── icons/                 # App icons and generator
│       └── icon-generator.html
├── server/                     # Backend server
│   └── server.js              # Express + Socket.IO server
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## 🔧 Technical Stack

### Frontend
- **HTML5/CSS3/JavaScript (ES6+)**
- **WebRTC** for peer-to-peer video/audio streaming
- **Socket.IO Client** for real-time signaling
- **QRCode.js** for QR code generation
- **html5-qrcode** for QR code scanning
- **Service Worker** for PWA functionality

### Backend
- **Node.js** runtime
- **Express.js** web framework
- **Socket.IO** WebSocket server
- **CORS** for cross-origin requests

### PWA Features
- **Offline Support** with service worker caching
- **App Installation** on mobile devices
- **Responsive Design** for all screen sizes
- **Push Notifications** (optional)

## 🌐 Deployment

### Development
```bash
npm run dev
```

### Production
1. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   export HOST=0.0.0.0
   ```

2. **Start production server**
   ```bash
   npm start
   ```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Cloud Deployment (Render/Railway/Vercel)
- Deploy the Node.js server
- Ensure HTTPS is enabled
- Configure WebSocket support
- Set environment variables for TURN servers (optional)

## 🔒 Security Considerations

- **HTTPS Required**: Screen capture and camera access need secure context
- **Session Validation**: Server validates all session IDs
- **Room Isolation**: Each session is isolated from others
- **TURN Servers**: Add for restricted network environments

## 🎯 Browser Support

### Desktop
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Mobile
- ✅ Chrome Mobile 90+
- ✅ Safari iOS 14+
- ✅ Samsung Internet 15+
- ⚠️ Firefox Mobile (limited WebRTC support)

## 🔧 Configuration

### TURN Servers (Optional)
For production deployment behind restrictive networks, add TURN servers:

```javascript
// In client/app.js
const rtcConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
            urls: "turn:your-turn-server.com",
            username: "your-username",
            credential: "your-password"
        }
    ]
};
```

### Environment Variables
```bash
NODE_ENV=production        # Production mode
PORT=3000                 # Server port
HOST=0.0.0.0              # Server host
```

## 🐛 Troubleshooting

### Common Issues

1. **Camera not working**
   - Check browser permissions
   - Ensure HTTPS connection
   - Try different browser

2. **QR code not scanning**
   - Ensure good lighting
   - Hold camera steady
   - Check QR code is clearly visible

3. **Connection issues**
   - Check internet connection
   - Try refreshing the page
   - Check firewall settings

4. **Screen capture not working**
   - Ensure browser supports getDisplayMedia
   - Check screen sharing permissions
   - Try selecting different screen/window

### Debug Mode
Enable console logging:
```javascript
// In browser console
localStorage.debug = '*';
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WebRTC](https://webrtc.org/) for peer-to-peer communication
- [Socket.IO](https://socket.io/) for real-time signaling
- [QRCode.js](https://github.com/davidshimjs/qrcodejs) for QR generation
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) for QR scanning

## 📞 Support

If you encounter any issues or have questions:

- 📧 Email: support@screenshare.app
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/instant-screenshare/issues)
- 📖 Docs: [Wiki](https://github.com/your-username/instant-screenshare/wiki)

---

⭐ **Star this repo if it helped you!**