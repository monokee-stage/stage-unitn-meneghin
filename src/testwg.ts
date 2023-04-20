import * as dotenv from "dotenv";
dotenv.config();

import { readFileSync, writeFileSync } from 'fs';
import * as fs from 'fs';
import express, { Express, NextFunction, Request, Response } from 'express';
import path from 'path'
import * as readline from 'readline';

import {
    WgConfig,
    WgConfigPeer,
    getConfigObjectFromFile,
    getConfigStringFromFile,
    checkWgIsInstalled,
    generateKeyPair,
    generateConfigString,
    parseConfigString,
    createPeerPairs
    } from 'wireguard-tools'

    const util = require('util');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

const app: Express = express();
const port = 3005;
//const { exec } = require('child_process')

const asyncHandler = (fun: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fun(req, res, next))
        .catch(next)
}

const __dirname = "/home/mattia"

//const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')
const filePath = "/home/mattia/test/guardline-server22.conf"

const test = async () => {
  try {
    // make a new config
    const config1 = new WgConfig({
      wgInterface: {
        address: ['10.10.1.1']
      },
      filePath
    })

    // give the config a name
    config1.wgInterface.name = 'Guardline Server'

    // update some other properties
    config1.wgInterface.postUp = ['echo "Guardline Server Up!"']
    config1.wgInterface.listenPort = 5280

    // make a keypair for the config and a pre-shared key
    const keypair = await config1.generateKeys({ preSharedKey: true })

    // these keys will be saved to the config object
    console.log(keypair.publicKey === config1.publicKey) // true
    console.log(keypair.preSharedKey === config1.preSharedKey) // true
    console.log(keypair.privateKey === config1.wgInterface.privateKey) // true

    // write the config to disk
    await config1.writeToFile()

    // read that file into another config object
    const thatConfigFromFile = await getConfigObjectFromFile({ filePath })
    const config2FilePath = path.join(__dirname, '/configs', '/guardline-server-2.conf')
    const config2 = new WgConfig({
      ...thatConfigFromFile,
      filePath: config2FilePath
    })

    // both configs private key will be the same because config2 has been parsed
    // from the file written by config
    console.log(config1.wgInterface.privateKey === config2.wgInterface.privateKey)

    // however, config2 doesn't have a public key becuase WireGuard doesn't save the
    // the public key in the config file.
    // To get the public key, you'll need to run generateKeys on config2
    // it'll keep it's private key and derive a public key from it
    await config2.generateKeys()

    // so now the two public keys will be the same
    console.log(config1.publicKey === config2.publicKey) // true

    // you can generate a new keypair by passing an arg:
    config2.generateKeys({ overwrite: true })

    // so now their public/private keys are different
    console.log(config1.publicKey === config2.publicKey) // false

    // you can create a peer object from a WgConfig like this
    const config2AsPeer = config2.createPeer({
      allowedIps: ['10.10.1.1/32']
    })

    // you can add a peer to a config like this:
    config1.addPeer(config2AsPeer)

    // and remove a peer like this
    //config1.removePeer(config2.publicKey)

    // or you make two WgConfigs peers of each other like this:
    createPeerPairs([
      {
        config: config1,
        // The peer settings to apply when adding this config as a peer
        peerSettings: {
          allowedIps: ['10.10.1.1'],
          preSharedKey: config1.preSharedKey
        }
      },
      {
        config: config2,
        peerSettings: {
          allowedIps: ['10.10.1.2']
        }
      }
    ])

    // That will end up with config1 having config2 as a peer
    // and config2 having config1 as a peer
    //console.log(config1.getPeer(config2.publicKey)) // logs the peer
    //console.log(config2.getPeer(config1.publicKey)) // logs the peer

    // Check that the system has wireguard installed and log the version like this
    // (will throw an error if not installed)
    const wgVersion = await checkWgIsInstalled()
    console.log(wgVersion)

    // if wireguard is installed, you can bring up your config like this:
    // (make sure it's been written to file first!)
    await config1.writeToFile()
    //await config1.up() // Wireguard interface is up

    // you can change something about the interface while it's up
    config1.wgInterface.dns = ['1.1.1.1']
    config1.writeToFile()

    // but make sure you restart the interface for your changes to take effect
    await config1.restart()

    // and finally, when you're done, take down the interface like this
    await config1.down()

    // Thanks for reading!
  } catch (e) {
    console.error(e)
  }
}

