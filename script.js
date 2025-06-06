// Exam Configuration
const examConfig = {
    duration: 90 * 60, // 90 minutes in seconds
    totalQuestions: 10,
    warningLimit: 3, // Max warnings before auto-submit
    tabSwitchLimit: 3  // Max tab switches before counting as a warning
};

// State Variables
let currentQuestionIndex = 0;
let timeLeft = examConfig.duration;
let timerInterval;
let warningCount = 0;
let examStarted = false;
let studentAnswers = new Array(examConfig.totalQuestions).fill(null);


// DOM Elements
const examTimer = document.getElementById('examTimer');
const questionCounter = document.getElementById('questionCounter');
const currentQuestionElement = document.getElementById('currentQuestion');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const proctorAlert = document.getElementById('proctorAlert');
const alertMessage = document.getElementById('alertMessage');
const warningCountElement = document.getElementById('warningCount');

// Sample Questions (In real app, fetch from server)
const questions = [
    {
        id: 1,
        text: "What is the capital of France?",
        options: [
            { id: "A", text: "Paris" },
            { id: "B", text: "Berlin" },
            { id: "C", text: "Madrid" },
            { id: "D", text: "Rome" }
        ],
        correctAnswer: "A"
    },
    {
        id: 2,
        text: "Who wrote the play 'Romeo and Juliet'?",
        options: [
            { id: "A", text: "Charles Dickens" },
            { id: "B", text: "William Shakespeare" },
            { id: "C", text: "Mark Twain" },
            { id: "D", text: "Jane Austen" }
        ],
        correctAnswer: "B"
    },
    {
        id: 3,
        text: "What is the largest planet in our Solar System?",
        options: [
            { id: "A", text: "Earth" },
            { id: "B", text: "Jupiter" },
            { id: "C", text: "Saturn" },
            { id: "D", text: "Mars" }
        ],
        correctAnswer: "B"
    },
    {
        id: 4,
        text: "Which element has the chemical symbol 'O'?",
        options: [
            { id: "A", text: "Gold" },
            { id: "B", text: "Oxygen" },
            { id: "C", text: "Silver" },
            { id: "D", text: "Osmium" }
        ],
        correctAnswer: "B"
    },
    {
        id: 5,
        text: "What year did the Titanic sink?",
        options: [
            { id: "A", text: "1905" },
            { id: "B", text: "1912" },
            { id: "C", text: "1920" },
            { id: "D", text: "1898" }
        ],
        correctAnswer: "B"
    },
    {
        id: 6,
        text: "Who painted the Mona Lisa?",
        options: [
            { id: "A", text: "Vincent Van Gogh" },
            { id: "B", text: "Leonardo da Vinci" },
            { id: "C", text: "Pablo Picasso" },
            { id: "D", text: "Michelangelo" }
        ],
        correctAnswer: "B"
    },
    {
        id: 7,
        text: "Which country is known as the Land of the Rising Sun?",
        options: [
            { id: "A", text: "China" },
            { id: "B", text: "Japan" },
            { id: "C", text: "Thailand" },
            { id: "D", text: "South Korea" }
        ],
        correctAnswer: "B"
    },
    {
        id: 8,
        text: "What is the hardest natural substance on Earth?",
        options: [
            { id: "A", text: "Gold" },
            { id: "B", text: "Iron" },
            { id: "C", text: "Diamond" },
            { id: "D", text: "Platinum" }
        ],
        correctAnswer: "C"
    },
    {
        id: 9,
        text: "How many continents are there on Earth?",
        options: [
            { id: "A", text: "5" },
            { id: "B", text: "6" },
            { id: "C", text: "7" },
            { id: "D", text: "8" }
        ],
        correctAnswer: "C"
    },
    {
        id: 10,
        text: "Which ocean is the largest?",
        options: [
            { id: "A", text: "Atlantic Ocean" },
            { id: "B", text: "Indian Ocean" },
            { id: "C", text: "Arctic Ocean" },
            { id: "D", text: "Pacific Ocean" }
        ],
        correctAnswer: "D"
    }
];

   
       
