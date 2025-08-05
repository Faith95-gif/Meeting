import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { setupDatabase, setupMiddleware } from './modules/config.js';
import { setupSession, setupAuthRoutes } from './modules/auth.js';
import { setupSocketIO } from './modules/call.js';
import { setupFileShare } from './modules/fileShare.js';
import { setupFilePermission } from './modules/filePermission.js';
import { setupChat } from './modules/chat.js';
import { setupChatControl } from './modules/chatControl.js';
import { setupPoll } from './modules/poll.js';
import { setupRecordingControl } from './modules/recordingControl.js';
import { setuprecording } from './modules/recording.js';
import { setupHandRaising } from './modules/handRaising.js';
import { setupScreenSharingControl } from './modules/screenSharingControl.js';
import { setupParticipantControl } from './modules/participantControl.js';
import { setupMeetingScheduler } from './modules/meetingScheduler.js';
import { setupMeetingStatsRoutes, setupMeetingStatsSocket } from './modules/meetingStats.js';
import { setupMeetingBooking } from './modules/meetingBooking.js'; // New import

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Setup middleware
setupMiddleware(app);

// Setup session (this now includes Passport initialization)
setupSession(app);

// Setup database
setupDatabase();

// Setup auth routes (this now includes Google OAuth routes)
setupAuthRoutes(app);

// Setup Socket.IO and meeting routes
const { io, setupMeetingRoutes } = setupSocketIO(server);
setupMeetingRoutes(app);

// Setup recording control functionality
const { recordingManager, setupSocketHandlers: setupRecordingSocketHandlers } = setupRecordingControl(app, io);

// Setup recording permission functionality
const { permissionManager, setupSocketHandlers: setuprecordingSocketHandlers } = setuprecording(app, io);

// Setup chat functionality
const { setupChatSocketHandlers } = setupChat(app, io);

// Setup chat control functionality
const chatControlAPI = setupChatControl(app, io);

// Setup file sharing functionality
const fileShareAPI = setupFileShare(app, io);

// Setup file permission functionality
const { permissionManager: filePermissionManager, setupSocketHandlers: setupFilePermissionSocketHandlers } = setupFilePermission(app, io);

// Setup poll functionality
const pollAPI = setupPoll(app, io);

// Setup hand raising functionality
const handRaisingAPI = setupHandRaising(app, io);

// Setup screen sharing control functionality
const screenSharingAPI = setupScreenSharingControl(app, io);

// Setup participant control functionality
const participantControlAPI = setupParticipantControl(app, io);

// Setup meeting scheduler functionality
const schedulerAPI = setupMeetingScheduler(app, io);

// Setup meeting booking functionality (NEW)
const bookingAPI = setupMeetingBooking(app, io);

// Setup meeting statistics functionality
setupMeetingStatsRoutes(app);
const meetingStatsAPI = setupMeetingStatsSocket(io);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Default route - Updated to handle both session-based and Passport-based auth
app.get('/', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

// Meeting host route - Updated auth check
app.get('/host', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'meetingHost.html'));
  } else {
    res.redirect('/');
  }
});

app.get('/schedule', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard/meeting/schedule.html'));
});

// Meeting booking route - NEW
app.get('/booking', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'booking.html'));
  } else {
    res.redirect('/');
  }
});

// Upcoming meetings route - NEW
app.get('/upcoming', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'upcoming.html'));
  } else {
    res.redirect('/');
  }
});

// Meeting join route - Updated auth check
app.get('/join', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'meetingJoin.html'));
  } else {
    res.redirect('/');
  }
});

// Chat route - Updated auth check
app.get('/chat', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
  } else {
    res.redirect('/');
  }
});

// File sharing dashboard route - Updated auth check
app.get('/files', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'files.html'));
  } else {
    res.redirect('/');
  }
});

// Poll dashboard route - Updated auth check
app.get('/poll', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'poll.html'));
  } else {
    res.redirect('/');
  }
});

// Recording control dashboard route - Updated auth check
app.get('/recording', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'recording.html'));
  } else {
    res.redirect('/');
  }
});

// Screen sharing control dashboard route - Updated auth check
app.get('/screen-sharing', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'screenSharing.html'));
  } else {
    res.redirect('/');
  }
});

// Participant control dashboard route - Updated auth check
app.get('/participant-control', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'participantControl.html'));
  } else {
    res.redirect('/');
  }
});

// Meeting scheduler route
app.get('/scheduler', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'scheduler.html'));
  } else {
    res.redirect('/');
  }
});

