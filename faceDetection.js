// faceDetection.js - Enhanced with No-Face Detection
let faceDetectionActive = false;
let videoStream = null;
let model = null;
let ctx = null;
let detectionInterval = null;
let noFaceWarningTimeout = null;
let consecutiveNoFaceCount = 0;

let faceWarningCount = 0;
const MAX_FACE_WARNINGS = 3;
let faceWarningTimeout = null;
// DOM Elements
const videoElement = document.getElementById('webcamFeed');
const canvasElement = document.getElementById('proctorCanvas');
const detectionStatusElement = document.getElementById('detectionStatus');
const warningElement = document.getElementById('proctorAlert');

// Initialize Face Detection
async function initFaceDetection() {
    try {
        updateStatus("Initializing face detection...");
        
        // 1. First ensure camera access
        await setupCamera();
        
        // 2. Load TensorFlow.js with CPU fallback
        await loadTFJS();
        
        // 3. Initialize canvas
        ctx = canvasElement.getContext('2d');
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        
        // 4. Load face detection model
        updateStatus("Loading face detection model...");
        model = await loadFaceDetectionModel();
        
        // 5. Start detection
        updateStatus("Ready - Face detection active");
        faceDetectionActive = true;
        detectionInterval = setInterval(detectFaces, 300);
        
    } catch (error) {
        console.error("Initialization error:", error);
        handleInitializationError(error);
    }
}

// Camera Setup with User Feedback
async function setupCamera() {
    try {
        updateStatus("Requesting camera access...");
        
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user"
            },
            audio: false
        });
        
        videoElement.srcObject = videoStream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = resolve;
            videoElement.onerror = reject;
            setTimeout(() => reject(new Error("Camera timeout")), 5000);
        });
        
    } catch (error) {
        throw new Error("Camera access denied: " + error.message);
    }
}

// TensorFlow.js Loading with Fallback
async function loadTFJS() {
    if (!window.tf) {
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js');
    }
    
    // Try WebGL, fallback to CPU
    try {
        await tf.setBackend('webgl');
    } catch (e) {
        console.warn("WebGL not available, falling back to CPU");
        await tf.setBackend('cpu');
    }
}

// Face Detection Model Loading
async function loadFaceDetectionModel() {
    try {
        // Try loading BlazeFace
        if (window.blazeface) {
            return await blazeface.load();
        }
        
        // Fallback to MediaPipe if BlazeFace not available
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0');
        const { FaceDetector, FilesetResolver } = vision;
        
        const filesetResolver = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );
        
        return await FaceDetector.createFromOptions(
            filesetResolver,
            {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO"
            }
        );
    } catch (error) {
        throw new Error("Failed to load face detection model: " + error.message);
    }
}

// Main Detection Loop
async function detectFaces() {
    if (!faceDetectionActive || !model) return;
    
    try {
        let faces = [];
        
        // BlazeFace detection
        if (model.estimateFaces) {
            faces = await model.estimateFaces(videoElement);
        } 
        // MediaPipe detection
        else if (model.detectForVideo) {
            const result = model.detectForVideo(videoElement, performance.now());
            faces = result.detections.map(d => ({
                topLeft: [d.boundingBox.originX, d.boundingBox.originY],
                bottomRight: [d.boundingBox.originX + d.boundingBox.width, 
                             d.boundingBox.originY + d.boundingBox.height]
            }));
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        if (faces.length === 0) {
            handleNoFace();
        } else {
            // Reset no-face counter when face is detected
            consecutiveNoFaceCount = 0;
            clearNoFaceWarning();
            
            // Draw face bounding box
            const firstFace = faces[0];
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                firstFace.topLeft[0], 
                firstFace.topLeft[1],
                firstFace.bottomRight[0] - firstFace.topLeft[0],
                firstFace.bottomRight[1] - firstFace.topLeft[1]
            );
            
            analyzeFace(faces);
        }
    } catch (error) {
        console.error("Detection error:", error);
    }
}

