#!/usr/bin/env pwsh
# serve-docs.ps1 - Script to serve Punch Clock documentation

Write-Host "┌───────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│         Punch Clock Documentation         │" -ForegroundColor Cyan
Write-Host "└───────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

# Check if mkdocs is installed
try {
    $null = & python -c "import mkdocs" 2>$null
    Write-Host "✓ MkDocs is installed" -ForegroundColor Green
}
catch {
    Write-Host "✗ MkDocs is not installed" -ForegroundColor Red
    Write-Host "Installing required packages..." -ForegroundColor Yellow
    
    & pip install mkdocs mkdocs-material pymdown-extensions mkdocstrings mkdocstrings-python mkdocs-git-revision-date-localized-plugin
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install required packages. Please install them manually:" -ForegroundColor Red
        Write-Host "pip install mkdocs mkdocs-material pymdown-extensions mkdocstrings mkdocstrings-python mkdocs-git-revision-date-localized-plugin" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✓ Required packages installed successfully" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting documentation server..." -ForegroundColor Cyan
Write-Host "Documentation will be available at http://127.0.0.1:8080/" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the MkDocs server on port 8080
& mkdocs serve -a localhost:8080

# If MkDocs exits with an error, show a message
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start the documentation server" -ForegroundColor Red
    exit 1
}