// Dashboard route (explicit)
app.get('/dashboard', (req, res) => {
  if (req.session.userId || req.user) {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'dashboard.html'));
  } else {
    res.redirect('/login');
  }
});

// Enhanced Socket.IO connection handling to include all functionality
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Setup chat handlers for this socket
  const { handleChatDisconnect } = setupChatSocketHandlers(socket);
  
  // Setup chat control handlers for this socket
  const { handleDisconnect: handleChatControlDisconnect } = chatControlAPI.setupSocketHandlers(socket);
  
  // Setup poll handlers for this socket
  const { handlePollDisconnect } = pollAPI.setupPollSocketHandlers(socket);
  
  // Setup recording control handlers for this socket
  const { handleDisconnect: handleRecordingDisconnect } = setupRecordingSocketHandlers(socket);
  
  // Setup recording permission handlers for this socket
  const { handleDisconnect: handlerecordingDisconnect } = setuprecordingSocketHandlers(socket);
  
  // Setup file permission handlers for this socket
  const { handleDisconnect: handleFilePermissionDisconnect } = setupFilePermissionSocketHandlers(socket);
  
  // Setup hand raising handlers for this socket
  const { handleDisconnect: handleHandRaisingDisconnect } = handRaisingAPI.setupSocketHandlers(socket);
  
  // Setup screen sharing control handlers for this socket
  const { handleDisconnect: handleScreenSharingDisconnect } = screenSharingAPI.setupSocketHandlers(socket);
  
  // Setup participant control handlers for this socket
  const { handleDisconnect: handleParticipantControlDisconnect } = participantControlAPI.setupSocketHandlers(socket);
  
  // Setup meeting scheduler handlers for this socket
  const { handleDisconnect: handleSchedulerDisconnect } = schedulerAPI.setupSocketHandlers(socket);
  
  // Setup meeting booking handlers for this socket (NEW)
  const { handleDisconnect: handleBookingDisconnect } = bookingAPI.setupSocketHandlers(socket);
  
  // Setup meeting stats handlers for this socket
  const { handleDisconnect: handleStatsDisconnect } = meetingStatsAPI.setupSocketHandlers(socket);
  
  // Override the original disconnect handler to include all cleanup
  const originalDisconnectHandler = socket.listeners('disconnect')[0];
  socket.removeAllListeners('disconnect');
  
  socket.on('disconnect', () => {
    // Handle chat cleanup
    handleChatDisconnect();
    
    // Handle chat control cleanup
    handleChatControlDisconnect();
    
    // Handle poll cleanup
    handlePollDisconnect();
    
    // Handle recording control cleanup
    handleRecordingDisconnect();
    
    // Handle recording permission cleanup
    handlerecordingDisconnect();
    
    // Handle file permission cleanup
    handleFilePermissionDisconnect();
    
    // Handle hand raising cleanup
    handleHandRaisingDisconnect();
    
    // Handle screen sharing control cleanup
    handleScreenSharingDisconnect();
    
    // Handle participant control cleanup
    handleParticipantControlDisconnect();
    
    // Handle scheduler cleanup
    handleSchedulerDisconnect();
    
    // Handle booking cleanup (NEW)
    handleBookingDisconnect();
    
    // Handle stats cleanup
    handleStatsDisconnect();
    
    // Call original disconnect handler if it exists (from call.js)
    if (originalDisconnectHandler) {
      originalDisconnectHandler();
    }
    
    console.log('User disconnected:', socket.id);
  });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({ error: 'Page not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/`);
    console.log(`Host page: http://localhost:${PORT}/host`);
    console.log(`Join page: http://localhost:${PORT}/join`);
    console.log(`Scheduler: http://localhost:${PORT}/scheduler`);
    console.log('Google OAuth integration enabled');
    console.log('Chat control functionality integrated');
    console.log('Screen sharing control functionality integrated');
    console.log('Participant control functionality integrated');
    console.log('Meeting scheduler functionality integrated');
    console.log('Meeting statistics functionality integrated');
    
    // Log environment status
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        console.log('✓ Google OAuth credentials configured');
    } else {
        console.log('⚠ Google OAuth credentials not found - check your .env file');
    }
    
    // Log scheduler email status
    if (process.env.SCHEDULER_EMAIL && process.env.SCHEDULER_EMAIL_PASSWORD) {
        console.log('✓ Scheduler email credentials configured');
    } else {
        console.log('⚠ Scheduler email credentials not found - using defaults (check your .env file)');
    }
});