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
const { exec } = require('child_process')
const util = require('util');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

const app: Express = express();
const port = 3000;
const num_max_ip = 10

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

const getServerConfig = async (): Promise<WgConfig> => {

    const srv_conf_file = await getConfigObjectFromFile({ filePath: process.env.SERVER_CONFIG!}) //filePath: process.env.SERVER_CONFIG! })
    let server1 = new WgConfig({
        ...srv_conf_file,
        filePath: process.env.SERVER_CONFIG!
    })
    await server1.generateKeys();
    return server1;
}

const getServerInfo = async (): Promise<Object> => {
    const srv_info = await getServerConfig()                                    // Parse server file config
    const srv_interface = srv_info.wgInterface                                  // obj contains wg interface settings

    // Ip
    let srv_ipStr = ""
    const srv_ipChar = Object.values(srv_interface!.address![0])
    for(let i=0; i<srv_ipChar.length; i++ ){
        srv_ipStr = srv_ipStr.concat(srv_ipChar[i])
    }
    console.log("IP: ", srv_ipStr)

    // Listen Port Not working Rn
    const srv_listenPort = srv_info.wgInterface!.listenPort!
    console.log("Port:", srv_listenPort)
    
    // Name
    let srv_nameStr = ""
    const srv_name = Object.values(srv_interface!.name!)
    for(let k=0; k<srv_name.length; k++ ){
        srv_nameStr = srv_nameStr.concat(srv_name[k])
    }

    // publicKey
    let srv_publicKeyStr = ""
    const srv_pubkey = Object.values(srv_info.publicKey!)
    for(let k=0; k<srv_pubkey.length; k++ ){
        srv_publicKeyStr = srv_publicKeyStr.concat(srv_pubkey[k])
    }
    console.log(srv_publicKeyStr)
    
    //const srv_publicKeyStr = process.env.SERVER_PUBKEY!
    // Recap
    const list_srv_info = {
        port : srv_listenPort,                                                  // SERVER: LISTEN PORT
        name : srv_nameStr,                                                     // SERVER: NAME
        ip : srv_ipStr,                                                         // SERVER: IP
        publicKey: srv_publicKeyStr                                             // SERVER: PUBLICKEY  
    }                                                                                      
    return list_srv_info
}