app.get('/server/', asyncHandler(async (req: Request, res: Response) => {  
  return res.send( test() )
}));



app.listen(port, () => {
  console.log(`[Server]: I am running at https://localhost:${port}`);
});




/*import path from 'path'
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


//********************************************** 
// make a load of configs
const __dirname = "/etc/wireguard/"
let configs: WgConfig[] = []

for (let i = 1; i <= 10; i++) {
  configs.push(new WgConfig({
    wgInterface: {
      address: [`10.13.13.${i}`],
      privateKey: '',
      name: `Client-${i}`
    },
    filePath: path.join(__dirname, `/wg${i}.conf`)
  }))
}

// get their key pairs
await Promise.all(configs.map(x => x.generateKeys()))

// add them all as peers of each other
createPeerPairs(configs.map(x => {
  return {
    config: x,
    peerSettings: ({ thisConfig, peerConfig }) => {
      const peerAddress = peerConfig.wgInterface.address
      const peerPresharedKey = peerConfig.preSharedKey
      return {
        allowedIps: peerAddress,
        preSharedKey: peerPresharedKey,
        name: peerConfig.wgInterface.name,
        persistentKeepalive: thisConfig.wgInterface.address.includes('10.10.1.1') ? 15 : undefined
      }
    }
  }
}))

// write them all to disk
await Promise.all(configs.map(x => x.writeToFile()))

//************************************************************
if ( fs.existsSync('/etc/wireguard/')){
  console.error("ERROR: Wireguard folder already exists");
} else {
  exec('mkdir /etc/wireguard/ && cd /etc/wireguard/', async (err : any, output : any) => {
  if (err) {
      console.error("ERROR: Folder didn't created: /etc/wireguard/\n", err)
      return output;
  }

const { publicKey, privateKey, preSharedKey } = await generateKeyPair({ preSharedKey: true })       //Generate key pair
        host = 7;
        const srv_endpoint = (process.env.SERVER_IP!).concat(':'.toString()).concat(process.env.SERVER_PORT!)
        const client = generateConfigString({
            wgInterface: {
                name: 'Client test',
                address: ['10.13.13.'.concat(host.toString())],
                privateKey: privateKey
            },
            peers: [
                {
                    allowedIps: [process.env.SERVER_NETWORK!],
                    publicKey: publicKey,
                    endpoint: srv_endpoint,
                    persistentKeepalive: 15
                }
            ]
        })
        console.log(client)
        return client
        })





//************************************************************





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





//******** 20:26 **********
/*
const createClientConfig = async () : Promise<WgConfig> =>{
    const __dirname = "/etc/wireguard/"    
    const __wg0 = "/home/mattia/wg0.conf"
    const thatConfigFromFile = await getConfigObjectFromFile({ filePath : __wg0 })
    const server = new WgConfig({
        ...thatConfigFromFile,
        filePath : __wg0
      }) 

    const client = new WgConfig({
        wgInterface: { address: [getAvailableIp()] },
        filePath: __dirname
      })
      
      // gen keys
      await Promise.all([
        //server.generateKeys({ preSharedKey: true }),
        client.generateKeys({ preSharedKey: true })
      ])
      
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


    await Promise.all(configs.map(x => x.generateKeys())) // get their key pairs
    console.log("1")
    
    
    // add them all as peers of each other
    createPeerPairs(configs.map(x => {
        return {
            config: x,
            peerSettings: ({ peerConfig }) => {
                const peerAddress = peerConfig.wgInterface.address
                const peerPresharedKey = peerConfig.preSharedKey
                
                return {
                    name: peerConfig.wgInterface.name,
                    allowedIps: peerAddress,    
                    preSharedKey: peerPresharedKey,
                    persistentKeepalive: 15
                    //persistentKeepalive: thisConfig.wgInterface.address.includes('10.13.13.1') ? 15 : undefined
                }
            }
        }
        
    }))
    
    await Promise.all(configs.map(x => x.writeToFile()))   // write them all to disk
    return server
}
*/