import path from 'path'
import { WgConfig } from 'wireguard-tools'

const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')
const filePath2 = path.join(__dirname, '/configs', '/guardline-client.conf')

const server = new WgConfig({
  wgInterface: { address: ['10.10.1.1'] },
  filePath
})

const client = new WgConfig({
  wgInterface: { address: ['10.10.1.2'] },
  filePath: filePath2
})

// gen keys
//await Promise.all([
  //server.generateKeys({ preSharedKey: true }),
  //client.generateKeys({ preSharedKey: true })
//])

// make a peer from server
const serverAsPeer = server.createPeer({
  allowedIps: ['10.1.1.1/32'],
  preSharedKey: server.preSharedKey
})

// add a client already created in the server wg0.conf
client.addPeer(serverAsPeer)

// make a peer from client and add it to server
server.addPeer(client.createPeer({
  allowedIps: ['10.10.1.1/32'],
  preSharedKey: client.preSharedKey
}))