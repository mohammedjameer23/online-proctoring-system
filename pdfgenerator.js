// PDF Generation Functions
function generateResultsPDF(results) {
    // Create a new PDF document
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Draw a professional double border around the page
    doc.setDrawColor(0, 0, 0); // Black border color
    doc.setLineWidth(0.5);
    
    // Outer border
    doc.rect(10, 10, 190, 277); // (x, y, width, height)
    
    // Inner border with offset
    doc.setLineWidth(0.3);
    doc.rect(13, 13, 184, 271);
    
    // Add logo or header
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text('Exam Proctoring System', 105, 20, { align: 'center' });
    
    // Add exam details
    doc.setFontSize(16);
    doc.text('Exam Results Summary', 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Student: Mohammed jameer`, 20, 45);
    doc.text(`Exam: Final Examination`, 20, 55);
    doc.text(`Date: ${results.date}`, 20, 65);
    
    // Add score
    doc.setFontSize(48);
    const scoreColor = results.score >= 50 ? '#4CAF50' : '#F44336';
    doc.setTextColor(scoreColor);
    doc.text(`${results.score}%`, 105, 85, { align: 'center' });
    
    // Add details
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(`Duration: ${results.duration}`, 20, 100);
    doc.text(`Warnings: ${results.warnings}`, 20, 110);
    
    // Add warning message if any
    if (results.warnings > 0) {
        doc.setTextColor('#F44336');
        doc.text('Note: Proctoring warnings were issued during this exam', 20, 120);
    }
    
    // Save the PDF
    doc.save(`exam_results_${Date.now()}.pdf`);
}

// Initialize when on results page
if (document.getElementById('downloadBtn')) {
    // Load jsPDF library dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = function() {
        document.getElementById('downloadBtn').addEventListener('click', function() {
            const urlParams = new URLSearchParams(window.location.search);
            const results = {
                score: urlParams.get('score') || 0,
                warnings: urlParams.get('warnings') || 0,
                duration: urlParams.get('duration') || '00:00',
                date: new Date().toLocaleDateString()
            };
            generateResultsPDF(results);
        });
    };
    document.head.appendChild(script);
}