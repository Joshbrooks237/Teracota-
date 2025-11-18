# 🚀 Quick Start Guide

Get your Adobe-free PDF editor running in 3 minutes!

## Installation

### Step 1: Install Poppler (Required)

**macOS:**
```bash
brew install poppler
```

**Linux:**
```bash
sudo apt-get install poppler-utils
```

**Windows:**
Download from [poppler-windows](http://blog.alivate.com.au/poppler-windows/) and add to PATH

### Step 2: Setup & Run

```bash
cd /Users/jimbeam/pdf-editor

# Make scripts executable
chmod +x setup.sh run.sh

# Run setup (one time only)
./setup.sh

# Start the editor
./run.sh
```

### Step 3: Open in Browser

Navigate to: **http://localhost:5000**

## Manual Setup (if scripts don't work)

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create directories
mkdir -p uploads temp static

# Run the app
python app.py
```

## Usage

1. **Upload PDF** - Drag & drop or click the upload area
2. **Edit** - Use toolbar buttons:
   - ✏️ **Add Text** - Click to add custom text
   - 🖍️ **Highlight** - Mark important sections
   - 🖼️ **Add Image** - Insert images/logos
   - ✍️ **Sign** - Draw your signature
   - 🔄 **Rotate** - Rotate current page
   - 🗑️ **Delete** - Remove current page
   - 📝 **Extract** - Pull text from page
   - 💾 **Download** - Save edited PDF

3. **Navigate** - Use arrow keys or buttons to browse pages
4. **Zoom** - +/- buttons or keyboard shortcuts

## Features at a Glance

✅ PDF viewing & rendering  
✅ Text editing & annotations  
✅ Image insertion  
✅ Digital signatures  
✅ Page rotation & deletion  
✅ Text extraction  
✅ PDF merging & splitting  
✅ Beautiful modern UI  
✅ Keyboard shortcuts  
✅ Zoom controls  
✅ 100% local (your docs stay private)

## Troubleshooting

**Port 5000 in use?**
```python
# Edit app.py, change last line to:
app.run(debug=True, host='0.0.0.0', port=8080)
```

**Can't find Poppler?**
```bash
# Check installation
which pdftoppm

# If not found, reinstall:
brew reinstall poppler  # macOS
```

**Module not found errors?**
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

## Next Steps

- Check out [README.md](README.md) for full documentation
- Explore API endpoints for automation
- Customize the UI colors and styling

---

**No subscription. No tracking. No BS. Just PDF editing.**

