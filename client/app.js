// Global variables
let socket;
let peerConnection;
let localStream;
let remoteStream;
let currentSessionId;
let isHost = false;
let qrCodeScanner;

// WebRTC Configuration
const rtcConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        // Add TURN servers for production
        // {
        //     urls: "turn:your-turn-server.com",
        //     username: "your-username",
        //     credential: "your-password"
        // }
    ]
};

// DOM Elements
const elements = {
    // Pages
    homePage: document.getElementById('homePage'),
    hostPage: document.getElementById('hostPage'),
    scannerPage: document.getElementById('scannerPage'),
    joinPage: document.getElementById('joinPage'),
    
    // Home page buttons
    startSharingBtn: document.getElementById('startSharingBtn'),
    scanQRBtn: document.getElementById('scanQRBtn'),
    installBtn: document.getElementById('installBtn'),
    
    // Navigation
    backToHomeBtn: document.getElementById('backToHomeBtn'),
    backToHomeFromScannerBtn: document.getElementById('backToHomeFromScannerBtn'),
    backToHomeFromJoinBtn: document.getElementById('backToHomeFromJoinBtn'),
    
    // Host page elements
    sessionId: document.getElementById('sessionId'),
    qrcode: document.getElementById('qrcode'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),
    previewVideo: document.getElementById('previewVideo'),
    previewPlaceholder: document.getElementById('previewPlaceholder'),
    startCaptureBtn: document.getElementById('startCaptureBtn'),
    stopCaptureBtn: document.getElementById('stopCaptureBtn'),
    
    // Scanner page elements
    qrScanner: document.getElementById('qrScanner'),
    scannerVideo: document.getElementById('scannerVideo'),
    switchCameraBtn: document.getElementById('switchCameraBtn'),
    
    // Join page elements
    joinSessionId: document.getElementById('joinSessionId'),
    joinStatusIndicator: document.getElementById('joinStatusIndicator'),
    joinStatusText: document.getElementById('joinStatusText'),
    remoteVideo: document.getElementById('remoteVideo'),
    videoPlaceholder: document.getElementById('videoPlaceholder'),
    toggleAudioBtn: document.getElementById('toggleAudioBtn'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    connectionTime: document.getElementById('connectionTime'),
    connectionQuality: document.getElementById('connectionQuality'),
    
    // Overlays
    loadingOverlay: document.getElementById('loadingOverlay'),
    toastContainer: document.getElementById('toastContainer')
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    initializeApp();
    setupEventListeners();
    setupPWAInstall();
});

// Create floating particles
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random size
        const size = Math.random() * 6 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random position
        particle.style.left = `${Math.random() * 100}%`;
        
        // Random animation delay
        particle.style.animationDelay = `${Math.random() * 15}s`;
        
        // Random animation duration
        particle.style.animationDuration = `${Math.random() * 10 + 15}s`;
        
        // Random opacity
        particle.style.opacity = Math.random() * 0.3 + 0.1;
        
        particlesContainer.appendChild(particle);
    }
}

// Initialize application
function initializeApp() {
    // Check if we're on join page with session ID
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    
    if (sessionId && window.location.pathname.includes('join.html')) {
        currentSessionId = sessionId;
        elements.joinSessionId.textContent = sessionId;
        showPage('joinPage');
        initializeJoin();
    } else {
        showPage('homePage');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Home page buttons
    elements.startSharingBtn.addEventListener('click', startHosting);
    elements.scanQRBtn.addEventListener('click', startScanning);
    
    // Navigation buttons
    elements.backToHomeBtn.addEventListener('click', () => {
        stopScanner();
        showPage('homePage');
    });
    elements.backToHomeFromScannerBtn.addEventListener('click', () => {
        stopScanner();
        showPage('homePage');
    });
    elements.backToHomeFromJoinBtn.addEventListener('click', disconnectPeer);
    
    // Host page buttons
    elements.copyLinkBtn.addEventListener('click', copyJoinLink);
    elements.startCaptureBtn.addEventListener('click', startScreenCapture);
    elements.stopCaptureBtn.addEventListener('click', stopScreenCapture);
    
    // Scanner page buttons
    elements.switchCameraBtn.addEventListener('click', switchCamera);
    
    // Join page buttons
    elements.toggleAudioBtn.addEventListener('click', toggleAudio);
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
    elements.disconnectBtn.addEventListener('click', disconnectPeer);
}

// Page navigation
function showPage(pageId) {
    // Stop camera if leaving scanner page
    if (elements.scannerPage.classList.contains('active') && pageId !== 'scannerPage') {
        stopScanner();
    }
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    elements[pageId].classList.add('active');
}

// PWA Install Setup
function setupPWAInstall() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        elements.installBtn.style.display = 'flex';
    });
    
    elements.installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            elements.installBtn.style.display = 'none';
            
            if (outcome === 'accepted') {
                showToast('App installed successfully!', 'success');
            }
        }
    });
}

