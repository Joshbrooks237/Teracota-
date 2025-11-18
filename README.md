# 🚀 Vibe PDF Editor

**A powerful, beautiful, Adobe-free PDF editing solution**

Stop paying for Adobe! This is a modern, full-featured PDF editor that runs locally with a beautiful web interface.

## ✨ Features

- **📄 PDF Viewing** - Smooth, high-quality PDF rendering
- **✏️ Text Editing** - Add custom text anywhere on your PDFs
- **🖍️ Annotations** - Highlight and mark up documents
- **🔄 Page Manipulation** - Rotate, delete, and reorder pages
- **🔗 Merge & Split** - Combine multiple PDFs or split them apart
- **📝 Text Extraction** - Pull text content from any page
- **💾 Export** - Download your edited PDFs instantly
- **🎨 Beautiful UI** - Modern, intuitive interface with smooth animations
- **⚡ Fast** - Local processing means no upload delays
- **🔒 Private** - Your documents never leave your machine

## 🛠️ Installation

### Prerequisites

1. **Python 3.8+** - [Download here](https://www.python.org/downloads/)
2. **Poppler** - Required for PDF rendering

#### Install Poppler (macOS):
```bash
brew install poppler
```

#### Install Poppler (Ubuntu/Debian):
```bash
sudo apt-get install poppler-utils
```

#### Install Poppler (Windows):
Download from [here](http://blog.alivate.com.au/poppler-windows/) and add to PATH

### Setup

1. **Clone or download this repository**
   ```bash
   cd /Users/jimbeam/pdf-editor
   ```

2. **Create a virtual environment** (recommended)
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open in your browser**
   ```
   http://localhost:5000
   ```

## 🎯 Quick Start

1. **Upload a PDF** - Drag and drop or click to browse
2. **Edit freely** - Use the toolbar to add text, highlights, rotate pages, etc.
3. **Navigate** - Use arrow keys or buttons to move between pages
4. **Zoom** - Use +/- buttons or keyboard shortcuts
5. **Download** - Save your edited PDF when done

## ⌨️ Keyboard Shortcuts

- `←` / `→` - Navigate between pages
- `+` / `-` - Zoom in/out
- `Esc` - Cancel current tool

## 🏗️ Architecture

**Backend (Python/Flask)**
- PDF manipulation with PyPDF2
- Page rendering with pdf2image
- RESTful API for all operations
- Session-based editing (in-memory, extensible to Redis)

**Frontend (Vanilla JS)**
- Modern, responsive UI
- Real-time PDF rendering
- Interactive editing tools
- Smooth animations and transitions

## 📁 Project Structure

```
pdf-editor/
├── app.py              # Flask backend with all API endpoints
├── templates/
│   └── index.html      # Main UI interface
├── static/
│   └── app.js          # Frontend JavaScript logic
├── uploads/            # Temporary file storage
├── temp/               # Processing workspace
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

## 🔧 API Endpoints

- `POST /api/upload` - Upload PDF
- `GET /api/render/<session>/<page>` - Render page as image
- `POST /api/annotate/<session>` - Add annotation
- `POST /api/rotate/<session>/<page>/<angle>` - Rotate page
- `DELETE /api/delete/<session>/<page>` - Delete page
- `POST /api/merge` - Merge multiple PDFs
- `POST /api/split/<session>` - Split PDF
- `GET /api/extract-text/<session>/<page>` - Extract text
- `POST /api/add-text/<session>/<page>` - Add text overlay
- `GET /api/download/<session>` - Download edited PDF
- `GET /api/info/<session>` - Get PDF metadata

## 🚀 Production Deployment

For production use:

1. Replace in-memory sessions with Redis
2. Add user authentication
3. Implement file cleanup cron jobs
4. Use Gunicorn/uWSGI instead of Flask dev server
5. Set up HTTPS with nginx
6. Add rate limiting
7. Implement proper error logging

## 🎨 Customization

The UI uses CSS variables and can be easily themed. Main colors:

- Primary: `#667eea` (purple-blue)
- Secondary: `#764ba2` (purple)
- Gradient: `135deg, #667eea 0%, #764ba2 100%`

## 🐛 Troubleshooting

**"Poppler not found" error**
- Make sure Poppler is installed and in your PATH

**"File too large" error**
- Default max size is 100MB, adjust `MAX_CONTENT_LENGTH` in app.py

**Slow rendering**
- Reduce DPI in convert_from_path() (default is 150)

**Memory issues**
- Implement session cleanup or use Redis for production

## 📄 License

Free to use. No Adobe required. Ever.

## 🤝 Contributing

This is a solo project but feel free to fork and extend!

## 💡 Future Ideas

- Real-time collaboration
- OCR for scanned documents
- Digital signatures
- Form creation tools
- Batch processing
- Cloud storage integration
- Mobile app

---

**Built with ❤️ by a developer who got tired of Adobe's subscription model**

*"Why rent software when you can own it?"*