function analyzeFace(faces) {
    if (faces.length > 1) {
        if (typeof handleMalpracticeEvent === 'function') {
            handleMalpracticeEvent('multiple_faces');
        }
    }
    // Add additional face analysis as needed
}

function handleNoFace() {
    consecutiveNoFaceCount++;
    
    // Only trigger warning after 3 consecutive no-face detections (~1 second)
    if (consecutiveNoFaceCount >= 3) {
        // Only increment if we haven't already shown this warning
        if (!faceWarningTimeout) {
            // Call the global handleMalpracticeEvent function with the correct type
            // This will handle the global warning count update
            if (typeof handleMalpracticeEvent === 'function') {
                handleMalpracticeEvent('face');
                
                // Track face-specific warnings locally but don't update UI directly
                faceWarningCount++;
                
                // Check if max warnings reached
                if (faceWarningCount >= MAX_FACE_WARNINGS) {
                    handleMaxFaceWarnings();
                }
            }
            
            // Set timeout to prevent rapid increments
            faceWarningTimeout = setTimeout(() => {
                faceWarningTimeout = null;
            }, 5000); // 5 second cooldown
            
            showNoFaceWarning();
        }
    }
     // Draw warning on canvas
    ctx.fillStyle = 'red';
    ctx.font = '16px Arial';
    ctx.fillText('No face detected!', 10, 30);
}

// Modified to not update the UI warning counter (let script.js handle it)
function updateFaceWarningCount() {
    // Just for internal tracking - no UI updates
    // This function can be used for face-specific warning logic
    // but we let the main handleMalpracticeEvent handle the UI updates
}

function handleMaxFaceWarnings() {
    // Show final warning
    if (warningElement) {
        warningElement.textContent = "MAXIMUM FACE WARNINGS! Please position yourself in front of the camera immediately.";
        warningElement.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
        
        // Make video element border flash
        videoElement.style.border = "3px solid red";
        videoElement.style.animation = "flashBorder 1s infinite";
    }
    
    // You could also trigger an exam termination here if needed
    // if (typeof terminateExam === 'function') {
    //     terminateExam('face_not_detected');
    // }
}

function resetFaceWarnings() {
    consecutiveNoFaceCount = 0;
    if (faceWarningTimeout) {
        clearTimeout(faceWarningTimeout);
        faceWarningTimeout = null;
    }
    
    // Reset local face warning count
    faceWarningCount = 0;
}

function showNoFaceWarning() {
    if (warningElement) {
        warningElement.textContent = "Warning: No face detected! Please position yourself in front of the camera.";
        warningElement.style.display = "block";
        warningElement.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
        
        // Make video element border red
        videoElement.style.border = "3px solid red";
    }
}

function clearNoFaceWarning() {
    if (warningElement && warningElement.textContent.includes("No face detected")) {
        warningElement.style.display = "none";
        videoElement.style.border = "3px solid green";
        videoElement.style.animation = "none";
    }
    resetFaceWarnings();
}

function updateStatus(message) {
    if (detectionStatusElement) {
        detectionStatusElement.textContent = message;
    }
}

function handleInitializationError(error) {
    updateStatus("Error: " + error.message);
    
    // Show warning to user
    if (warningElement) {
        warningElement.textContent = error.message.includes("Camera") ? 
            "Camera access required for full monitoring" : 
            "Face detection unavailable - basic monitoring only";
        warningElement.style.display = "block";
    }
    
    // Fallback to just showing camera feed
    if (videoElement && videoStream) {
        videoElement.style.border = "3px solid orange";
    }
}

function stopFaceDetection() {
    faceDetectionActive = false;
    clearInterval(detectionInterval);
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
}

// Helper function to load scripts
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Initialize when page loads
if (videoElement) {
    window.addEventListener('DOMContentLoaded', initFaceDetection);
    window.addEventListener('beforeunload', stopFaceDetection);
}