// Hosting functionality
function startHosting() {
    isHost = true;
    currentSessionId = generateSessionId();
    elements.sessionId.textContent = currentSessionId;
    
    showPage('hostPage');
    generateQRCode();
    initializeSocket();
    initializePeerConnection();
    
    showToast('Session created! Share the QR code to start.', 'success');
}

function generateSessionId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateQRCode() {
    const joinUrl = `${window.location.origin}/join.html?session=${currentSessionId}`;
    
    // Clear existing QR code
    elements.qrcode.innerHTML = '';
    
    // Generate new QR code
    new QRCode(elements.qrcode, {
        text: joinUrl,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

function copyJoinLink() {
    const joinUrl = `${window.location.origin}/join.html?session=${currentSessionId}`;
    
    navigator.clipboard.writeText(joinUrl).then(() => {
        showToast('Link copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy link', 'error');
    });
}

// Screen capture functionality
async function startScreenCapture() {
    try {
        showLoading(true);
        
        // Request screen capture with audio
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: 'always'
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        });
        
        localStream = stream;
        
        // Show preview
        elements.previewVideo.srcObject = stream;
        elements.previewVideo.style.display = 'block';
        elements.previewPlaceholder.style.display = 'none';
        
        // Add tracks to peer connection
        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });
        
        // Update UI
        elements.startCaptureBtn.style.display = 'none';
        elements.stopCaptureBtn.style.display = 'flex';
        
        // Listen for stream end
        stream.getVideoTracks()[0].addEventListener('ended', () => {
            stopScreenCapture();
        });
        
        showToast('Screen sharing started!', 'success');
        updateStatus('connected', 'Screen sharing active');
        
    } catch (error) {
        console.error('Error starting screen capture:', error);
        showToast('Failed to start screen capture. Please check permissions.', 'error');
        updateStatus('error', 'Screen capture failed');
    } finally {
        showLoading(false);
    }
}

function stopScreenCapture() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Clear preview
    elements.previewVideo.srcObject = null;
    elements.previewVideo.style.display = 'none';
    elements.previewPlaceholder.style.display = 'flex';
    
    // Update UI
    elements.startCaptureBtn.style.display = 'flex';
    elements.stopCaptureBtn.style.display = 'none';
    
    // Remove tracks from peer connection
    if (peerConnection) {
        peerConnection.getSenders().forEach(sender => {
            peerConnection.removeTrack(sender);
        });
    }
    
    showToast('Screen sharing stopped', 'warning');
    updateStatus('waiting', 'Waiting for connection...');
}

// QR Scanner functionality
async function startScanning() {
    showPage('scannerPage');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        elements.scannerVideo.srcObject = stream;
        
        // Store stream reference for cleanup
        window.cameraStream = stream;
        
        // Initialize QR scanner
        initializeQRScanner();
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        showToast('Failed to access camera. Please check permissions.', 'error');
        showPage('homePage');
    }
}

function initializeQRScanner() {
    // Load html5-qrcode library dynamically
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.onload = () => {
        startQRScanning();
    };
    document.head.appendChild(script);
}

function startQRScanning() {
    window.html5QrCode = new Html5Qrcode("qrScanner");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    window.html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
            // QR code scanned successfully
            handleQRCodeScan(decodedText);
            
            // Stop scanner after successful scan
            stopScanner();
        },
        (errorMessage) => {
            // Handle scan error silently
        }
    ).catch((err) => {
        console.error('Unable to start QR scanner:', err);
        showToast('Failed to start QR scanner', 'error');
        stopScanner();
    });
}

function handleQRCodeScan(decodedText) {
    try {
        const url = new URL(decodedText);
        const sessionId = url.searchParams.get('session');
        
        if (sessionId) {
            currentSessionId = sessionId;
            window.location.href = `join.html?session=${sessionId}`;
        } else {
            showToast('Invalid QR code', 'error');
        }
    } catch (error) {
        showToast('Invalid QR code format', 'error');
    }
}

function stopScanner() {
    // Stop camera stream
    if (window.cameraStream) {
        window.cameraStream.getTracks().forEach(track => {
            track.stop();
        });
        window.cameraStream = null;
    }
    
    // Clear video element
    if (elements.scannerVideo.srcObject) {
        elements.scannerVideo.srcObject = null;
    }
    
    // Stop QR scanner if it exists
    if (window.html5QrCode) {
        window.html5QrCode.stop().then(() => {
            window.html5QrCode.clear();
        }).catch((err) => {
            console.warn('Unable to stop QR scanner:', err);
        });
        window.html5QrCode = null;
    }
    
    console.log('Camera and scanner stopped');
}

function switchCamera() {
    // Stop current camera
    stopScanner();
    
    // Restart with front camera
    setTimeout(() => {
        startScanning();
        showToast('Switched camera', 'success');
    }, 500);
}

// Join functionality
function initializeJoin() {
    isHost = false;
    initializeSocket();
    initializePeerConnection();
    
    showToast('Connecting to session...', 'info');
    updateJoinStatus('waiting', 'Connecting to host...');
}

