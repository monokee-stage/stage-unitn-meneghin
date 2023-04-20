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
const port = 3000;
//const { exec } = require('child_process')

const asyncHandler = (fun: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fun(req, res, next))
        .catch(next)
}




let getServerConfig = async (): Promise<WgConfig> => {

    const srv_conf_file = await getConfigObjectFromFile({ filePath: process.env.SERVER_CONFIG!}) //filePath: process.env.SERVER_CONFIG! })

    let server1 = new WgConfig({
        ...srv_conf_file,
        filePath: process.env.SERVER_CONFIG!
    })
    await server1.generateKeys();
    return server1;
}

const getAllIpsUsed = async (): Promise<string[]> => {                          // Return a list whose contains all the busy ips in the range [10.13.13.1 - 10.13.13.255]
    
    let srv_info = await getServerConfig()                                      // Parse server file config
    
    //const srv_interface = srv_info.wgInterface                                // obj contains wg interface settings
    const allPeers = srv_info.peers                                             // obj contains couples of IP-Pubkey of all peers
    console.log("All peers: ", allPeers)

    var ip_list : string[] = [ '10.13.13.1', '10.13.13.255' ]                   // Maybe /32
    const num_peers = Object.keys(allPeers!).length;
    console.log("Amount of peers: ", num_peers)
    console.log("Total busy IPs: ",(num_peers+ip_list.length))
    console.log("Amount of IPs available:", (255-(num_peers+ip_list.length)))   // Using Subnet = 00000000, wildcard = 11111111 255 Ips available

    for(let i=2; i<num_peers+2; i++ ){                                          // For to build the string to be returned, Avoid 10.13.13.1 and 10.13.13.255
                                                                                
        for(let j=0; j<num_peers; j++ ){
            const ipOfPeerChars = Object.values(allPeers![j].allowedIps![0])
            let ipOfPeerStr = ""

            for(let k=0; k<ipOfPeerChars.length; k++ ){
                ipOfPeerStr = ipOfPeerStr.concat(ipOfPeerChars[k])
                
            }
            ip_list[j+2] = ipOfPeerStr
        }
    
    }
    console.log("BUSY IP LIST", ip_list)
    return ip_list
}

const getAvailableIp = async (): Promise<string[]> => {

    let srv_info = await getServerConfig()              // Parse server file config
    const allPeers = srv_info.peers               // couples of IP-Pubkey of all peers
    //const srv_interface = srv_info.wgInterface      // wg interface settings
    //console.log("All peersss @ 82", allPeers)

    const list = getAllIpsUsed()
    
    //var ipF = {ip: "10.13.13.8", mask: "/24"}

    return list                                  //must return a single free ip in the subnetwork 10.13.13.X
    
}




const createServerFile = async () => {
  try {
    // make a new config
    //const ServerfilePath = "/home//mattia/test/"
    const ServerfilePath = path.join('/home//mattia/test/', 'wg-server.conf')
    console.log(ServerfilePath)
    const server = new WgConfig({
        wgInterface: {
            address: ['10.13.13.1']
        },
        filePath: ServerfilePath
    })

    // give the config a name
    server.wgInterface.name = 'Monokee VPN Server'

    // update some other properties
    server.wgInterface.listenPort = 41194

    // make a keypair for the config and a pre-shared key
    const keypair = await server.generateKeys({ preSharedKey: true })

    // these keys will be saved to the config object
    console.log(keypair.publicKey === server.publicKey) // true
    console.log(keypair.preSharedKey === server.preSharedKey) // true
    console.log(keypair.privateKey === server.wgInterface.privateKey) // true

    // write the config to disk
    await server.writeToFile()

    // read that file into another config object
    //const thatConfigFromFile = await getConfigObjectFromFile({ filePath : ServerfilePath })

    //************************************************************************************** */
    //config num_client client pairs
    const num_peers = 3     //[10.13.13.2  -  10.13.13.4]

    let configs: WgConfig[] = []

    for (let i = 1; i <= 3; i++) {
        configs.push(new WgConfig({
            wgInterface: {
            address: [`10.13.13.${i}`],
            privateKey: '',
            name: `Client-${i}`
            },
            filePath: path.join('/home/mattia/test/client-configs', `/client-${i}.conf`)
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
                    persistentKeepalive: 15
                }
            }
        }
    }))

    // write them all to disk
    await Promise.all(configs.map(x => x.writeToFile()))



    // ************ 13:10 *************
    /*
    for(let i=2; i<num_peers+2; i++ ){
        const thatConfigFromFile = await getConfigObjectFromFile({ filePath : ServerfilePath })
        const host = i.toString()
        const clientX_FilePath = (('/home/mattia/test/client-configs/').concat(host)).concat('client.conf')
        //const clientX_FilePath = path.join('/home/mattia/test/client-configs/', host, 'client.conf')
        console.log("print: ", i ,"\n", clientX_FilePath)
        const clientX = new WgConfig({
        ...thatConfigFromFile,
        filePath: clientX_FilePath
        })

        console.log(server.wgInterface.privateKey === clientX.wgInterface.privateKey)
        await clientX.generateKeys()
        console.log(server.publicKey === clientX.publicKey) // true
        clientX.generateKeys({ overwrite: true })
        console.log(server.publicKey === clientX.publicKey) // false
        const clientXAsPeer = clientX.createPeer({
            allowedIps: [('10.13.13.'.concat(host)).concat('/32\n')]
        })
    
        // you can add a peer to a config like this:
        server.addPeer(clientXAsPeer)
        

        // or you make two WgConfigs peers of each other like this:
        /*createPeerPairs([{
            config: server,
            // The peer settings to apply when adding this config as a peer
            peerSettings: {
                allowedIps: ['10.13.13.1'],
                preSharedKey: server.preSharedKey
            }},{
            config: clientX,
            peerSettings: {
                allowedIps: [('10.13.13.'.concat(host)).concat('32')]
            }
        }])
    }
    await server.writeToFile()
    await server.up()
    await server.restart()
    await server.down()
    console.log('files written')
    */
  } catch (e) {
    console.error(e)
  }

}









// GET server info {PublicKey, AllowedIPs, Endpoint, PersistentKeepAlive}
app.get('/server/', asyncHandler(async (req: Request, res: Response) => {
    //let srv_info = await getServerConfig()
    //let srv_pubkey = srv_info.publicKey!
    //let srv_ip = srv_info.wgInterface.address!.toString() // 10.13.13.1/24
        //let srv_listenport = srv_info.wgInterface.listenPort!.toString()
        //let srv_endpoin = (process.env.SERVER_IP!).concat(':'.toString()).concat(srv_listenport)
        //let srv_allowedips = process.env.SERVER_NETWORK!
    //const srv_endpoint = (process.env.SERVER_IP!).concat(':'.toString()).concat(process.env.SERVER_PORT!)
    var srv_data = {
        //ListenPort: srv_info.wgInterface.listenPort,
        //Address: srv_ip,
        //PublicKey: srv_pubkey,
        //Endpoint: srv_endpoint
    };
    //return res.send( srv_data )
    const free_ip = await getAvailableIp()
    
    return res.send( free_ip )                  //10.13.13.8

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

