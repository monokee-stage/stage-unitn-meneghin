#!/bin/bash
wg
echo "Insert IP of the client that you want remove" && read ipclient
mask="/32"
ipc=$ipclient$mask
echo $ipc
echo ""

#Publi Key of the client
echo "Insert Public Key of the client that you want remove" && read pubkey
echo ""

#Remove wg Peer
wg set wg0 peer $pubkey remove
ip -4 route delete $ipc dev wg0

echo "Check the status"
wg