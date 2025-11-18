"""
Vibe PDF Editor - A powerful, Adobe-free PDF editing solution
Backend API for PDF manipulation operations
"""

from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import io
import json
from datetime import datetime
from PyPDF2 import PdfReader, PdfWriter, PdfMerger
from pdf2image import convert_from_path
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
import base64
import tempfile
import shutil

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
TEMP_FOLDER = 'temp'
ALLOWED_EXTENSIONS = {'pdf'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TEMP_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size

# Store PDF sessions in memory (in production, use Redis or database)
pdf_sessions = {}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/upload', methods=['POST'])
def upload_pdf():
    """Upload and initialize a PDF editing session"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        # Create session
        session_id = unique_filename.replace('.pdf', '')
        pdf_reader = PdfReader(filepath)
        
        pdf_sessions[session_id] = {
            'filepath': filepath,
            'filename': filename,
            'num_pages': len(pdf_reader.pages),
            'annotations': {},
            'text_edits': {},
            'images': {}
        }
        
        return jsonify({
            'session_id': session_id,
            'filename': filename,
            'num_pages': len(pdf_reader.pages)
        })
    
    return jsonify({'error': 'Invalid file type'}), 400


@app.route('/api/render/<session_id>/<int:page_num>', methods=['GET'])
def render_page(session_id, page_num):
    """Render a specific page as an image"""
    if session_id not in pdf_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = pdf_sessions[session_id]
    filepath = session['filepath']
    
    if page_num < 1 or page_num > session['num_pages']:
        return jsonify({'error': 'Invalid page number'}), 400
    
    # Convert PDF page to image
    images = convert_from_path(filepath, first_page=page_num, last_page=page_num, dpi=150)
    
    if images:
        img = images[0]
        
        # Apply annotations if any
        if str(page_num) in session['annotations']:
            draw = ImageDraw.Draw(img)
            for annotation in session['annotations'][str(page_num)]:
                if annotation['type'] == 'highlight':
                    draw.rectangle(
                        [annotation['x'], annotation['y'], 
                         annotation['x'] + annotation['width'], 
                         annotation['y'] + annotation['height']],
                        fill=(255, 255, 0, 100)
                    )
                elif annotation['type'] == 'text':
                    try:
                        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", annotation.get('size', 12))
                    except:
                        font = ImageFont.load_default()
                    draw.text((annotation['x'], annotation['y']), annotation['text'], 
                             fill=annotation.get('color', 'black'), font=font)
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return jsonify({
            'image': f'data:image/png;base64,{img_base64}',
            'width': img.width,
            'height': img.height
        })
    
    return jsonify({'error': 'Failed to render page'}), 500


@app.route('/api/annotate/<session_id>', methods=['POST'])
def add_annotation(session_id):
    """Add annotation to a page"""
    if session_id not in pdf_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    data = request.json
    page_num = str(data['page'])
    session = pdf_sessions[session_id]
    
    if page_num not in session['annotations']:
        session['annotations'][page_num] = []
    
    session['annotations'][page_num].append({
        'type': data['type'],
        'x': data['x'],
        'y': data['y'],
        'width': data.get('width', 0),
        'height': data.get('height', 0),
        'text': data.get('text', ''),
        'color': data.get('color', 'black'),
        'size': data.get('size', 12)
    })
    
    return jsonify({'success': True})


@app.route('/api/rotate/<session_id>/<int:page_num>/<int:angle>', methods=['POST'])
def rotate_page(session_id, page_num, angle):
    """Rotate a specific page"""
    if session_id not in pdf_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = pdf_sessions[session_id]
    filepath = session['filepath']
    
    pdf_reader = PdfReader(filepath)
    pdf_writer = PdfWriter()
    
    for i, page in enumerate(pdf_reader.pages):
        if i == page_num - 1:
            page.rotate(angle)
        pdf_writer.add_page(page)
    
    # Save to temporary file and replace original
    temp_path = os.path.join(TEMP_FOLDER, f'temp_{session_id}.pdf')
    with open(temp_path, 'wb') as output_file:
        pdf_writer.write(output_file)
    
    shutil.move(temp_path, filepath)
    
    return jsonify({'success': True})


@app.route('/api/delete/<session_id>/<int:page_num>', methods=['DELETE'])
def delete_page(session_id, page_num):
    """Delete a specific page"""
    if session_id not in pdf_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = pdf_sessions[session_id]
    filepath = session['filepath']
    
    pdf_reader = PdfReader(filepath)
    pdf_writer = PdfWriter()
    
    for i, page in enumerate(pdf_reader.pages):
        if i != page_num - 1:
            pdf_writer.add_page(page)
    
    temp_path = os.path.join(TEMP_FOLDER, f'temp_{session_id}.pdf')
    with open(temp_path, 'wb') as output_file:
        pdf_writer.write(output_file)
    
    shutil.move(temp_path, filepath)
    session['num_pages'] -= 1
    
    return jsonify({'success': True, 'num_pages': session['num_pages']})


@app.route('/api/merge', methods=['POST'])
def merge_pdfs():
    """Merge multiple PDFs"""
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files')
    
    if len(files) < 2:
        return jsonify({'error': 'At least 2 PDFs required'}), 400
    
    merger = PdfMerger()
    temp_files = []
    
    try:
        for file in files:
            if file and allowed_file(file.filename):
                temp_path = os.path.join(TEMP_FOLDER, secure_filename(file.filename))
                file.save(temp_path)
                temp_files.append(temp_path)
                merger.append(temp_path)
        
        output_filename = f'merged_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        merger.write(output_path)
        merger.close()
        
        # Cleanup temp files
        for temp_file in temp_files:
            os.remove(temp_file)
        
        return send_file(output_path, as_attachment=True, download_name=output_filename)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/split/<session_id>', methods=['POST'])
def split_pdf(session_id):
    """Split PDF into individual pages or ranges"""
    if session_id not in pdf_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = pdf_sessions[session_id]
    filepath = session['filepath']
    data = request.json
    
    pdf_reader = PdfReader(filepath)
    ranges = data.get('ranges', [])  # e.g., [[1,3], [4,6]]
    
    output_files = []
    
    try:
        for idx, page_range in enumerate(ranges):
            pdf_writer = PdfWriter()
            start, end = page_range
            
            for page_num in range(start - 1, end):
                if 0 <= page_num < len(pdf_reader.pages):
                    pdf_writer.add_page(pdf_reader.pages[page_num])
            
            output_filename = f'split_{idx + 1}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
            output_path = os.path.join(UPLOAD_FOLDER, output_filename)
            
            with open(output_path, 'wb') as output_file:
                pdf_writer.write(output_file)
            
            output_files.append(output_filename)
        
        return jsonify({'success': True, 'files': output_files})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/extract-text/<session_id>/<int:page_num>', methods=['GET'])
def extract_text(session_id, page_num):
    """Extract text from a specific page"""
    if session_id not in pdf_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = pdf_sessions[session_id]
    filepath = session['filepath']
    
    pdf_reader = PdfReader(filepath)
    
    if page_num < 1 or page_num > len(pdf_reader.pages):
        return jsonify({'error': 'Invalid page number'}), 400
    
    page = pdf_reader.pages[page_num - 1]
    text = page.extract_text()
    
    return jsonify({'text': text})


@app.route('/api/add-text/<session_id>/<int:page_num>', methods=['POST'])
def add_text_to_page(session_id, page_num):
    """Add text overlay to a page"""
    if session_id not in pdf_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = pdf_sessions[session_id]
    data = request.json
    
    # Store text edit for rendering
    if str(page_num) not in session['text_edits']:
        session['text_edits'][str(page_num)] = []
    
    session['text_edits'][str(page_num)].append({
        'text': data['text'],
        'x': data['x'],
        'y': data['y'],
        'size': data.get('size', 12),
        'color': data.get('color', 'black')
    })
    
    return jsonify({'success': True})


@app.route('/api/download/<session_id>', methods=['GET'])
def download_pdf(session_id):
    """Download the edited PDF"""
    if session_id not in pdf_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = pdf_sessions[session_id]
    filepath = session['filepath']
    filename = session['filename']
    
    # If there are annotations or text edits, create a new PDF with overlays
    if session['annotations'] or session['text_edits']:
        pdf_reader = PdfReader(filepath)
        pdf_writer = PdfWriter()
        
        for i, page in enumerate(pdf_reader.pages):
            page_num = str(i + 1)
            
            # Create overlay for annotations/text
            if page_num in session['annotations'] or page_num in session['text_edits']:
                packet = io.BytesIO()
                can = canvas.Canvas(packet, pagesize=letter)
                
                # Add text edits
                if page_num in session['text_edits']:
                    for edit in session['text_edits'][page_num]:
                        can.setFont("Helvetica", edit['size'])
                        can.drawString(edit['x'], edit['y'], edit['text'])
                
                can.save()
                packet.seek(0)
                
                overlay_pdf = PdfReader(packet)
                page.merge_page(overlay_pdf.pages[0])
            
            pdf_writer.add_page(page)
        
        output_path = os.path.join(TEMP_FOLDER, f'edited_{filename}')
        with open(output_path, 'wb') as output_file:
            pdf_writer.write(output_file)
        
        return send_file(output_path, as_attachment=True, download_name=f'edited_{filename}')
    
    return send_file(filepath, as_attachment=True, download_name=filename)


@app.route('/api/info/<session_id>', methods=['GET'])
def get_pdf_info(session_id):
    """Get PDF metadata and information"""
    if session_id not in pdf_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = pdf_sessions[session_id]
    filepath = session['filepath']
    
    pdf_reader = PdfReader(filepath)
    metadata = pdf_reader.metadata
    
    info = {
        'filename': session['filename'],
        'num_pages': session['num_pages'],
        'title': metadata.title if metadata and metadata.title else 'Unknown',
        'author': metadata.author if metadata and metadata.author else 'Unknown',
        'creator': metadata.creator if metadata and metadata.creator else 'Unknown',
        'file_size': os.path.getsize(filepath)
    }
    
    return jsonify(info)


@app.route('/api/add-image/<session_id>/<int:page_num>', methods=['POST'])
def add_image_to_page(session_id, page_num):
    """Add image to a specific page"""
    if session_id not in pdf_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    session = pdf_sessions[session_id]
    image_file = request.files['image']
    x = float(request.form.get('x', 0))
    y = float(request.form.get('y', 0))
    width = float(request.form.get('width', 100))
    height = float(request.form.get('height', 100))
    
    # Save image temporarily
    temp_image_path = os.path.join(TEMP_FOLDER, f'img_{session_id}_{page_num}.png')
    image_file.save(temp_image_path)
    
    # Store image info for later overlay
    if str(page_num) not in session['images']:
        session['images'][str(page_num)] = []
    
    session['images'][str(page_num)].append({
        'path': temp_image_path,
        'x': x,
        'y': y,
        'width': width,
        'height': height
    })
    
    # Apply image to PDF
    try:
        filepath = session['filepath']
        pdf_reader = PdfReader(filepath)
        pdf_writer = PdfWriter()
        
        for i, page in enumerate(pdf_reader.pages):
            if i == page_num - 1:
                # Create overlay with image
                packet = io.BytesIO()
                
                # Get page size
                page_width = float(page.mediabox.width)
                page_height = float(page.mediabox.height)
                
                can = canvas.Canvas(packet, pagesize=(page_width, page_height))
                
                # Add image
                img = Image.open(temp_image_path)
                img_reader = ImageReader(temp_image_path)
                
                # Convert coordinates (PDF coordinates start from bottom-left)
                pdf_y = page_height - y - height
                
                can.drawImage(img_reader, x, pdf_y, width, height, preserveAspectRatio=True)
                can.save()
                
                packet.seek(0)
                overlay_pdf = PdfReader(packet)
                page.merge_page(overlay_pdf.pages[0])
            
            pdf_writer.add_page(page)
        
        # Save modified PDF
        temp_pdf_path = os.path.join(TEMP_FOLDER, f'temp_{session_id}.pdf')
        with open(temp_pdf_path, 'wb') as output_file:
            pdf_writer.write(output_file)
        
        shutil.move(temp_pdf_path, filepath)
        
        return jsonify({'success': True})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/add-signature/<session_id>/<int:page_num>', methods=['POST'])
def add_signature(session_id, page_num):
    """Add a drawn signature to a page"""
    if session_id not in pdf_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    data = request.json
    signature_data = data.get('signature')  # Base64 image data
    x = float(data.get('x', 0))
    y = float(data.get('y', 0))
    width = float(data.get('width', 200))
    height = float(data.get('height', 100))
    
    if not signature_data:
        return jsonify({'error': 'No signature data provided'}), 400
    
    try:
        # Decode base64 image
        image_data = signature_data.split(',')[1] if ',' in signature_data else signature_data
        image_bytes = base64.b64decode(image_data)
        
        # Save temporarily
        temp_sig_path = os.path.join(TEMP_FOLDER, f'sig_{session_id}_{page_num}.png')
        with open(temp_sig_path, 'wb') as f:
            f.write(image_bytes)
        
        session = pdf_sessions[session_id]
        
        # Apply signature using same logic as add_image
        filepath = session['filepath']
        pdf_reader = PdfReader(filepath)
        pdf_writer = PdfWriter()
        
        for i, page in enumerate(pdf_reader.pages):
            if i == page_num - 1:
                packet = io.BytesIO()
                page_width = float(page.mediabox.width)
                page_height = float(page.mediabox.height)
                can = canvas.Canvas(packet, pagesize=(page_width, page_height))
                
                img_reader = ImageReader(temp_sig_path)
                pdf_y = page_height - y - height
                can.drawImage(img_reader, x, pdf_y, width, height, preserveAspectRatio=True, mask='auto')
                can.save()
                
                packet.seek(0)
                overlay_pdf = PdfReader(packet)
                page.merge_page(overlay_pdf.pages[0])
            
            pdf_writer.add_page(page)
        
        temp_pdf_path = os.path.join(TEMP_FOLDER, f'temp_{session_id}.pdf')
        with open(temp_pdf_path, 'wb') as output_file:
            pdf_writer.write(output_file)
        
        shutil.move(temp_pdf_path, filepath)
        
        return jsonify({'success': True})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)