// Socket.IO connection
function initializeSocket() {
    // Connect to server - adjust URL for production
    const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : window.location.origin;
    
    socket = io(serverUrl);
    
    socket.on('connect', () => {
        console.log('Connected to server');
        
        if (currentSessionId) {
            if (isHost) {
                socket.emit('create-room', currentSessionId);
            } else {
                socket.emit('join-room', currentSessionId);
            }
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showToast('Connection lost', 'error');
        
        if (isHost) {
            updateStatus('error', 'Connection lost');
        } else {
            updateJoinStatus('error', 'Connection lost');
        }
    });
    
    // Host events
    socket.on('peer-joined', () => {
        console.log('Peer joined room');
        showToast('Peer connected! Starting screen share...', 'success');
        updateStatus('connected', 'Peer connected');
        
        // Start WebRTC connection
        createOffer();
    });
    
    socket.on('offer', async (data) => {
        console.log('Received offer');
        await handleOffer(data.offer);
    });
    
    socket.on('answer', async (data) => {
        console.log('Received answer');
        await handleAnswer(data.answer);
    });
    
    socket.on('ice-candidate', async (data) => {
        console.log('Received ICE candidate');
        await handleIceCandidate(data.candidate);
    });
    
    socket.on('peer-left', () => {
        console.log('Peer left room');
        showToast('Peer disconnected', 'warning');
        
        if (isHost) {
            updateStatus('waiting', 'Waiting for connection...');
        } else {
            updateJoinStatus('error', 'Host disconnected');
            elements.remoteVideo.style.display = 'none';
            elements.videoPlaceholder.style.display = 'flex';
        }
    });
}

// WebRTC functionality
function initializePeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfiguration);
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
            socket.emit('ice-candidate', {
                roomId: currentSessionId,
                candidate: event.candidate
            });
        }
    };
    
    // Handle remote streams
    peerConnection.ontrack = (event) => {
        console.log('Received remote stream');
        remoteStream = event.streams[0];
        
        if (!isHost) {
            elements.remoteVideo.srcObject = remoteStream;
            elements.remoteVideo.style.display = 'block';
            elements.videoPlaceholder.style.display = 'none';
            updateJoinStatus('connected', 'Connected to screen share');
            startConnectionTimer();
        }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
            showToast('WebRTC connection established!', 'success');
        } else if (peerConnection.connectionState === 'disconnected' || 
                   peerConnection.connectionState === 'failed') {
            showToast('Connection lost', 'error');
        }
    };
}

async function createOffer() {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('offer', {
            roomId: currentSessionId,
            offer: offer
        });
    } catch (error) {
        console.error('Error creating offer:', error);
        showToast('Failed to create connection offer', 'error');
    }
}

async function handleOffer(offer) {
    try {
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('answer', {
            roomId: currentSessionId,
            answer: answer
        });
    } catch (error) {
        console.error('Error handling offer:', error);
        showToast('Failed to handle connection offer', 'error');
    }
}

async function handleAnswer(answer) {
    try {
        await peerConnection.setRemoteDescription(answer);
    } catch (error) {
        console.error('Error handling answer:', error);
        showToast('Failed to handle connection answer', 'error');
    }
}

async function handleIceCandidate(candidate) {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
}

// Join page controls
function toggleAudio() {
    if (elements.remoteVideo.muted) {
        elements.remoteVideo.muted = false;
        elements.toggleAudioBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <span>Audio On</span>
        `;
        showToast('Audio unmuted', 'success');
    } else {
        elements.remoteVideo.muted = true;
        elements.toggleAudioBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
            <span>Audio Off</span>
        `;
        showToast('Audio muted', 'warning');
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        elements.remoteVideo.requestFullscreen().then(() => {
            showToast('Entered fullscreen mode', 'success');
        }).catch(() => {
            showToast('Failed to enter fullscreen', 'error');
        });
    } else {
        document.exitFullscreen().then(() => {
            showToast('Exited fullscreen mode', 'info');
        });
    }
}

function disconnectPeer() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }
    
    // Reset connection timer
    if (window.connectionTimer) {
        clearInterval(window.connectionTimer);
    }
    
    showToast('Disconnected from session', 'info');
    
    // Redirect to home
    if (window.location.pathname.includes('join.html')) {
        window.location.href = 'index.html';
    } else {
        showPage('homePage');
    }
}

// Utility functions
function updateStatus(type, message) {
    elements.statusIndicator.className = `status-indicator ${type}`;
    elements.statusText.textContent = message;
}

function updateJoinStatus(type, message) {
    elements.joinStatusIndicator.className = `status-indicator ${type}`;
    elements.joinStatusText.textContent = message;
}

function showLoading(show) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

function startConnectionTimer() {
    let seconds = 0;
    window.connectionTimer = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        elements.connectionTime.textContent = 
            `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An unexpected error occurred', 'error');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Always stop camera when page unloads
    stopScanner();
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
    if (socket) {
        socket.disconnect();
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    // Stop camera if page becomes hidden (user switches tabs/apps)
    if (document.hidden && elements.scannerPage.classList.contains('active')) {
        stopScanner();
        showPage('homePage');
    }
});