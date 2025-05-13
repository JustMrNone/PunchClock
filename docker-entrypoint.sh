#!/bin/bash
set -e

# Create necessary directories with proper permissions
mkdir -p /app/media/exports
chmod -R 755 /app/media

# Create /tmp directory for wkhtmltopdf if it doesn't exist
mkdir -p /tmp
chmod 777 /tmp

# Verify wkhtmltopdf installation
echo "Checking wkhtmltopdf installation..."

# Check base binary
if [ -f "/usr/bin/wkhtmltopdf" ]; then
    echo "wkhtmltopdf binary found at /usr/bin/wkhtmltopdf"
    chmod +x /usr/bin/wkhtmltopdf
else
    echo "ERROR: wkhtmltopdf binary not found at /usr/bin/wkhtmltopdf!"
    # Try to install it again just in case
    apt-get update && apt-get install -y wkhtmltopdf
fi

# Create wrapper script from scratch
echo "Creating wkhtmltopdf wrapper script..."
echo '#!/bin/bash' > /usr/local/bin/wkhtmltopdf-xvfb
echo 'xvfb-run -a --server-args="-screen 0, 1024x768x24" /usr/bin/wkhtmltopdf "$@"' >> /usr/local/bin/wkhtmltopdf-xvfb
chmod +x /usr/local/bin/wkhtmltopdf-xvfb
echo "Created wrapper script at /usr/local/bin/wkhtmltopdf-xvfb"

# Create symlink
ln -sf /usr/bin/wkhtmltopdf /usr/local/bin/wkhtmltopdf
echo "Created symlink at /usr/local/bin/wkhtmltopdf"

# Verify the files exist
ls -la /usr/bin/wkhtmltopdf
ls -la /usr/local/bin/wkhtmltopdf
ls -la /usr/local/bin/wkhtmltopdf-xvfb

# Start the application
exec python manage.py runserver 0.0.0.0:8000