const getAllIpsUsed = async (server:WgConfig): Promise<string[]> => {           // Return a list whose contains all the busy ips in the range [10.13.13.1 - 10.13.13.process.env.NUM_MAX_IP]

    const srv_interface = server.wgInterface                                    // Obj contains wg interface settings
    const srv_peers = server.peers                                              // Obj contains couples of IP-Pubkey of all peers

    var ip_list : string[] = [ '10.13.13.255' ]                                   // Maybe /32
    const num_peers = Object.keys(srv_peers!).length;
    //const numInter = Object.keys(srv_interface!).length;

    // Server ip
    let srv_ipStr = ""
    const srv_ipChar = Object.values(srv_interface!.address![0])

    for(let k=0; k<srv_ipChar.length; k++ ){
        srv_ipStr = srv_ipStr.concat(srv_ipChar[k])
    }
    ip_list[ip_list.length] = srv_ipStr                                         // Start write srv ip in the first free position of the list: Should be 0

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

const getFreeIp = async (server : WgConfig): Promise<string> =>  {
    let ip = ""
    try{        
        const random : number = getRandomIntInclusive(0,num_max_ip)
        ip =  process.env.SERVER_SUBNETWORK!.concat(random.toString())
        const pool = await getAllIpsUsed(server)
        if(pool.length < num_max_ip){                
            do{                                                                 // Cicla finchè ip_func non è incluso in pool
                const randomInFunc : number = getRandomIntInclusive(0,num_max_ip)
                ip = process.env.SERVER_SUBNETWORK!.concat(randomInFunc.toString())
            }while((pool.includes(ip)))
            console.log("Free IP requested: ", ip)

        } else if (pool.length == num_max_ip) {
            throw new Error('All ips are busy') 
        }
        return ip
    } catch(e) {
        console.log(e);
    }
    return ip
}

const createServerFile = async () => {
    try {
        // Make a new CONFIG
        // const ServerfilePath = "/home/mattia/test/"
        const ServerfilePath = path.join(process.env.SERVER_FOLDER!, 'wg-server1.conf')
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
        //console.log(keypair.publicKey === server.publicKey) // true
        //console.log(keypair.preSharedKey === server.preSharedKey) // true
        //console.log(keypair.privateKey === server.wgInterface.privateKey) // true

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
                filePath: path.join(process.env.CLIENTS_FOLDER!, `/client-${i}.conf`)
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

const createClient = async (server:WgConfig) : Promise<void> => {
    
    const ip = await getFreeIp(server)!
    const host = ip.substring(9,ip.length)
    const new_clientPath = path.join(process.env.CLIENTS_FOLDER!, `/client-${host}.conf`)
    console.log("client conf file at: " + new_clientPath)

    const new_client = new WgConfig({
        ...server,
        filePath: new_clientPath
    })
    
    await new_client.generateKeys()
    //await new_client.generateKeys({ overwrite: true })
    
    // Write file into server config file
    const new_peer = server.createPeer({
        allowedIps: [ip],
    })
    new_peer.name = `Client-${host}`

    //const opt : Boolean = true
    const merging_settings = {opt : true }
    console.log(merging_settings.opt)
    try{
        server.addPeer(new_peer)
        await server.writeToFile()
        console.log("new server config after add:\n")
        console.log( (await getServerConfig()).peers )
    } catch (e) {
        console.error(e)
    }
    // Generating config file for client
    await writeConfClient(new_client, ip)
}

const deleteClient = async (pubkey : string): Promise<WgConfig> => {
    const server = await getServerConfig()
    console.log("Will be delete the client:")
    console.log(pubkey)
    console.log("from the server ", server.wgInterface!.address![0])
    try{
        const host = await getHost(pubkey)
        server.removePeer(pubkey)                                      // INPUT: null - OUTPUT: Server config file . peers
        await server.writeToFile()
        console.log("New peers list:")
        console.log(server.peers)

        exec (`rm -f ${process.env.CLIENTS_FOLDER!}/client-${host}.conf`)
        console.log(`File ${process.env.CLIENTS_FOLDER!}/client-${host}.conf deleted`)
    } catch (e) {
        console.error(e)
    }
    return server
} 

const writeConfClient = async (client : WgConfig, ip: string): Promise<void> => {
    //[Interface]
    // Privatekey = ...
    client.wgInterface.listenPort = undefined
    client.wgInterface.name! = ('Client-').concat(ip.substring(9,ip.length))
    client.wgInterface.address![0] = ip
    //[Peer]
    client.peers![0].name = "Monokee"
    client.peers![0].publicKey = process.env.SERVER_PUBKEY!
    client.peers![0].endpoint = process.env.SERVER_IP!.concat(`:`, process.env.SERVER_PORT!)
    client.peers![0].allowedIps![0] = process.env.SERVER_NETWORK!
    client.peers![0].persistentKeepalive = 15 

    for(let i=1; i<client.peers!.length; i++){
        client.removePeer(client.peers![i].publicKey!)
    }
    
    await client.writeToFile()              // Generate file /client-configs/client-n.conf
    console.log("file created")
}

const getHost = async (pubkey : string): Promise<string> => {
    const peer = (await getServerConfig()).peers
    let host : string = "empty"
    try{
        for(let i=0; i<peer!.length; i++){
            let ip = peer![i].allowedIps![0]

            if(pubkey === peer![i].publicKey){
                host = (ip).substring(9,ip.length)
                console.log("ip: ", ip, " | host: ", host)
            }else{
                throw new Error(`Not able to find a match between the pubkey provided and the hosts created`)           // Fix new Error, show error even it works correctly
            }
        }
    } catch (e) {
        console.error(e)
    }
    return host
}

const asyncHandler = (fun: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fun(req, res, next))
        .catch(next)
}


app.use(bodyParser.json())

//==================================================================================
//================= API ============================================================
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, this is a GET request from Express + TypeScript');
});

//==================================================================================
//================= API - server config ============================================
app.get('/server/', asyncHandler(async (req: Request, res: Response) => {
    const srv_config = await getServerConfig()
    return res.send( srv_config )
}));

//==================================================================================
//================= API - server config ============================================
app.get('/server/info', asyncHandler(async (req: Request, res: Response) => {
    const srv_info = await getServerInfo()
    return res.send( srv_info )
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
    const ip_list_to_send = await getAllIpsUsed(await getServerConfig())            // INPUT: null - OUTPUT: List with busy IPs (string[])
    return res.send( ip_list_to_send )
}));

//==================================================================================
//================= API - Free Ip ==================================================
app.get('/server/all_ip/free_ip/', asyncHandler(async (req: Request, res: Response) => {
    console.log("Free ip call")
    const free_ip_to_send = getFreeIp(await getServerConfig())                      // INPUT: List with busy IPs - OUTPUT: a free random IP in the list
    return res.send( (await free_ip_to_send).toString() )
}));

app.get('/client/host', asyncHandler(async (req: Request, res: Response) => {

    let data = req.body;
    const host = await getHost(data.publickey)

    if (host != "empty" ){
        const varToSend = {
            host : host
        }
        return res.send( varToSend )
    }else{
        return res.send (" no host existing with this publickey")
    }
}));

//==================================================================================
//================= API - Create Client ============================================
app.put('/client/', asyncHandler(async(req: Request, res: Response) => {
    const server = await getServerConfig()
    
    createClient(server)
    return res.send ("Client Created")
}))

//==================================================================================
//================= API - Delete Client ============================================
app.delete('/client/', asyncHandler(async (req: Request, res: Response) => {
    let data = req.body;
    const client = await getHost(data.publickey)
    if (client != "empty" ){
        deleteClient(data.publickey)
        return res.send ( "Client " + client + " deleted succesfully")
    }else{
        return res.send (" no client existing with this publickey")
    }
    
}));

//==================================================================================
//================= API - Create Server Files ======================================
app.put('/client/create_file/', asyncHandler(async (req: Request, res: Response) => {
    
    return res.send( createServerFile() )
}));

app.listen(port, () => {
    console.log(`[Server]: I am running at http://localhost:${port}`);
});

