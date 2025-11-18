#!/bin/bash
# Vibe PDF Editor - Setup Script

echo "🚀 Setting up Vibe PDF Editor..."
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python 3 found"

# Check Poppler
if ! command -v pdftoppm &> /dev/null; then
    echo "⚠️  Poppler not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install poppler
        else
            echo "❌ Homebrew not found. Please install Poppler manually:"
            echo "   brew install poppler"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y poppler-utils
    else
        echo "❌ Please install Poppler manually for your system"
        exit 1
    fi
fi

echo "✅ Poppler found"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
mkdir -p uploads temp static

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the PDF editor:"
echo "  1. source venv/bin/activate"
echo "  2. python app.py"
echo "  3. Open http://localhost:5000 in your browser"
echo ""
echo "Or simply run: ./run.sh"

