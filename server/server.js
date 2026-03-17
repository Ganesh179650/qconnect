const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Security headers for production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });
}

// Room management
const rooms = new Map();

// Utility functions
function validateSessionId(sessionId) {
    return typeof sessionId === 'string' && 
           sessionId.length >= 6 && 
           sessionId.length <= 20 &&
           /^[A-Z0-9]+$/.test(sessionId);
}

function logConnection(socket, event, data = {}) {
    console.log(`[${new Date().toISOString()}] ${socket.id} - ${event}`, data);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    logConnection(socket, 'Connected');
    
    // Handle room creation (host)
    socket.on('create-room', (sessionId) => {
        logConnection(socket, 'Create room attempt', { sessionId });
        
        // Validate session ID
        if (!validateSessionId(sessionId)) {
            socket.emit('error', { message: 'Invalid session ID format' });
            return;
        }
        
        // Check if room already exists
        if (rooms.has(sessionId)) {
            socket.emit('error', { message: 'Room already exists' });
            return;
        }
        
        // Create new room
        const room = {
            id: sessionId,
            host: socket.id,
            peers: new Set(),
            createdAt: new Date(),
            lastActivity: new Date()
        };
        
        rooms.set(sessionId, room);
        socket.join(sessionId);
        socket.currentRoom = sessionId;
        socket.isHost = true;
        
        logConnection(socket, 'Room created', { sessionId });
        socket.emit('room-created', { sessionId });
        
        console.log(`Active rooms: ${rooms.size}`);
    });
    
    // Handle room joining (peer)
    socket.on('join-room', (sessionId) => {
        logConnection(socket, 'Join room attempt', { sessionId });
        
        // Validate session ID
        if (!validateSessionId(sessionId)) {
            socket.emit('error', { message: 'Invalid session ID format' });
            return;
        }
        
        // Check if room exists
        const room = rooms.get(sessionId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        // Check if room is full (optional: limit peers)
        if (room.peers.size >= 10) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }
        
        // Join room
        socket.join(sessionId);
        socket.currentRoom = sessionId;
        socket.isHost = false;
        
        room.peers.add(socket.id);
        room.lastActivity = new Date();
        
        logConnection(socket, 'Joined room', { sessionId, hostId: room.host });
        
        // Notify host
        io.to(room.host).emit('peer-joined', { peerId: socket.id });
        
        // Notify peer
        socket.emit('room-joined', { 
            sessionId, 
            hostId: room.host,
            peerCount: room.peers.size
        });
    });
    
    // WebRTC signaling - Offer
    socket.on('offer', (data) => {
        const { roomId, offer } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
            socket.emit('error', { message: 'Invalid room for offer' });
            return;
        }
        
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        // Forward offer to appropriate recipient
        let targetSocket;
        if (socket.isHost) {
            // Host sending offer to peer
            targetSocket = Array.from(room.peers)[0];
        } else {
            // Peer sending offer to host
            targetSocket = room.host;
        }
        
        if (targetSocket) {
            io.to(targetSocket).emit('offer', {
                offer,
                senderId: socket.id
            });
            logConnection(socket, 'Offer relayed', { roomId, targetSocket });
        }
    });
    
    // WebRTC signaling - Answer
    socket.on('answer', (data) => {
        const { roomId, answer } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
            socket.emit('error', { message: 'Invalid room for answer' });
            return;
        }
        
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        // Forward answer to appropriate recipient
        let targetSocket;
        if (socket.isHost) {
            // Host sending answer to peer
            targetSocket = Array.from(room.peers)[0];
        } else {
            // Peer sending answer to host
            targetSocket = room.host;
        }
        
        if (targetSocket) {
            io.to(targetSocket).emit('answer', {
                answer,
                senderId: socket.id
            });
            logConnection(socket, 'Answer relayed', { roomId, targetSocket });
        }
    });
    
    // WebRTC signaling - ICE candidates
    socket.on('ice-candidate', (data) => {
        const { roomId, candidate } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
            socket.emit('error', { message: 'Invalid room for ICE candidate' });
            return;
        }
        
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        // Forward ICE candidate to appropriate recipient
        let targetSocket;
        if (socket.isHost) {
            // Host sending candidate to peer
            targetSocket = Array.from(room.peers)[0];
        } else {
            // Peer sending candidate to host
            targetSocket = room.host;
        }
        
        if (targetSocket) {
            io.to(targetSocket).emit('ice-candidate', {
                candidate,
                senderId: socket.id
            });
            logConnection(socket, 'ICE candidate relayed', { roomId, targetSocket });
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        logConnection(socket, 'Disconnected');
        
        // Clean up room if socket was in one
        if (socket.currentRoom) {
            const room = rooms.get(socket.currentRoom);
            
            if (room) {
                if (socket.isHost) {
                    // Host disconnected - notify peers and remove room
                    io.to(socket.currentRoom).emit('host-disconnected');
                    rooms.delete(socket.currentRoom);
                    console.log(`Room ${socket.currentRoom} removed (host disconnected)`);
                } else {
                    // Peer disconnected - remove from room and notify host
                    room.peers.delete(socket.id);
                    room.lastActivity = new Date();
                    
                    io.to(room.host).emit('peer-disconnected', {
                        peerId: socket.id,
                        peerCount: room.peers.size
                    });
                    
                    // Remove room if empty
                    if (room.peers.size === 0) {
                        rooms.delete(socket.currentRoom);
                        console.log(`Room ${socket.currentRoom} removed (empty)`);
                    }
                }
            }
        }
        
        console.log(`Active rooms: ${rooms.size}`);
    });
    
    // Handle errors
    socket.on('error', (error) => {
        logConnection(socket, 'Socket error', error);
    });
});

// Room cleanup interval (remove inactive rooms)
setInterval(() => {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, room] of rooms.entries()) {
        if (now - room.lastActivity > inactiveThreshold) {
            // Notify all participants
            io.to(sessionId).emit('room-expired');
            
            // Remove room
            rooms.delete(sessionId);
            console.log(`Room ${sessionId} removed (inactive)`);
        }
    }
    
    console.log(`Room cleanup completed. Active rooms: ${rooms.size}`);
}, 5 * 60 * 1000); // Run every 5 minutes

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        activeRooms: rooms.size,
        connectedClients: io.engine.clientsCount
    });
});

app.get('/api/rooms/:sessionId/status', (req, res) => {
    const { sessionId } = req.params;
    
    if (!validateSessionId(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }
    
    const room = rooms.get(sessionId);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({
        sessionId: room.id,
        peerCount: room.peers.size,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity
    });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/join.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/join.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
        console.log('Forcing shutdown');
        process.exit(1);
    }, 30000);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
        console.log('Forcing shutdown');
        process.exit(1);
    }, 30000);
});

// Start server
const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`\n🚀 Screen Share Server started successfully!`);
    console.log(`📍 Server running on: http://${HOST}:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📱 Ready to handle screen sharing sessions\n`);
    
    // Log startup info
    console.log('📊 Server Configuration:');
    console.log(`   - Port: ${PORT}`);
    console.log(`   - Host: ${HOST}`);
    console.log(`   - CORS: Enabled`);
    console.log(`   - WebSocket: Enabled`);
    console.log(`   - Room cleanup: Every 5 minutes\n`);
});

// Export for testing
module.exports = { app, server, io, rooms };