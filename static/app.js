// Vibe PDF Editor - Frontend JavaScript
// State management
let currentSession = null;
let currentPage = 1;
let totalPages = 0;
let zoomLevel = 1;
let activeTool = null;
let clickPosition = null;

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const pdfViewer = document.getElementById('pdfViewer');
const viewerControls = document.getElementById('viewerControls');
const pdfInfo = document.getElementById('pdfInfo');
const loading = document.getElementById('loading');

// Buttons
const addTextBtn = document.getElementById('addTextBtn');
const highlightBtn = document.getElementById('highlightBtn');
const addImageBtn = document.getElementById('addImageBtn');
const signatureBtn = document.getElementById('signatureBtn');
const rotateBtn = document.getElementById('rotateBtn');
const deletePageBtn = document.getElementById('deletePageBtn');
const extractTextBtn = document.getElementById('extractTextBtn');
const downloadBtn = document.getElementById('downloadBtn');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const fitWidthBtn = document.getElementById('fitWidthBtn');

// Modals
const textModal = document.getElementById('textModal');
const textInput = document.getElementById('textInput');
const textSize = document.getElementById('textSize');
const textColor = document.getElementById('textColor');
const confirmTextBtn = document.getElementById('confirmTextBtn');
const cancelTextBtn = document.getElementById('cancelTextBtn');

const imageModal = document.getElementById('imageModal');
const imageInput = document.getElementById('imageInput');
const imageWidth = document.getElementById('imageWidth');
const imageHeight = document.getElementById('imageHeight');
const confirmImageBtn = document.getElementById('confirmImageBtn');
const cancelImageBtn = document.getElementById('cancelImageBtn');

const signatureModal = document.getElementById('signatureModal');
const signatureCanvas = document.getElementById('signatureCanvas');
const confirmSignatureBtn = document.getElementById('confirmSignatureBtn');
const cancelSignatureBtn = document.getElementById('cancelSignatureBtn');
const clearSignatureBtn = document.getElementById('clearSignatureBtn');

// Signature drawing
let isDrawing = false;
let signatureCtx = null;

