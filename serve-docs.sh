#!/bin/bash
# serve-docs.sh - Script to serve Punch Clock documentation on Linux/macOS

echo "┌───────────────────────────────────────────┐"
echo "│         Punch Clock Documentation         │"
echo "└───────────────────────────────────────────┘"
echo ""

# Check if mkdocs is installed
if python -c "import mkdocs" 2>/dev/null; then
    echo "✓ MkDocs is installed"
else
    echo "✗ MkDocs is not installed"
    echo "Installing required packages..."
    
    pip install mkdocs mkdocs-material pymdown-extensions mkdocstrings mkdocstrings-python mkdocs-git-revision-date-localized-plugin
    
    if [ $? -ne 0 ]; then
        echo "Failed to install required packages. Please install them manually:"
        echo "pip install mkdocs mkdocs-material pymdown-extensions mkdocstrings mkdocstrings-python mkdocs-git-revision-date-localized-plugin"
        exit 1
    fi
    
    echo "✓ Required packages installed successfully"
fi

echo ""
echo "Starting documentation server..."
echo "Documentation will be available at http://127.0.0.1:8080/"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the MkDocs server on port 8080
mkdocs serve -a localhost:8080

# If MkDocs exits with an error, show a message
if [ $? -ne 0 ]; then
    echo "Failed to start the documentation server"
    exit 1
fi