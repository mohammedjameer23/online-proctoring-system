// Microphone access and background noise detection script

// Configuration parameters
const NOISE_CONFIG = {
    NOISE_THRESHOLD: 0.15,      // Threshold for background noise detection (0-1)
    NOISE_DURATION: 3000,       // Duration in ms of continuous noise to trigger exit
    CHECK_INTERVAL: 500,        // How often to check noise levels (ms)
    SAMPLE_RATE: 44100,         // Audio sample rate
    WARNING_LIMIT: 3,           // Number of warnings before exit (updated to 3)
    WARNING_COOLDOWN: 10000     // Cooldown between warnings (ms)
};

// Expose NOISE_CONFIG to global scope for access from HTML
window.NOISE_CONFIG = NOISE_CONFIG;

// Variables to track noise state
let noiseState = {
    audioContext: null,
    microphone: null,
    analyser: null,
    dataArray: null,
    noiseDetectionInterval: null,
    noiseStartTime: null,
    isNoiseDetected: false,
    warningCount: 0,
    lastWarningTime: 0,
    isMonitoring: false
};

// Initialize the microphone and audio processing
async function initNoiseDetection() {
    try {
        // Check if already monitoring
        if (noiseState.isMonitoring) {
            console.log("Voice detection already active");
            logDebugMessage && logDebugMessage("Voice detection already active");
            return true;
        }
        
        // Create audio context
        noiseState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Get microphone access with explicit error handling
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (micError) {
            console.error("Microphone access error:", micError.name, micError.message);
            logDebugMessage && logDebugMessage(`Microphone access error: ${micError.name} - ${micError.message}`);
            
            // Provide specific error messages based on error type
            if (micError.name === "NotAllowedError" || micError.name === "PermissionDeniedError") {
                alert("Microphone access denied. Please allow microphone access in your browser settings and refresh the page.");
            } else if (micError.name === "NotFoundError" || micError.name === "DevicesNotFoundError") {
                alert("No microphone detected. Please connect a microphone and refresh the page.");
            } else {
                alert("Could not access microphone: " + micError.message);
            }
            return false;
        }
        
        // Create microphone source
        noiseState.microphone = noiseState.audioContext.createMediaStreamSource(stream);
        
        // Create analyser node for processing audio data
        noiseState.analyser = noiseState.audioContext.createAnalyser();
        noiseState.analyser.fftSize = 256;
        
        // Connect microphone to analyser
        noiseState.microphone.connect(noiseState.analyser);
        
        // Create data array for analyser
        noiseState.dataArray = new Uint8Array(noiseState.analyser.frequencyBinCount);
        
        // Start monitoring for background noise
        startNoiseDetection();
        
        console.log("Voice detection initialized successfully");
        logDebugMessage && logDebugMessage("Voice detection initialized successfully");
        
        // Add event listener for page unload to clean up resources
        window.addEventListener('beforeunload', cleanupAudio);
        
        // Reset warning count
        noiseState.warningCount = 0;
        noiseState.lastWarningTime = 0;
        noiseState.isMonitoring = true;
        return true;
    } catch (error) {
        console.error("Error initializing voice detection:", error);
        logDebugMessage && logDebugMessage(`Error initializing voice detection: ${error.message}`);
        alert("Could not initialize voice detection. Please refresh the page and try again.");
        return false;
    }
}

// Start monitoring for background noise
function startNoiseDetection() {
    // Clear any existing interval
    if (noiseState.noiseDetectionInterval) {
        clearInterval(noiseState.noiseDetectionInterval);
    }
    
    console.log("Starting voice detection monitoring");
    logDebugMessage && logDebugMessage("Starting voice detection monitoring");
    
    // Set up interval for checking noise levels
    noiseState.noiseDetectionInterval = setInterval(() => {
        // Get current audio data
        noiseState.analyser.getByteFrequencyData(noiseState.dataArray);
        
        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < noiseState.dataArray.length; i++) {
            sum += noiseState.dataArray[i];
        }
        const average = sum / noiseState.dataArray.length;
        
        // Normalize to 0-1 range
        const normalizedLevel = average / 255;
        
        // Check if level exceeds threshold
        if (normalizedLevel > NOISE_CONFIG.NOISE_THRESHOLD) {
            handleNoise(normalizedLevel);
        } else {
            // Reset noise detection state if noise has stopped
            if (noiseState.isNoiseDetected) {
                console.log("Voice no longer detected");
                logDebugMessage && logDebugMessage("Voice no longer detected");
                noiseState.isNoiseDetected = false;
                
                // Update UI if needed
                if (document.getElementById('status')) {
                    document.getElementById('status').textContent = "Status: Active (Monitoring)";
                    document.getElementById('status').className = 'active';
                }
            }
        }
    }, NOISE_CONFIG.CHECK_INTERVAL);
}

// Calculate average volume from frequency data
function calculateAverageVolume(dataArray) {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    // Convert to a value between 0 and 1
    return sum / (dataArray.length * 255);
}

// Handle detected noise
function handleNoise(level) {
    // If this is the start of noise detection
    if (!noiseState.isNoiseDetected) {
        noiseState.noiseStartTime = Date.now();
        noiseState.isNoiseDetected = true;
        console.log(`Voice detected at level: ${level.toFixed(2)}`);
        logDebugMessage && logDebugMessage(`Voice detected at level: ${level.toFixed(2)}`);
        
        // Update UI if needed
        if (document.getElementById('status')) {
            document.getElementById('status').textContent = `Status: Voice detected (${level.toFixed(2)})`;
            document.getElementById('status').className = 'silent';
        }
    }
    
    // Check if noise has persisted long enough to trigger a warning
    const noiseDuration = Date.now() - noiseState.noiseStartTime;
    if (noiseDuration >= NOISE_CONFIG.NOISE_DURATION) {
        triggerWarning(level);
    }
}

