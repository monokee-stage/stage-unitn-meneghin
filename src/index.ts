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
    checkWgIsInstalled,
    generateKeyPair,
    generateConfigString,
    parseConfigString,
    createPeerPairs
    } from 'wireguard-tools'
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

const app: Express = express();
const port = 3000;
//const { exec } = require('child_process')

const asyncHandler = (fun: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fun(req, res, next))
        .catch(next)
}

let getServerConfig = async (): Promise<WgConfig> => {
    let srv_conf_file = await getConfigObjectFromFile({ filePath: "/home/test/guardline-server.conf"}) //filePath: process.env.SERVER_CONFIG! })
    let server = new WgConfig({
        ...srv_conf_file,
        filePath: process.env.SERVER_CONFIG!
    })
    await server.generateKeys();
    return server;
}

const getAllIps = (__peer: WgConfigPeer): string[] => { 
    //const all_Peers = __peer.peers
    const num_peers = Object.keys(__peer).length;
    console.log("peers: \n",__peer)
    console.log("numero peers: ", num_peers)
    var ip_list : string[] = [ '10.13.13.1/32', '10.13.13.255/32' ]
    //return "ips: " + peers.allowedIps;
    
    
    for(let i=2; i<num_peers+2; i++ ){              // Avoid 10.13.13.1 and 10.13.13.255
        let ip_peer = __peer.allowedIps
        console.log(i, "print: ",  ip_peer!)

        //ip_list[i] = ip_peer
        console.log(ip_list[i],"\n")
    }
    console.log(ip_list[0],ip_list[1])
    return ip_list
}

const getAvailableIp = async (): Promise<string> => {
    let srv_info = getServerConfig()              // Parse server file config
    //const allPeersss = srv_info.peers               // couples of IP-Pubkey of all peers
    //const srv_interface = srv_info.wgInterface      // wg interface settings
    //console.log("All peers", allPeersss)

    //const list = getAllIps(srv_info)

    return '10.13.13.8'                                   //must return a single free ip in the subnetwork 10.13.13.X
}

//***************************************************************** */
//DA ELIMINARE

//const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')
const filePath = "/home/test/guardline-server.conf"

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
    const config2FilePath = path.join('/home/test', '/guardline-server-2.conf')
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
//***************************************************************** */






// GET server info {PublicKey, AllowedIPs, Endpoint, PersistentKeepAlive}
app.get('/server/', asyncHandler(async (req: Request, res: Response) => {
    let srv_info = await getServerConfig()
    let srv_pubkey = srv_info.publicKey!
    //let srv_ip = srv_info.wgInterface.address!.toString() // 10.13.13.1/24
        //let srv_listenport = srv_info.wgInterface.listenPort!.toString()
        //let srv_endpoin = (process.env.SERVER_IP!).concat(':'.toString()).concat(srv_listenport)
        //let srv_allowedips = process.env.SERVER_NETWORK!
    const srv_endpoint = (process.env.SERVER_IP!).concat(':'.toString()).concat(process.env.SERVER_PORT!)
    var srv_data = {
        //ListenPort: srv_info.wgInterface.listenPort,
        //Address: srv_ip,
        PublicKey: srv_pubkey,
        Endpoint: srv_endpoint
    };
    //return res.send( srv_data )
    const free_ip = await getAvailableIp()
    return res.send( test() )
    //return res.send( free_ip )                  //10.13.13.8

}));


// PUT client
app.put('/client/', asyncHandler(async (req: Request, res: Response) => {
    //const version = await checkWgIsInstalled()
    //console.log("You are using ", version)

    //let client_info = await createClientConfig()
    //return res.send(client_info)
    var toRet = await getAvailableIp()
    console.log(toRet,"aaaa")
    return res.send( toRet )
}));


// APIs
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, this is a GET request from Express + TypeScript');
});

function syncReadFile(filename: string) {
    const result = readFileSync(filename);
    return result;
}

function syncWriteFile(filename: string, data: any) {
    writeFileSync(filename, data, { flag: 'w' });
    const contents = readFileSync(filename);
    return contents;
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

app.listen(port, () => {
    console.log(`[Server]: I am running at https://localhost:${port}`);
});