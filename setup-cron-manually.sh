#!/bin/bash

# Manual Cron Setup for SSL Certificate Renewal
# Use this script if automatic cron setup failed

echo "🔧 Setting up SSL certificate renewal cron job manually..."

# Install cron service if needed
if ! command -v crontab >/dev/null 2>&1; then
    echo "📦 Installing cron service..."
    
    if command -v yum >/dev/null 2>&1; then
        # Amazon Linux / RHEL / CentOS
        sudo yum install -y cronie
        sudo systemctl enable crond
        sudo systemctl start crond
        echo "✅ Cronie installed and started"
    elif command -v apt-get >/dev/null 2>&1; then
        # Ubuntu / Debian
        sudo apt-get update
        sudo apt-get install -y cron
        sudo systemctl enable cron
        sudo systemctl start cron
        echo "✅ Cron installed and started"
    else
        echo "❌ Please install cron manually:"
        echo "   Amazon Linux: sudo yum install -y cronie && sudo systemctl enable crond && sudo systemctl start crond"
        echo "   Ubuntu/Debian: sudo apt-get install -y cron && sudo systemctl enable cron && sudo systemctl start cron"
        exit 1
    fi
fi

# Set up renewal cron job
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
renewal_script="$SCRIPT_DIR/renew-ssl-certs.sh"

# Make renewal script executable
chmod +x "$renewal_script"

# Add cron job (runs every Monday at 3 AM)
cron_entry="0 3 * * 1 $renewal_script >> $SCRIPT_DIR/ssl-renewal.log 2>&1"

# Check if already exists
if crontab -l 2>/dev/null | grep -q "$renewal_script"; then
    echo "✅ Cron job already configured"
else
    (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
    echo "✅ SSL renewal cron job added successfully"
fi

echo ""
echo "📋 Cron job details:"
echo "   Schedule: Every Monday at 3 AM"
echo "   Command: $renewal_script"
echo "   Log file: $SCRIPT_DIR/ssl-renewal.log"
echo ""
echo "🔍 To verify cron jobs: crontab -l"
echo "🔄 To manually renew: $renewal_script"