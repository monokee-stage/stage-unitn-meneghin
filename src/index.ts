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
//const { exec } = require('child_process')
const util = require('util');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

const app: Express = express();
const port = 3000;
const num_max_ip = 255

let getServerConfig = async (): Promise<WgConfig> => {

    const srv_conf_file = await getConfigObjectFromFile({ filePath: process.env.SERVER_CONFIG!}) //filePath: process.env.SERVER_CONFIG! })
    let server1 = new WgConfig({
        ...srv_conf_file,
        filePath: process.env.SERVER_CONFIG!
    })
    await server1.generateKeys();
    return server1;
}

const getAllIpsUsed = async (): Promise<string[]> => {                          // Return a list whose contains all the busy ips in the range [10.13.13.1 - 10.13.13.process.env.NUM_MAX_IP]

    const srv_info = await getServerConfig()                                    // Parse server file config
    const srv_interface = srv_info.wgInterface                                  // obj contains wg interface settings
    const srv_peers = srv_info.peers                                             // obj contains couples of IP-Pubkey of all peers
    //console.log("All peers: ", srv_peers)

    var ip_list : string[] = [ '10.13.13.0' ]                                   // Maybe /32
    const num_peers = Object.keys(srv_peers!).length;
    //const numInter = Object.keys(srv_interface!).length;
    
    // Server ip
    let srv_ipStr = ""
    const srv_ipChar = Object.values(srv_interface!.address![0])

    for(let k=0; k<srv_ipChar.length; k++ ){
        srv_ipStr = srv_ipStr.concat(srv_ipChar[k])
    }
    ip_list[ip_list.length] = srv_ipStr                                         //start write srv ip in the first free position of the list: Should be 0

    const srv_status = {
        server_ip : srv_ipStr,
        number_peers: num_peers,
        number_busy_ip: (num_peers+ip_list.length),
        number_available_ips: (num_max_ip-(num_peers+ip_list.length))           // Using Subnet = 00000000, wildcard = 11111111 255 Ips available    
    };
    console.log("Server IP: ", srv_status.server_ip, "\nAvailable IPs: ", srv_status.number_available_ips)

    // List of client ips
    for(let i=2; i<num_peers+2; i++ ){                                          // For to build the string to be returned, Avoid 10.13.13.1 and 10.13.13.process.env.NUM_MAX_IP
                                                                 
        for(let j=0; j<num_peers; j++ ){
            const ipOfPeerChars = Object.values(srv_peers![j].allowedIps![0])
            let ipOfPeerStr = ""

            for(let k=0; k<ipOfPeerChars.length; k++ ){
                ipOfPeerStr = ipOfPeerStr.concat(ipOfPeerChars[k])
                
            }
            ip_list[j+2] = ipOfPeerStr
        }
    }
    console.log("Busy ip list", ip_list)
    return ip_list
}

function getFreeIp (pool : string []) {
    try{
        const random : number = getRandomIntInclusive(0,num_max_ip)
        let ip =  process.env.SERVER_SUBNETWORK!.concat(random.toString())
        
        if(pool.length < num_max_ip){                
            do{                                                             // Cicla finchè ip_func non è incluso in pool
                const randomInFunc : number = getRandomIntInclusive(0,num_max_ip)
                let ip_func = process.env.SERVER_SUBNETWORK!.concat(randomInFunc.toString())
                ip = ip_func
                
            }while((pool.includes(ip)))
            console.log("Free IP requested: ", ip)

        } else if (pool.length == num_max_ip){
            throw new Error('All ips are busy') 
        }
        return ip
    } catch(e) {                                                                // ??????????????????
        console.log(e);
    }
}

const createServerFile = async () => {
    try {
        // make a new config
        //const ServerfilePath = "/home/mattia/test/"
        const ServerfilePath = path.join('/home/mattia/test/', 'wg-server.conf')
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

    } catch (e) {
        console.error(e)
    }
}

const asyncHandler = (fun: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fun(req, res, next))
        .catch(next)
}

//==================================================================================
//================= API ============================================================
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, this is a GET request from Express + TypeScript');
});

//==================================================================================
//================= API - server config ============================================
app.get('/server/', asyncHandler(async (req: Request, res: Response) => {
    const srv_config = await getServerConfig()                                      // INPUT: null - OUTPUT: Server config file (obj contains wg settings)
    return res.send( srv_config )
}));

//==================================================================================
//================= API - server interface =========================================
app.get('/server/interface', asyncHandler(async (req: Request, res: Response) => {
    console.log("Server interface call")
    const srv_config = await getServerConfig()                                      // INPUT: null - OUTPUT: Server config file . interface
    const srv_interface_to_send = srv_config.wgInterface                            // obj contains wg interface settings
    return res.send( srv_interface_to_send )
}));

//==================================================================================
//================= API - server peers =============================================
app.get('/server/peers', asyncHandler(async (req: Request, res: Response) => {
    console.log("List peers call")
    const srv_config = await getServerConfig()                                      // INPUT: null - OUTPUT: Server config file . peers
    const srv_peers_to_send = srv_config.peers                                      // obj contains wg peers info
    return res.send( srv_peers_to_send )
}));

//==================================================================================
//================= API - All Ip ===================================================
app.get('/server/all_ip/', asyncHandler(async (req: Request, res: Response) => {
    console.log("List ip call")
    const ip_list_to_send = await getAllIpsUsed()                                   // INPUT: null - OUTPUT: List with busy IPs (string[])
    return res.send( ip_list_to_send )
}));

//==================================================================================
//================= API - Free Ip ==================================================
app.get('/server/all_ip/free_ip/', asyncHandler(async (req: Request, res: Response) => {
    console.log("Free ip call")
    const free_ip_to_send = getFreeIp(await getAllIpsUsed())                        // INPUT: List with busy IPs - OUTPUT: a free random IP in the list
    return res.send( free_ip_to_send )
}));


// PUT client
app.put('/client/create_file/', asyncHandler(async (req: Request, res: Response) => {
    
    return res.send( createServerFile() )
}));


//==================================================================================
//================= Functions ======================================================


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

function getRandomIntInclusive(min : number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
}

app.listen(port, () => {
    console.log(`[Server]: I am running at https://localhost:${port}`);
});