// Initialize Exam
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    if (prevBtn) prevBtn.addEventListener('click', prevQuestion);
    if (nextBtn) nextBtn.addEventListener('click', nextQuestion);
    if (submitBtn) submitBtn.addEventListener('click', confirmSubmit);
    
    // Start exam automatically (or could be on button click)
    startExam();
});

function startExam() {
    examStarted = true;
    
    // Hide start button, show exam content
    if (document.getElementById('start-container')) {
        document.getElementById('start-container').style.display = 'none';
    }
    
    if (document.getElementById('exam-container')) {
        document.getElementById('exam-container').style.display = 'block';
    }
    
    // Start the timer
    startTimer();
    
    // Start tab monitoring
    startTabMonitoring();
    
    // Load first question
    loadQuestion(currentQuestionIndex);
    
    // Initialize progress dots
    updateProgressDots(currentQuestionIndex);
    
    // Update UI
    updateProgressBar();
    updateNavigationButtons();
    
    console.log('Exam started');
}
// Timer Functions
function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(function() {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            autoSubmitExam();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    
    examTimer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Change color when time is running low
    if (timeLeft <= 300) { // 5 minutes left
        examTimer.style.backgroundColor = '#ff6b6b';
    }
}

// Question Navigation
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        saveCurrentAnswer();
        currentQuestionIndex--;
        loadQuestion(currentQuestionIndex);
        updateProgressDots(currentQuestionIndex);
    }
}

function nextQuestion() {
    if (currentQuestionIndex < examConfig.totalQuestions - 1) {
        saveCurrentAnswer();
        currentQuestionIndex++;
        loadQuestion(currentQuestionIndex);
        updateProgressDots(currentQuestionIndex);
    }
}

function updateProgressDots(currentIndex) {
    // Get all progress dots
    const dots = document.querySelectorAll('.progress-dot');
    // Remove active class from all dots
    dots.forEach(dot => dot.classList.remove('active'));
    // Add active class to current dot
    if (dots[currentIndex]) {
        dots[currentIndex].classList.add('active');
    }
}

function saveCurrentAnswer() {
    const questionId = questions[currentQuestionIndex].id;
    const selectedOption = document.querySelector(`input[name="q${questionId}"]:checked`);
    studentAnswers[currentQuestionIndex] = selectedOption ? selectedOption.value : null;
}

function loadQuestion(index) {
    const question = questions[index];
    
    // Build question HTML
    let optionsHTML = '';
    question.options.forEach(option => {
        const isChecked = studentAnswers[index] === option.id ? 'checked' : '';
        optionsHTML += `
            <label class="option-label">
                <input type="radio" name="q${question.id}" value="${option.id}" ${isChecked}>
                <span class="option-text">${option.id}: ${option.text}</span>
            </label>
        `;
    });
    
    currentQuestionElement.innerHTML = `
        <h3>Question ${index + 1}</h3>
        <p class="question-text">${question.text}</p>
        <div class="options">${optionsHTML}</div>
    `;
    
    // Update question counter
    questionCounter.textContent = `Question ${index + 1} of ${examConfig.totalQuestions}`;
    
    // Update navigation buttons
    updateNavigationButtons();
}

// Exam Submission
function confirmSubmit() {
    if (confirm("Are you sure you want to submit your exam? You won't be able to make changes after submission.")) {
        submitExam();
    }
}

function autoSubmitExam() {
    alert("Time's up! Your exam has been automatically submitted.");
    submitExam();
}

// Add a variable to track submission reason
let submissionReason = "";