// Upload functionality
uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragging');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragging');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragging');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        handleFileUpload(files[0]);
    } else {
        alert('Please upload a valid PDF file');
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

async function handleFileUpload(file) {
    showLoading();
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentSession = data.session_id;
            totalPages = data.num_pages;
            currentPage = 1;
            
            updatePdfInfo(data.filename, data.num_pages, file.size);
            enableTools();
            await renderPage(currentPage);
            
            viewerControls.style.display = 'flex';
            pdfInfo.classList.add('visible');
        } else {
            alert('Error uploading PDF: ' + data.error);
        }
    } catch (error) {
        alert('Error uploading PDF: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function renderPage(pageNum) {
    if (!currentSession) return;
    
    showLoading();
    
    try {
        const response = await fetch(`/api/render/${currentSession}/${pageNum}`);
        const data = await response.json();
        
        if (response.ok) {
            pdfViewer.innerHTML = `
                <div class="pdf-canvas-container" style="transform: scale(${zoomLevel})">
                    <img id="pdfCanvas" src="${data.image}" alt="PDF Page ${pageNum}">
                </div>
            `;
            
            document.getElementById('currentPage').textContent = pageNum;
            document.getElementById('totalPages').textContent = totalPages;
            
            // Add click handler for tools
            const canvas = document.getElementById('pdfCanvas');
            canvas.addEventListener('click', handleCanvasClick);
        } else {
            alert('Error rendering page: ' + data.error);
        }
    } catch (error) {
        alert('Error rendering page: ' + error.message);
    } finally {
        hideLoading();
    }
}

function handleCanvasClick(e) {
    const rect = e.target.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    clickPosition = { x, y };
    
    if (activeTool === 'text') {
        textModal.classList.add('active');
    } else if (activeTool === 'highlight') {
        // For highlight, we'd need to implement drag selection
        addHighlight(x, y, 100, 20); // Default highlight size
    } else if (activeTool === 'image') {
        imageModal.classList.add('active');
    } else if (activeTool === 'signature') {
        signatureModal.classList.add('active');
        initSignatureCanvas();
    }
}

async function addHighlight(x, y, width, height) {
    try {
        const response = await fetch(`/api/annotate/${currentSession}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                page: currentPage,
                type: 'highlight',
                x, y, width, height
            })
        });
        
        if (response.ok) {
            await renderPage(currentPage);
        }
    } catch (error) {
        alert('Error adding highlight: ' + error.message);
    }
}

async function addText() {
    if (!clickPosition) return;
    
    const text = textInput.value;
    const size = parseInt(textSize.value);
    const color = textColor.value;
    
    try {
        const response = await fetch(`/api/add-text/${currentSession}/${currentPage}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text, 
                x: clickPosition.x, 
                y: clickPosition.y, 
                size, 
                color
            })
        });
        
        if (response.ok) {
            // Also add as annotation for immediate rendering
            await fetch(`/api/annotate/${currentSession}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    page: currentPage,
                    type: 'text',
                    text,
                    x: clickPosition.x,
                    y: clickPosition.y,
                    size,
                    color
                })
            });
            
            await renderPage(currentPage);
            closeTextModal();
        }
    } catch (error) {
        alert('Error adding text: ' + error.message);
    }
}

async function rotatePage() {
    if (!currentSession) return;
    
    showLoading();
    
    try {
        const response = await fetch(`/api/rotate/${currentSession}/${currentPage}/90`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await renderPage(currentPage);
        } else {
            alert('Error rotating page');
        }
    } catch (error) {
        alert('Error rotating page: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function deletePage() {
    if (!currentSession || totalPages <= 1) {
        alert('Cannot delete the only page');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this page?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/delete/${currentSession}/${currentPage}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            totalPages = data.num_pages;
            if (currentPage > totalPages) {
                currentPage = totalPages;
            }
            document.getElementById('infoPages').textContent = totalPages;
            await renderPage(currentPage);
        } else {
            alert('Error deleting page: ' + data.error);
        }
    } catch (error) {
        alert('Error deleting page: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function extractText() {
    if (!currentSession) return;
    
    showLoading();
    
    try {
        const response = await fetch(`/api/extract-text/${currentSession}/${currentPage}`);
        const data = await response.json();
        
        if (response.ok) {
            // Show text in alert (in production, use better UI)
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 700px;">
                    <h3>Extracted Text - Page ${currentPage}</h3>
                    <div class="form-group">
                        <textarea readonly rows="15" style="font-family: monospace;">${data.text}</textarea>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" onclick="this.closest('.modal').remove()">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            alert('Error extracting text: ' + data.error);
        }
    } catch (error) {
        alert('Error extracting text: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function downloadPDF() {
    if (!currentSession) return;
    
    showLoading();
    
    try {
        window.location.href = `/api/download/${currentSession}`;
    } catch (error) {
        alert('Error downloading PDF: ' + error.message);
    } finally {
        // Give a small delay for download to start
        setTimeout(hideLoading, 1000);
    }
}

// Tool handlers
addTextBtn.addEventListener('click', () => {
    activeTool = activeTool === 'text' ? null : 'text';
    updateActiveToolButton(addTextBtn);
    document.getElementById('pdfCanvas')?.style.setProperty('cursor', activeTool === 'text' ? 'text' : 'crosshair');
});

highlightBtn.addEventListener('click', () => {
    activeTool = activeTool === 'highlight' ? null : 'highlight';
    updateActiveToolButton(highlightBtn);
});

addImageBtn.addEventListener('click', () => {
    activeTool = activeTool === 'image' ? null : 'image';
    updateActiveToolButton(addImageBtn);
});

signatureBtn.addEventListener('click', () => {
    activeTool = activeTool === 'signature' ? null : 'signature';
    updateActiveToolButton(signatureBtn);
});

rotateBtn.addEventListener('click', rotatePage);
deletePageBtn.addEventListener('click', deletePage);
extractTextBtn.addEventListener('click', extractText);
downloadBtn.addEventListener('click', downloadPDF);

// Page navigation
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
    }
});

// Zoom controls
zoomInBtn.addEventListener('click', () => {
    zoomLevel = Math.min(zoomLevel + 0.25, 3);
    renderPage(currentPage);
});

zoomOutBtn.addEventListener('click', () => {
    zoomLevel = Math.max(zoomLevel - 0.25, 0.5);
    renderPage(currentPage);
});

fitWidthBtn.addEventListener('click', () => {
    zoomLevel = 1;
    renderPage(currentPage);
});

// Text modal handlers
confirmTextBtn.addEventListener('click', addText);
cancelTextBtn.addEventListener('click', closeTextModal);

function closeTextModal() {
    textModal.classList.remove('active');
    textInput.value = '';
    clickPosition = null;
}

// Image modal handlers
confirmImageBtn.addEventListener('click', addImage);
cancelImageBtn.addEventListener('click', closeImageModal);

async function addImage() {
    if (!clickPosition || !imageInput.files[0]) {
        alert('Please select an image');
        return;
    }
    
    const file = imageInput.files[0];
    const width = parseInt(imageWidth.value);
    const height = parseInt(imageHeight.value);
    
    showLoading();
    
    try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('x', clickPosition.x);
        formData.append('y', clickPosition.y);
        formData.append('width', width);
        formData.append('height', height);
        
        const response = await fetch(`/api/add-image/${currentSession}/${currentPage}`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            await renderPage(currentPage);
            closeImageModal();
        } else {
            alert('Error adding image');
        }
    } catch (error) {
        alert('Error adding image: ' + error.message);
    } finally {
        hideLoading();
    }
}

function closeImageModal() {
    imageModal.classList.remove('active');
    imageInput.value = '';
    clickPosition = null;
}

// Signature canvas handlers
function initSignatureCanvas() {
    signatureCtx = signatureCanvas.getContext('2d');
    signatureCtx.strokeStyle = '#000000';
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    signatureCtx.lineJoin = 'round';
    
    // Clear canvas
    signatureCtx.fillStyle = 'white';
    signatureCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    
    // Add drawing listeners
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);
    
    // Touch support
    signatureCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        signatureCanvas.dispatchEvent(mouseEvent);
    });
    
    signatureCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        signatureCanvas.dispatchEvent(mouseEvent);
    });
    
    signatureCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        signatureCanvas.dispatchEvent(mouseEvent);
    });
}

function startDrawing(e) {
    isDrawing = true;
    const rect = signatureCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    signatureCtx.beginPath();
    signatureCtx.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = signatureCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    signatureCtx.lineTo(x, y);
    signatureCtx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

clearSignatureBtn.addEventListener('click', () => {
    signatureCtx.fillStyle = 'white';
    signatureCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
});

confirmSignatureBtn.addEventListener('click', addSignature);
cancelSignatureBtn.addEventListener('click', closeSignatureModal);

async function addSignature() {
    if (!clickPosition) return;
    
    // Convert canvas to base64
    const signatureData = signatureCanvas.toDataURL('image/png');
    
    showLoading();
    
    try {
        const response = await fetch(`/api/add-signature/${currentSession}/${currentPage}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signature: signatureData,
                x: clickPosition.x,
                y: clickPosition.y,
                width: 200,
                height: 100
            })
        });
        
        if (response.ok) {
            await renderPage(currentPage);
            closeSignatureModal();
        } else {
            alert('Error adding signature');
        }
    } catch (error) {
        alert('Error adding signature: ' + error.message);
    } finally {
        hideLoading();
    }
}

function closeSignatureModal() {
    signatureModal.classList.remove('active');
    clickPosition = null;
}

// Utility functions
function updateActiveToolButton(button) {
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    if (activeTool) {
        button.classList.add('active');
    }
}

function enableTools() {
    const tools = [addTextBtn, highlightBtn, addImageBtn, signatureBtn, rotateBtn, deletePageBtn, extractTextBtn, downloadBtn];
    tools.forEach(btn => btn.disabled = false);
}

function updatePdfInfo(filename, pages, size) {
    document.getElementById('infoFilename').textContent = filename.length > 20 ? 
        filename.substring(0, 17) + '...' : filename;
    document.getElementById('infoPages').textContent = pages;
    document.getElementById('infoSize').textContent = formatBytes(size);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showLoading() {
    loading.classList.add('active');
}

function hideLoading() {
    loading.classList.remove('active');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!currentSession) return;
    
    if (e.key === 'ArrowLeft' && currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
    } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
    } else if (e.key === '+' || e.key === '=') {
        zoomLevel = Math.min(zoomLevel + 0.25, 3);
        renderPage(currentPage);
    } else if (e.key === '-') {
        zoomLevel = Math.max(zoomLevel - 0.25, 0.5);
        renderPage(currentPage);
    }
});

