import path from 'path'
import { WgConfig, WgConfigPeer } from 'wireguard-tools'

const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')

const config1 = new WgConfig({
  wgInterface: { address: ['10.10.1.1'] },
  filePath
})

const server: WgConfigPeer = {
    name: "WGServer",
    endpoint: "10.1.0.1",
    publicKey: "xxxxxxxxxxxxx",
    persistentKeepalive: 15
}

config1.addPeer(server)

config1.generateKeys().then(() => {
   console.log(config1);
})