// Modify your submitExam function
function submitExam() {
    if (!examStarted) return;
    
    saveCurrentAnswer();
    clearInterval(timerInterval);
    stopTabMonitoring(); // Add this line
    
    const score = calculateScore();
    const duration = formatDuration(examConfig.duration - timeLeft);
    
    // If no specific reason is set, use a default
    if (!submissionReason) {
        submissionReason = "Manual submission by user";
    }
    
    window.location.href = `result.html?score=${score}&warnings=${warningCount}&duration=${duration}&reason=${encodeURIComponent(submissionReason)}`;
}

function calculateScore() {
    let correctAnswers = 0;
    
    questions.forEach((question, index) => {
        if (studentAnswers[index] === question.correctAnswer) {
            correctAnswers++;
        }
    });
    
    return Math.round((correctAnswers / questions.length) * 100);
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Malpractice Handling
// Handle malpractice events (face detection, tab switching, etc.)
function handleMalpracticeEvent(type) {
    if (!examStarted) return;
    
    // Increment warning count
    warningCount++;
    
    // Update warning counter display
    if (warningCountElement) {
        warningCountElement.textContent = warningCount;
        
        // Visual feedback based on warning level
        if (warningCount >= examConfig.warningLimit) {
            warningCountElement.style.color = 'red';
            warningCountElement.style.fontWeight = 'bold';
        } else if (warningCount === examConfig.warningLimit - 1) {
            warningCountElement.style.color = 'orange';
            warningCountElement.style.fontWeight = 'bold';
        }
    }
    
    // Get warning box element for additional feedback
    const warningBox = document.getElementById('warningBox');
    const warningText = document.getElementById('warningText');
    
    // Display alert message
    proctorAlert.style.display = 'block';
    
    let warningMessage = "";
    let alertClass = "";
    
    // Set alert message and update warning box based on type
    switch(type) {
        case 'no_face':
        case 'face':
            warningMessage = "Warning: No face detected in camera view!";
            alertClass = "alert-danger";
            submissionReason = "Face detection violation";
            if (warningText) warningText.textContent = `Face not visible (Warning ${warningCount}/${examConfig.warningLimit})`;
            break;
        case 'multiple_faces':
            warningMessage = "Warning: Multiple faces detected!";
            alertClass = "alert-danger";
            submissionReason = "Multiple people detected";
            if (warningText) warningText.textContent = `Multiple faces detected (Warning ${warningCount}/${examConfig.warningLimit})`;
            break;
        case 'movement':
            warningMessage = "Warning: Significant movement detected!";
            alertClass = "alert-warning";
            submissionReason = "Excessive movement violation";
            if (warningText) warningText.textContent = `Excessive movement (Warning ${warningCount}/${examConfig.warningLimit})`;
            break;
        case 'orientation':
            warningMessage = "Warning: Not looking at screen!";
            alertClass = "alert-warning";
            submissionReason = "Looking away from screen";
            if (warningText) warningText.textContent = `Looking away from screen (Warning ${warningCount}/${examConfig.warningLimit})`;
            break;
        case 'voice':
            warningMessage = "Warning: Voice detected! Please remain silent.";
            alertClass = "alert-danger";
            submissionReason = "Voice/talking violation";
            if (warningText) warningText.textContent = `Voice detected (Warning ${warningCount}/${examConfig.warningLimit})`;
            break;
        case 'new_tab':
            warningMessage = "Warning: New tab detected!";
            alertClass = "alert-danger";
            submissionReason = "Tab switch violation";
            if (warningText) warningText.textContent = `New tab opened (Warning ${warningCount}/${examConfig.warningLimit})`;
            break;
        case 'tab_switch':
            warningMessage = "Warning: Tab switch detected!";
            alertClass = "alert-danger";
            submissionReason = "Tab switch violation";
            if (warningText) warningText.textContent = `Tab switch (Warning ${warningCount}/${examConfig.warningLimit})`;
            break;
        default:
            warningMessage = "Warning: Suspicious activity detected!";
            alertClass = "alert-warning";
            submissionReason = "Suspicious activity detected";
            if (warningText) warningText.textContent = `Suspicious activity (Warning ${warningCount}/${examConfig.warningLimit})`;
    }
    
    // Set alert message and class
    alertMessage.textContent = warningMessage;
    proctorAlert.className = "proctor-alert " + alertClass;
    
    // Update warning box styling based on warning count
    if (warningBox) {
        // Make warning box more prominent
        warningBox.style.animation = 'pulse 1s';
        
        if (warningCount >= examConfig.warningLimit - 1) {
            warningBox.style.backgroundColor = '#f8d7da'; // red
            warningBox.style.borderColor = '#f5c6cb';
        } else if (warningCount >= examConfig.warningLimit - 2) {
            warningBox.style.backgroundColor = '#fff3cd'; // yellow
            warningBox.style.borderColor = '#ffeeba';
        }
    }
    
    // Add warning to warnings log
    addWarningToLog(type, warningMessage);
    
    // Hide alert after 5 seconds but keep warning box updated
    setTimeout(() => {
        proctorAlert.style.display = 'none';
    }, 5000);
    
    // Set detailed submission reason based on the type of violation and count
    if (warningCount >= examConfig.warningLimit) {
        switch(type) {
            case 'no_face':
            case 'face':
                submissionReason = "Automatic submission due to reaching 3 warnings: Face detection violations. The system could not detect your face in the camera multiple times.";
                break;
            case 'multiple_faces':
                submissionReason = "Automatic submission due to reaching 3 warnings: Multiple people detected in the camera view.";
                break;
            case 'movement':
                submissionReason = "Automatic submission due to reaching 3 warnings: Excessive movement. Please remain still during the exam.";
                break;
            case 'orientation':
                submissionReason = "Automatic submission due to reaching 3 warnings: Looking away from screen.";
                break;
            case 'voice':
                submissionReason = "Automatic submission due to reaching 3 warnings: Voice/talking detected. Exams must be taken in silence.";
                break;
            case 'new_tab':
            case 'tab_switch':
                submissionReason = "Automatic submission due to reaching 3 warnings: Tab switching violations. Changing tabs is not allowed during the exam.";
                break;
            default:
                submissionReason = "Automatic submission due to reaching 3 warnings: Multiple security violations detected.";
        }
        
        // Show warning to user
        alert(`Warning limit reached (${warningCount}/${examConfig.warningLimit})! Your exam is being submitted due to multiple violations.`);
        
        // Submit the exam
        submitExam();
    }
    
    // Log event (in real app, send to server)
    console.log(`Malpractice event: ${type} at ${new Date().toISOString()} - Warning ${warningCount}/${examConfig.warningLimit}`);
}

// Function to add warning to a visual log
function addWarningToLog(type, message) {
    console.log(`Adding warning to log: ${type}, Total warnings: ${warningCount}/${examConfig.warningLimit}`);

    // Create warning log if it doesn't exist
    let warningLogDiv = document.getElementById('warningLog');
    
    if (!warningLogDiv) {
        // Create warning log container
        warningLogDiv = document.createElement('div');
        warningLogDiv.id = 'warningLog';
        warningLogDiv.style.maxHeight = '120px';
        warningLogDiv.style.overflowY = 'auto';
        warningLogDiv.style.marginTop = '10px';
        warningLogDiv.style.padding = '5px';
        warningLogDiv.style.fontSize = '12px';
        warningLogDiv.style.borderTop = '1px solid #ddd';
        
        // Add it to the proctor panel
        const proctorPanel = document.querySelector('.proctor-panel');
        if (proctorPanel) {
            const detectionInfo = document.querySelector('.detection-info');
            if (detectionInfo) {
                proctorPanel.insertBefore(warningLogDiv, detectionInfo.nextSibling);
            } else {
                proctorPanel.appendChild(warningLogDiv);
            }
        }
    }
    
    // Add new warning entry
    const warningEntry = document.createElement('div');
    warningEntry.style.padding = '4px 0';
    warningEntry.style.borderBottom = '1px solid #eee';
    
    // Add warning icon based on type
    let icon = '⚠️';
    if (type.includes('face') || type === 'multiple_faces') icon = '👤';
    if (type === 'voice') icon = '🔊';
    if (type.includes('tab')) icon = '🔄';
    
    // Format time
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Create warning text with animation
    warningEntry.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color:#999;">${time}</span>
            <span style="display: flex; align-items: center;">
                ${icon} <span style="color:#d32f2f; font-weight:500; margin-left: 4px;">Warning ${warningCount}/${examConfig.warningLimit}</span>
            </span>
        </div>
        <div style="font-size: 11px; color: #555; margin-top: 2px;">${getWarningTypeText(type)}</div>
    `;
    
    warningEntry.style.animation = 'pulse 0.5s';
    
    // Insert at the beginning of the log
    if (warningLogDiv.firstChild) {
        warningLogDiv.insertBefore(warningEntry, warningLogDiv.firstChild);
    } else {
        warningLogDiv.appendChild(warningEntry);
    }
    
    // Ensure the warning count is displayed correctly - double-checking
    if (warningCountElement) {
        warningCountElement.textContent = warningCount;
        
        // Make the warning count more noticeable with animation
        warningCountElement.style.animation = 'pulse 1s';
        
        // Remove animation after it completes
        setTimeout(() => {
            warningCountElement.style.animation = '';
        }, 1000);
    }
}

// Helper function to get warning text description
function getWarningTypeText(type) {
    switch(type) {
        case 'face':
        case 'no_face':
            return "Face not visible in camera";
        case 'multiple_faces':
            return "Multiple people detected";
        case 'movement':
            return "Excessive movement detected";
        case 'voice':
            return "Voice/talking detected";
        case 'tab_switch':
        case 'new_tab':
            return "Tab switching detected";
        default:
            return "Rule violation detected";
    }
}

// Tab monitoring configuration

// Progress and Navigation Functions
function updateProgressBar() {
    const progressPercentage = ((currentQuestionIndex + 1) / examConfig.totalQuestions) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.setAttribute('aria-valuenow', progressPercentage);
    }
}

function updateNavigationButtons() {
    // Disable previous button on first question
    prevBtn.disabled = currentQuestionIndex === 0;
    prevBtn.style.opacity = currentQuestionIndex === 0 ? '0.5' : '1';
    
    // Show/hide next and submit buttons appropriately
    if (currentQuestionIndex === examConfig.totalQuestions - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-block';
    } else {
        nextBtn.style.display = 'inline-block';
        submitBtn.style.display = 'none';
    }
}

// Tab monitoring variables
let tabMonitorInterval;

// Tab monitoring variables
let tabSwitchCount = 0;
let tabMonitoringActive = false;

// Function to start tab monitoring
function startTabMonitoring() {
    if (tabMonitoringActive) return;
    tabMonitoringActive = true;
    
    // Listen for visibility change events
    document.addEventListener('visibilitychange', handleVisibilityChange);
    console.log('Tab monitoring started');
}

// Function to stop tab monitoring
function stopTabMonitoring() {
    if (!tabMonitoringActive) return;
    tabMonitoringActive = false;
    
    // Remove event listener
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    console.log('Tab monitoring stopped');
}

// Handle visibility change events
function handleVisibilityChange() {
    if (!tabMonitoringActive || !examStarted) return;
    
    if (document.hidden) {
        // Tab is now hidden (user switched away)
        tabSwitchCount++;
        console.log(`Tab switch detected (${tabSwitchCount}/${examConfig.tabSwitchLimit})`);
        
        // Trigger malpractice event
        handleMalpracticeEvent('tab_switch');
    }
}

// End of script