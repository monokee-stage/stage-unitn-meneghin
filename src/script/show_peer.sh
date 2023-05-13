# Enable VPN service at startup
systemctl enable wg-quick@wg0
# Start VPN service
systemctl start wg-quick@wg0
# Staus VPN service
systemctl status wg-quick@wg0

# Test server ping
echo ""
sleep 5
echo "Check the status" && wg
echo ""
ping -c 4 10.13.13.1 > /dev/null && echo "peer configured succesfully" || echo "peer NOT configured"