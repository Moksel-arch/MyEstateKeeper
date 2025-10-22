// State to track if the user is logged in
let isAuthenticated = true; // Set to true by default to skip login
let cameraStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

// Global variable for the timestamp interval
let timestampInterval = null;

// --- Navigation and Section Management ---
function showSection(sectionId) {
    // Hide "Back to Dashboard" button by default
    const backBtn = document.getElementById('backToDashboardBtn');
    
    // Validate access (Now simplified since isAuthenticated is true by default)
    if (sectionId === 'login') {
        // Since login is removed, stop camera if we try to navigate here
        stopCamera();
        // Do nothing else, or redirect to dashboard
        return; 
    }

    // 1. Manage Camera Stream Lifecycle
    if (sectionId === 'media-capture-page') {
        startCamera();
    } else {
        stopCamera();
    }

    // 2. Manage Content Visibility
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // 3. Manage Sidebar Active State
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active-link');
    });
    // Find the corresponding sidebar link and set it to active
    const activeLink = document.querySelector(`.sidebar-link[onclick*="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active-link');
    }

    // 4. Manage Back Button Visibility
    if (sectionId !== 'dashboard') {
        backBtn.classList.remove('hidden');
    } else {
        backBtn.classList.add('hidden');
    }
    
    // 5. Close Mobile Menu after navigation (if currently open)
    const sidebar = document.getElementById('sidebar');
    // Check if we are on a small screen (where transform is used for hiding)
    if (window.innerWidth < 1024 && !sidebar.classList.contains('-translate-x-full')) {
        toggleMobileMenu();
    }
}

// --- Authentication Logic (REMOVED LOGIN/TFA) ---

// Removed: document.getElementById('loginForm').addEventListener('submit', ...)
// Removed: function handleTfaSubmit()

function handleLogout() {
    // Simplified Mock Logout: Just show alert and reset to dashboard
    isAuthenticated = false; // Reset state for a clean view
    stopCamera(); // Ensure camera stops on 'logout'
    showCustomAlert('Mock Logout: Application state reset.', 'blue');
    
    // The HTML button now calls showSection('dashboard') directly
    // If you wanted to reset the app completely, you would reload: window.location.reload();
}

// --- Mobile Menu Logic (NEW) ---
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    // Check if the sidebar is currently off-canvas (hidden)
    const isHidden = sidebar.classList.contains('-translate-x-full');

    if (isHidden) {
        // Open the sidebar
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        overlay.classList.remove('hidden');
        // Prevent body scrolling while menu is open (best practice)
        document.body.classList.add('overflow-hidden');
    } else {
        // Close the sidebar
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
}
// --- END Mobile Menu Logic ---


// --- Camera/Media Capture Functions (REAL IMPLEMENTATION) ---

// Utility function to get the formatted timestamp
function getTimestamp() {
    const now = new Date();
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    return {
        formatted: now.toLocaleString('en-US', options),
        filename: now.toISOString().replace(/[:.]/g, '-'),
    };
}

// Update the mock timestamp in real-time
function updateTimestamp() {
    const timestampElement = document.getElementById('timestamp-overlay');
    if (timestampElement) {
        timestampElement.textContent = `Timestamp: ${getTimestamp().formatted}`;
    }
}

async function startCamera() {
    const video = document.getElementById('camera-feed');
    const status = document.getElementById('camera-status');
    status.textContent = 'Awaiting camera permission...';

    // Start real-time timestamp update
    if (!timestampInterval) {
        updateTimestamp();
        timestampInterval = setInterval(updateTimestamp, 1000); 
    }

    if (cameraStream) return; // Already running

    try {
        // Request access to video (camera)
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
        cameraStream = stream;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            status.style.display = 'none'; // Hide status when video plays
            showCustomAlert('Camera feed started successfully.', 'green');
        };
    } catch (err) {
        status.textContent = 'Camera access denied or failed.';
        showCustomAlert(`Error accessing camera: ${err.name}. Please ensure your browser has permission and you are on a secure connection (HTTPS).`, 'red');
        console.error("Camera access error:", err);
    }
}

function stopCamera() {
    if (cameraStream) {
        // Stop all tracks (video/audio)
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        
        // Clear timestamp interval
        if (timestampInterval) {
            clearInterval(timestampInterval);
            timestampInterval = null;
        }

        // Reset video element and status
        const video = document.getElementById('camera-feed');
        if (video) {
            video.srcObject = null;
        }
        const status = document.getElementById('camera-status');
        if (status) {
            status.style.display = 'flex';
            status.textContent = 'Camera Feed Not Started/Loading...';
        }

        // Stop recording if active
        if (isRecording) {
            stopRecording();
        }
    }
}

// The main capture function
function handleCapture(type) {
    if (!cameraStream) {
        showCustomAlert('Camera stream is not active. Please wait or ensure permissions are granted.', 'red');
        return;
    }

    if (type === 'picture') {
        capturePicture();
    } else if (type === 'video') {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }
}

function capturePicture() {
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('capture-canvas');
    const context = canvas.getContext('2d');

    // Ensure video is playing and stream is active
    if (video.readyState !== 4) {
         showCustomAlert('Camera feed not ready.', 'red');
         return;
    }

    // Set canvas dimensions to match the video feed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame onto the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get timestamp for stamping the image data
    const timestampData = getTimestamp();
    
    // **(Mock) Stamping the image**: In a real app, you would use Canvas to draw the timestamp text 
    // onto the captured image before converting it to a blob/data URL.
    context.fillStyle = 'white';
    context.fillRect(10, canvas.height - 30, 280, 20); // Background box for visibility
    context.font = '16px Arial';
    context.fillStyle = 'black';
    context.fillText(`Captured: ${timestampData.formatted}`, 15, canvas.height - 15);


    // Convert the canvas content to a Data URL (JPEG for smaller size)
    const dataUrl = canvas.toDataURL('image/jpeg');

    // Display the captured image in the history (Mock persistence)
    displayMediaInHistory(dataUrl, 'Picture', timestampData.formatted);

    // Inform the user
    showCustomAlert(`Picture captured and stamped!`, 'green');
}

// Video Recording Logic
function startRecording() {
    const videoBtn = document.getElementById('video-btn');
    recordedChunks = [];
    
    try {
        // Use MediaRecorder on the global stream
        mediaRecorder = new MediaRecorder(cameraStream);

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const timestampData = getTimestamp();
            const blob = new Blob(recordedChunks, { type: 'video/webm' }); // Use webm format
            const videoUrl = URL.createObjectURL(blob);
            
            displayMediaInHistory(videoUrl, 'Video', timestampData.formatted);
            
            showCustomAlert('Video recording stopped and saved.', 'green');
            isRecording = false;
            videoBtn.innerHTML = '<i class="fas fa-video mr-2"></i> Record Video';
        };

        mediaRecorder.start();
        isRecording = true;
        videoBtn.innerHTML = '<i class="fas fa-stop-circle mr-2"></i> STOP Recording';
        videoBtn.classList.remove('btn-red');
        videoBtn.classList.add('btn-dark');
        showCustomAlert('Video recording started...', 'red');

    } catch (error) {
        showCustomAlert('Video recording failed. MediaRecorder is likely unsupported in this browser or environment.', 'red');
        console.error('MediaRecorder error:', error);
        isRecording = false;
        videoBtn.innerHTML = '<i class="fas fa-video mr-2"></i> Record Video';
        videoBtn.classList.remove('btn-dark');
        videoBtn.classList.add('btn-red');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        const videoBtn = document.getElementById('video-btn');
        videoBtn.classList.remove('btn-dark');
        videoBtn.classList.add('btn-red');
    }
}


// Utility function to display the captured media in the history card
function displayMediaInHistory(mediaUrl, type, timestamp) {
    const historyContainer = document.getElementById('media-history');
    const isPlaceholder = historyContainer.querySelector('.italic');
    
    // Remove placeholder if it exists
    if (isPlaceholder) {
        historyContainer.innerHTML = '';
        historyContainer.classList.remove('text-center', 'p-8');
    }

    const card = document.createElement('div');
    card.className = 'p-3 rounded-lg bg-gray-50 border border-gray-200 text-left';
    
    if (type === 'Picture') {
        card.innerHTML = `
            <h3 class="text-lg font-bold text-gray-800 flex items-center mb-1"><i class="fas fa-camera mr-2 text-blue-600"></i> ${type}</h3>
            <p class="text-sm text-gray-600 mb-2">Captured: ${timestamp}</p>
            <img src="${mediaUrl}" alt="Captured Image" class="w-full h-auto rounded-lg border border-gray-300">
            <a href="${mediaUrl}" download="EstateKeeper_${getTimestamp().filename}.jpeg" class="btn btn-dark mt-2 text-xs py-1 px-2 w-full">Download Image</a>
        `;
    } else { // Video
        card.innerHTML = `
            <h3 class="text-lg font-bold text-gray-800 flex items-center mb-1"><i class="fas fa-video mr-2 text-red-600"></i> ${type}</h3>
            <p class="text-sm text-gray-600 mb-2">Captured: ${timestamp}</p>
            <video src="${mediaUrl}" controls class="w-full h-auto rounded-lg border border-gray-300"></video>
            <a href="${mediaUrl}" download="EstateKeeper_${getTimestamp().filename}.webm" class="btn btn-dark mt-2 text-xs py-1 px-2 w-full">Download Video</a>
        `;
    }
    
    // Prepend the new media item to show the most recent first
    historyContainer.prepend(card);
}


// --- Utility Functions ---
function showCustomAlert(message, color = 'blue') {
    const colorMap = {
        blue: { bg: '#3b82f6', text: 'white' },
        green: { bg: '#10b981', text: 'white' },
        red: { bg: '#ef4444', text: 'white' },
    };
    const scheme = colorMap[color] || colorMap.blue;
    const messageBox = document.createElement('div');
    
    messageBox.style.cssText = `background-color: ${scheme.bg}; color: ${scheme.text}; padding: 12px 20px; margin-bottom: 10px; border-radius: 8px; z-index: 1000; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2); transition: opacity 0.5s ease-in-out;`;
    messageBox.textContent = message;
    
    const notificationArea = document.getElementById('notification-area');
    notificationArea.appendChild(messageBox);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        messageBox.style.opacity = '0';
        setTimeout(() => messageBox.remove(), 500);
    }, 3000);
}

// Mock function for dashboard export buttons
function handleExport(type) {
    showCustomAlert(`Mock: Preparing to export all estate data to ${type.toUpperCase()}...`, 'blue');
}

// Initial view setup
document.addEventListener('DOMContentLoaded', () => {
    // Show the dashboard screen on load instead of login
    showSection('dashboard'); 
});