// Trigger a warning for detected voice
function triggerWarning(level) {
    // Check if we're in cooldown period
    const now = Date.now();
    if (now - noiseState.lastWarningTime < NOISE_CONFIG.WARNING_COOLDOWN) {
        return; // Still in cooldown, don't trigger another warning yet
    }
    
    // Track last warning time for cooldown
    noiseState.lastWarningTime = now;
    
    // Log voice warning
    console.log(`Voice warning triggered at level: ${level.toFixed(2)}`);
    logDebugMessage && logDebugMessage(`Voice warning triggered at level: ${level.toFixed(2)}`);
    
    // Call the global malpractice handler to handle the warning count and UI updates
    if (typeof handleMalpracticeEvent === 'function') {
        // Pass the voice warning to central handler
        handleMalpracticeEvent('voice');
        
        // After the central handler has run, increment our internal counter
        // This is just for internal tracking - the UI is updated by handleMalpracticeEvent
        noiseState.warningCount++;
    } else {
        // Fallback alert if not in exam context
        noiseState.warningCount++;
        alert(`Warning #${noiseState.warningCount}: Voice detected during exam. Please remain silent.`);
    }
    
    // Update warning text with voice level info but don't update the warning count
    // (that's handled by the main handleMalpracticeEvent)
    const warningTextElement = document.getElementById('warningText');
    if (warningTextElement && level) {
        warningTextElement.textContent = `Voice detected (Level: ${Math.round(level * 100)}%)`;
    }
    
    // Reset noise detection state
    resetNoiseDetection();
    
    // Check if we've reached the warning limit
    if (noiseState.warningCount >= NOISE_CONFIG.WARNING_LIMIT) {
        exitApplication(level);
    }
}

// Reset noise detection state
function resetNoiseDetection() {
    noiseState.isNoiseDetected = false;
    noiseState.noiseStartTime = null;
    
    // Update UI if needed
    if (document.getElementById('status')) {
        document.getElementById('status').textContent = "Status: Active (Monitoring)";
        document.getElementById('status').className = 'active';
    }
    
    console.log("Voice detection state reset");
    logDebugMessage && logDebugMessage("Voice detection state reset");
}

// Exit the application due to excessive voice warnings
function exitApplication(noiseLevel) {
    console.log(`Submitting exam due to excessive voice warnings (level: ${noiseLevel.toFixed(2)})`);
    logDebugMessage && logDebugMessage(`Submitting exam due to excessive voice warnings (level: ${noiseLevel.toFixed(2)})`);
    
    // Clean up audio resources
    cleanupAudio();
    
    // Alert the user
    alert(`Excessive talking detected (${noiseState.warningCount}/${NOISE_CONFIG.WARNING_LIMIT} warnings). Your exam will be submitted.`);
    
    // Set detailed submission reason if the variable is available
    if (typeof submissionReason !== 'undefined') {
        submissionReason = `Automatic submission due to voice detection violations. Voice was detected ${noiseState.warningCount} times during the exam at levels exceeding the threshold.`;
    }
    
    // Submit the exam instead of redirecting
    if (typeof submitExam === 'function') {
        submitExam();
    } else {
        // Fallback if submitExam function is not available
        window.location.href = "result.html?reason=" + encodeURIComponent("Voice detection violation");
    }
}

// Clean up audio resources
function cleanupAudio() {
    try {
        console.log("Cleaning up voice detection resources");
        logDebugMessage && logDebugMessage("Cleaning up voice detection resources");
        
        if (noiseState.noiseDetectionInterval) {
            clearInterval(noiseState.noiseDetectionInterval);
            noiseState.noiseDetectionInterval = null;
        }
        
        // Stop all tracks from the media stream
        if (noiseState.microphone && noiseState.microphone.mediaStream) {
            const tracks = noiseState.microphone.mediaStream.getTracks();
            tracks.forEach(track => track.stop());
        }
        
        if (noiseState.microphone) {
            noiseState.microphone.disconnect();
            noiseState.microphone = null;
        }
        
        if (noiseState.analyser) {
            noiseState.analyser = null;
        }
        
        if (noiseState.audioContext && noiseState.audioContext.state !== 'closed') {
            noiseState.audioContext.close().catch(err => {
                console.error("Error closing audio context:", err);
            });
            noiseState.audioContext = null;
        }
        
        // Reset state
        noiseState.dataArray = null;
        noiseState.isNoiseDetected = false;
        noiseState.noiseStartTime = null;
        noiseState.isMonitoring = false;
        
        console.log("Voice detection resources cleaned up");
        return true;
    } catch (error) {
        console.error("Error cleaning up voice detection:", error);
        logDebugMessage && logDebugMessage(`Error cleaning up voice detection: ${error.message}`);
        return false;
    }
}

// Export functions for use in HTML
window.startVoiceDetection = initNoiseDetection;
window.stopVoiceDetection = cleanupAudio;
window.isVoiceMonitoringActive = () => noiseState.isMonitoring;
window.getVoiceWarningCount = () => noiseState.warningCount;

// Add a debug function to check if the script is loaded
window.checkNoiseDetectionLoaded = function() {
    console.log("Voice detection script is loaded");
    console.log("NOISE_CONFIG:", NOISE_CONFIG);
    return true;
};

// Helper function to access the global logDebug function if available
function logDebugMessage(message) {
    if (typeof window.logDebug === 'function') {
        window.logDebug(message);
    }
}

// Initialize noise detection when the page loads if auto-start is desired
// Uncomment the line below to auto-start noise detection
// window.addEventListener('load', initNoiseDetection);

