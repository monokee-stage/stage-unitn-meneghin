#!/bin/sh
cd ~
# install Wireguard
apt install figlet -y
apt install wireguard -y
apt install curl -y
echo ""
echo ""

# Create config file
cd /etc/wireguard/

if [ -s /etc/wireguard/privatekey ]; then
    figlet !!! private key already generated !!!
    cat /etc/wireguard/privatekey
else
    umask 077; wg genkey | tee privatekey | wg pubkey > publickey
fi

prikeyclient=`cat /etc/wireguard/privatekey`
ipclient="10.13.13.5"
host=`echo $ipclient | cut -d . -f 4`

# Building wg0.conf file
if [ -s /etc/wireguard/wg0.conf ]; then             # The file is not-empty.
    figlet !!! wg0.conf file already exists !!!
else                                                # The file is empty.
    umask 077; touch -a /etc/wireguard/wg0.conf

    echo "[Interface]" >> wg0.conf
    echo "# This client's private key" >> wg0.conf
    echo "PrivateKey = $prikeyclient" >> wg0.conf
    echo "" >> wg0.conf
    echo "# Client ip address" >> wg0.conf
    echo "Address = $ipclient/24" >> wg0.conf
    echo "" >> wg0.conf
    echo "[Peer]" >> wg0.conf
    echo "# server's public key in Monokee" >> wg0.conf
    echo "PublicKey = RLGHcYlX5toih+S/xpE3yqv23yiaey/6u1QYERHUz3c=" >> wg0.conf
    echo "" >> wg0.conf
    echo "# set ACL" >> wg0.conf
    echo "AllowedIPs = 10.13.13.0/24" >> wg0.conf
    echo "" >> wg0.conf
    echo "# server's public IPv4/IPv6 address and port in Monokee" >> wg0.conf
    echo "Endpoint = 10.111.0.44:41194" >> wg0.conf
    echo "" >> wg0.conf
    echo "# Key connection alive" >> wg0.conf
    echo "PersistentKeepalive = 15" >> wg0.conf
    echo ""
    # Enable wg service
    systemctl start wg-quick@wg0
    systemctl status wg-quick@wg0

    # Status of wg
    echo ""
    wg
    echo ""
    ip a show wg0

    #cat /etc/wireguard/wg0.conf#
    figlet Client configurated  

fi