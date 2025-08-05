import mongoose from 'mongoose';

// Meeting Activity Schema
const meetingActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meetingName: { type: String, required: true },
  meetingId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['completed', 'scheduled', 'missed', 'cancelled'], 
    default: 'completed' 
  },
  duration: { type: Number }, // Duration in minutes
  participantCount: { type: Number, default: 1 },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const MeetingActivity = mongoose.model('MeetingActivity', meetingActivitySchema);

// Setup meeting activity tracking
export const setupMeetingActivity = (app, io) => {
  
  // API endpoint to get recent activities for a user
  app.get('/api/recent-activities', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      
      const activities = await MeetingActivity
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName email profilePicture');
      
      res.json({ activities });
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      res.status(500).json({ error: 'Failed to fetch recent activities' });
    }
  });

  // API endpoint to save meeting activity
  app.post('/api/meeting-activity', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      const { meetingName, meetingId, status, duration, participantCount, startTime, endTime } = req.body;
      
      if (!meetingName || !meetingId) {
        return res.status(400).json({ error: 'Meeting name and ID are required' });
      }
      
      const activity = new MeetingActivity({
        userId,
        meetingName,
        meetingId,
        status: status || 'completed',
        duration,
        participantCount: participantCount || 1,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date()
      });
      
      await activity.save();
      
      // Emit to user's socket for real-time updates
      io.to(`user_${userId}`).emit('activity-updated', {
        type: 'meeting-completed',
        activity: {
          id: activity._id,
          meetingName: activity.meetingName,
          status: activity.status,
          duration: activity.duration,
          participantCount: activity.participantCount,
          createdAt: activity.createdAt
        }
      });
      
      res.json({ message: 'Meeting activity saved successfully', activityId: activity._id });
    } catch (error) {
      console.error('Error saving meeting activity:', error);
      res.status(500).json({ error: 'Failed to save meeting activity' });
    }
  });

  // Socket handlers for real-time meeting tracking
  const setupSocketHandlers = (socket) => {
    // Join user-specific room for activity updates
    socket.on('join-user-room', (userId) => {
      socket.join(`user_${userId}`);
    });

    // Handle meeting start
    socket.on('meeting-started', async (data) => {
      try {
        const { meetingId, meetingName, userId } = data;
        
        if (!userId || !meetingId || !meetingName) {
          return;
        }

        // Store meeting start data in socket for later use
        socket.meetingData = {
          meetingId,
          meetingName,
          userId,
          startTime: new Date(),
          participantCount: 1
        };
        
        console.log(`Meeting started: ${meetingName} (${meetingId}) by user ${userId}`);
      } catch (error) {
        console.error('Error handling meeting start:', error);
      }
    });

    // Handle participant join
    socket.on('participant-joined', (data) => {
      if (socket.meetingData) {
        socket.meetingData.participantCount = (socket.meetingData.participantCount || 1) + 1;
      }
    });

    // Handle participant leave
    socket.on('participant-left', (data) => {
      if (socket.meetingData && socket.meetingData.participantCount > 1) {
        socket.meetingData.participantCount -= 1;
      }
    });

    // Handle meeting end
    socket.on('meeting-ended', async (data) => {
      try {
        if (!socket.meetingData) {
          console.log('No meeting data found for ended meeting');
          return;
        }

        const endTime = new Date();
        const duration = Math.round((endTime - socket.meetingData.startTime) / (1000 * 60)); // Duration in minutes

        const activity = new MeetingActivity({
          userId: socket.meetingData.userId,
          meetingName: socket.meetingData.meetingName,
          meetingId: socket.meetingData.meetingId,
          status: 'completed',
          duration,
          participantCount: socket.meetingData.participantCount || 1,
          startTime: socket.meetingData.startTime,
          endTime
        });

        await activity.save();
        
        // Emit to user's socket for real-time updates
        io.to(`user_${socket.meetingData.userId}`).emit('activity-updated', {
          type: 'meeting-completed',
          activity: {
            id: activity._id,
            meetingName: activity.meetingName,
            status: activity.status,
            duration: activity.duration,
            participantCount: activity.participantCount,
            createdAt: activity.createdAt
          }
        });

        console.log(`Meeting activity saved: ${socket.meetingData.meetingName} (${duration} minutes)`);
        
        // Clear meeting data
        socket.meetingData = null;
      } catch (error) {
        console.error('Error saving meeting activity on end:', error);
      }
    });

    const handleDisconnect = () => {
      // If user disconnects during a meeting, still save the activity
      if (socket.meetingData) {
        const endTime = new Date();
        const duration = Math.round((endTime - socket.meetingData.startTime) / (1000 * 60));

        const activity = new MeetingActivity({
          userId: socket.meetingData.userId,
          meetingName: socket.meetingData.meetingName,
          meetingId: socket.meetingData.meetingId,
          status: 'completed',
          duration,
          participantCount: socket.meetingData.participantCount || 1,
          startTime: socket.meetingData.startTime,
          endTime
        });

        activity.save().catch(error => {
          console.error('Error saving meeting activity on disconnect:', error);
        });
      }
    };

    return { handleDisconnect };
  };

  return { setupSocketHandlers, MeetingActivity };
};

export { MeetingActivity };