#!/bin/bash
# Vibe PDF Editor - Run Script

echo "🚀 Starting Vibe PDF Editor..."

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Virtual environment not found. Please run ./setup.sh first"
    exit 1
fi

# Create directories if they don't exist
mkdir -p uploads temp static

# Start the application
python app.py

