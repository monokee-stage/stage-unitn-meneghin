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



/*
// PUT client info into variables {group, IP, pubkey} 
app.put('/client/', jsonParser, async (req: Request, res: Response)=>{    
  const client_peer = new WgConfig({
    wgInterface: { address: ['10.10.1.1'] },
    //filePath
  })


  if ( fs.existsSync('/etc/wireguard/')){
      console.log("*** Wireguard folder already exists ***");
      return false;
  } else {
      exec('mkdir /etc/wireguard/ && cd /etc/wireguard/ && umask 077; wg genkey | tee privatekey | wg pubkey > publickey', (err : any, output : any) => {
          if (err) {
              console.error("could not execute command: ", err)
              return false;
          }
      })
  }
  
  await delay(1000);

  let group = req.body.group; // ???
  let client_ip = "10.13.13.6" // TODO: fetch this from DB or other sources, take into account the user group
  let client_publickey = (syncReadFile('/etc/wireguard/publickey')).toString();

  // Read PrivateKey
  const client_privatekey = (syncReadFile('/etc/wireguard/privatekey')).toString();

  // Content of client's wg0.conf file
  const client_info = "[interface]\nPrivateKey = " + client_privatekey + "Address = "+ client_ip +"/24\n";
  const peer_info = "\n[peer]\nPublicKey = " + process.env.SERVER_PUBKEY + "\nAllowedIPs = " + process.env.SERVER_NETWORK + "\nEndpoint = "+ process.env.SERVER_IP +":" + process.env.SERVER_PORT + "\nPersistentKeepalive = 15";
  const config = client_info.concat(peer_info.toString());
  
  // Write wg0.conf
  syncWriteFile('/etc/wireguard/wg0.conf', config);
  console.log("File created: /etc/wireguard/wg0.conf")

  res.send({
      "client" :{
          "group": group,
          "ip": client_ip,
          "pubkey": client_publickey,
      },
      "server": {
          "url": process.env.SERVER_URL,
          "ip": process.env.SERVER_IP,
          "pubkey": process.env.SERVER_PUBKEY
      }
  });
});
*/