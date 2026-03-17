const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');

// Create HTTPS certificates for local development
const selfsigned = require('selfsigned');

// Generate self-signed certificate
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

// Express app setup
const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:10000', 'https://localhost:3443', '*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: 'development-https'
    });
});

// Start server
const PORT = process.env.PORT || 3443;
const HOST = process.env.HOST || '0.0.0.0';

// HTTPS server options
const httpsOptions = {
    key: pems.private,
    cert: pems.cert
};

// Create HTTPS server
const server = https.createServer(httpsOptions, app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:10000', 'https://localhost:3443', '*'],
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Store active rooms and peers
const rooms = new Map();
const peers = new Map();

// Socket connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    socket.on('create-room', (data) => {
        const roomId = generateRoomId();
        rooms.set(roomId, {
            host: socket.id,
            peers: new Set([socket.id]),
            createdAt: new Date()
        });
        
        socket.join(roomId);
        socket.emit('room-created', { roomId });
        console.log(`Room created: ${roomId} by ${socket.id}`);
    });
    
    socket.on('join-room', (data) => {
        const { roomId } = data;
        const room = rooms.get(roomId);
        
        if (room) {
            socket.join(roomId);
            room.peers.add(socket.id);
            peers.set(socket.id, { roomId, role: 'participant' });
            
            socket.emit('room-joined', { roomId });
            socket.to(roomId).emit('peer-joined', { peerId: socket.id });
            
            console.log(`User ${socket.id} joined room ${roomId}`);
        } else {
            socket.emit('room-error', { message: 'Room not found' });
        }
    });
    
    socket.on('webrtc-offer', (data) => {
        const { targetId, offer } = data;
        socket.to(targetId).emit('webrtc-offer', { from: socket.id, offer });
    });
    
    socket.on('webrtc-answer', (data) => {
        const { targetId, answer } = data;
        socket.to(targetId).emit('webrtc-answer', { from: socket.id, answer });
    });
    
    socket.on('webrtc-ice-candidate', (data) => {
        const { targetId, candidate } = data;
        socket.to(targetId).emit('webrtc-ice-candidate', { from: socket.id, candidate });
    });
    
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        // Clean up rooms and peers
        const peerInfo = peers.get(socket.id);
        if (peerInfo) {
            const { roomId } = peerInfo;
            const room = rooms.get(roomId);
            
            if (room) {
                room.peers.delete(socket.id);
                socket.to(roomId).emit('peer-left', { peerId: socket.id });
                
                if (room.peers.size === 0) {
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} deleted (empty)`);
                }
            }
            
            peers.delete(socket.id);
        }
    });
});

// Helper function to generate room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
}

// Start HTTPS server
server.listen(PORT, HOST, () => {
    console.log(`\n🚀 QCast HTTPS Server started successfully!`);
    console.log(`📍 Server running on: https://${HOST}:${PORT}`);
    console.log(`🌐 Environment: development-https`);
    console.log(`📱 Ready to handle screen sharing sessions\n`);
    
    console.log('📊 Server Configuration:');
    console.log(`   - Port: ${PORT}`);
    console.log(`   - Host: ${HOST}`);
    console.log(`   - Protocol: HTTPS`);
    console.log(`   - CORS: Enabled`);
    console.log(`   - WebSocket: Enabled`);
    console.log(`   - Certificate: Self-signed\n`);
    
    console.log('🔗 Access URLs:');
    console.log(`   - Local: https://localhost:${PORT}`);
    console.log(`   - Network: https://10.245.169.150:${PORT}`);
    console.log('\n⚠️  Note: Browser will show "Not Secure" warning - this is normal for self-signed certificates');
    console.log('   Click "Advanced" → "Proceed to localhost (unsafe)" to continue\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});