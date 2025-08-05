// Dashboard functionality
let currentUser = null;
let socket = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize socket connection
        socket = io();
        
        // Load user data
        await loadUserData();
        
        // Load recent activities
        await loadRecentActivities();
        
        // Load meeting statistics
        await loadMeetingStats();
        
        // Setup real-time updates
        setupRealtimeUpdates();
        
        // Setup settings
        setupSettings();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError('Failed to load dashboard data');
    }
});

// Load user data
async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        // Update UI with user data
        updateUserProfile(currentUser);
        
        // Join user-specific room for real-time updates
        if (socket && currentUser) {
            socket.emit('join-user-room', currentUser.id);
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
        // Redirect to login if not authenticated
        window.location.href = '/login';
    }
}

// Update user profile in header
function updateUserProfile(user) {
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl) userNameEl.textContent = user.name;
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userAvatarEl && user.profilePicture) {
        userAvatarEl.src = user.profilePicture;
    }
}

// Load recent activities
async function loadRecentActivities() {
    try {
        const response = await fetch('/api/recent-activities');
        if (!response.ok) {
            throw new Error('Failed to fetch recent activities');
        }
        
        const data = await response.json();
        displayRecentActivities(data.activities);
        
    } catch (error) {
        console.error('Error loading recent activities:', error);
        showActivityError();
    }
}

// Display recent activities
function displayRecentActivities(activities) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    if (!activities || activities.length === 0) {
        activityList.innerHTML = `
            <div class="activity-empty">
                <i class="fas fa-calendar-times"></i>
                <span>No recent activities</span>
            </div>
        `;
        return;
    }
    
    activityList.innerHTML = activities.map(activity => {
        const timeAgo = getTimeAgo(new Date(activity.createdAt));
        const statusIcon = getStatusIcon(activity.status);
        const statusClass = activity.status;
        
        return `
            <div class="activity-item">
                <div class="activity-avatar">
                    <img src="${activity.userId?.profilePicture || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'}" alt="User">
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.meetingName}</div>
                    <div class="activity-time">${timeAgo}</div>
                    ${activity.duration ? `<div class="activity-duration">${activity.duration} minutes</div>` : ''}
                </div>
                <div class="activity-status ${statusClass}">
                    <i class="${statusIcon}"></i>
                </div>
            </div>
        `;
    }).join('');
}

// Get status icon based on activity status
function getStatusIcon(status) {
    switch (status) {
        case 'completed':
            return 'fas fa-check';
        case 'scheduled':
            return 'fas fa-calendar';
        case 'missed':
            return 'fas fa-times';
        case 'cancelled':
            return 'fas fa-ban';
        default:
            return 'fas fa-circle';
    }
}

// Get time ago string
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Show activity loading error
function showActivityError() {
    const activityList = document.getElementById('activityList');
    if (activityList) {
        activityList.innerHTML = `
            <div class="activity-error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Failed to load activities</span>
                <button class="btn btn-sm btn-text" onclick="loadRecentActivities()">Retry</button>
            </div>
        `;
    }
}

// Load meeting statistics
async function loadMeetingStats() {
    try {
        const response = await fetch('/api/meeting-stats');
        if (response.ok) {
            const data = await response.json();
            updateMeetingStats(data.stats);
        }
    } catch (error) {
        console.error('Error loading meeting stats:', error);
    }
}

// Update meeting statistics display
function updateMeetingStats(stats) {
    const totalMeetingsEl = document.getElementById('totalMeetings');
    const totalHoursEl = document.getElementById('totalHours');
    const avgDurationEl = document.getElementById('avgDuration');
    
    if (totalMeetingsEl) totalMeetingsEl.textContent = stats?.totalMeetings || 0;
    if (totalHoursEl) totalHoursEl.textContent = `${Math.round((stats?.totalMinutes || 0) / 60)}h`;
    if (avgDurationEl) avgDurationEl.textContent = `${Math.round(stats?.averageDuration || 0)}m`;
}

// Setup real-time updates
function setupRealtimeUpdates() {
    if (!socket) return;
    
    // Listen for activity updates
    socket.on('activity-updated', (data) => {
        console.log('Activity updated:', data);
        
        if (data.type === 'meeting-completed') {
            // Reload activities to show the new one
            loadRecentActivities();
            
            // Update stats
            loadMeetingStats();
            
            // Show notification
            showNotification(`Meeting "${data.activity.meetingName}" completed`, 'success');
        }
    });
    
    // Listen for meeting stats updates
    socket.on('stats-updated', (data) => {
        updateMeetingStats(data.stats);
    });
}

// Setup settings toggles
function setupSettings() {
    const cameraToggle = document.getElementById('cameraToggle');
    const micToggle = document.getElementById('micToggle');
    const notificationToggle = document.getElementById('notificationToggle');
    
    // Load saved settings
    if (cameraToggle) {
        cameraToggle.checked = localStorage.getItem('defaultCamera') !== 'false';
        cameraToggle.addEventListener('change', () => {
            localStorage.setItem('defaultCamera', cameraToggle.checked);
        });
    }
    
    if (micToggle) {
        micToggle.checked = localStorage.getItem('defaultMic') !== 'false';
        micToggle.addEventListener('change', () => {
            localStorage.setItem('defaultMic', micToggle.checked);
        });
    }
    
    if (notificationToggle) {
        notificationToggle.checked = localStorage.getItem('notifications') !== 'false';
        notificationToggle.addEventListener('change', () => {
            localStorage.setItem('notifications', notificationToggle.checked);
        });
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Check if notifications are enabled
    if (localStorage.getItem('notifications') === 'false') {
        return;
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Show error message
function showError(message) {
    showNotification(message, 'error');
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            showError('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showError('Logout failed');
    }
}

// Add activity item dynamically (for real-time updates)
function addActivityItem(activity) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    // Remove loading or empty state
    const loading = activityList.querySelector('.activity-loading, .activity-empty');
    if (loading) {
        loading.remove();
    }
    
    const timeAgo = getTimeAgo(new Date(activity.createdAt));
    const statusIcon = getStatusIcon(activity.status);
    const statusClass = activity.status;
    
    const activityHTML = `
        <div class="activity-item activity-new">
            <div class="activity-avatar">
                <img src="${currentUser?.profilePicture || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'}" alt="User">
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.meetingName}</div>
                <div class="activity-time">${timeAgo}</div>
                ${activity.duration ? `<div class="activity-duration">${activity.duration} minutes</div>` : ''}
            </div>
            <div class="activity-status ${statusClass}">
                <i class="${statusIcon}"></i>
            </div>
        </div>
    `;
    
    // Add to top of list
    activityList.insertAdjacentHTML('afterbegin', activityHTML);
    
    // Remove the 'new' class after animation
    setTimeout(() => {
        const newItem = activityList.querySelector('.activity-new');
        if (newItem) {
            newItem.classList.remove('activity-new');
        }
    }, 1000);
}