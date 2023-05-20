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
const { spawn } = require('child_process')
const util = require('util');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

const app: Express = express();
const port = 3000;
const num_max_ip = 10
const defaultReqIP = '10.13.13.255/32'

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

const createTempFile = async() : Promise<void> => {

    const filePath = process.env.TEMPLATE_CONFIG!
    const temp = new WgConfig({
        wgInterface: { address: ['10.13.13.255/32'] },
        filePath
    })
    temp.wgInterface.name = 'temp'
    temp.generateKeys()
    temp.writeToFile()
}

const prepareClientEnv = async ():Promise<void> => {
    const version = await checkWgIsInstalled()
    console.log(version)
    exec (`mkdir -p ${process.env.FOLDER!}temp/`)
    exec (`touch ${process.env.FOLDER!}wg0.conf`)
    createTempFile()
}

const getConfig = async (): Promise<WgConfig> => {

    const srv_conf_file = await getConfigObjectFromFile({ filePath: process.env.CONFIG!})
    let server1 = new WgConfig({
        ...srv_conf_file,
        filePath: process.env.CONFIG!
    })
    await server1.generateKeys();
    return server1;
}

const getTemplateConfig = async (): Promise<WgConfig> => {

    const template_conf_file = await getConfigObjectFromFile({ filePath: process.env.TEMPLATE_CONFIG!})
    let template = new WgConfig({
        ...template_conf_file,
        filePath: process.env.TEMPLATE_CONFIG!
    })
    await template.generateKeys();          //Forse eliminare
    return template;
}

type serverinfotype = {
    ip: string;
    port : number;
    name : string;
    filePath : string;
    peers : WgConfigPeer[];
    publicKey: string;
}

const getServerInfo = async (): Promise<serverinfotype> => {
    const srv_info = await getConfig()                                    // Parse server file config
    const srv_interface = srv_info.wgInterface                                  // obj contains wg interface settings

    // WgInterface
    // Ip
    let srv_ipStr = ""
    const srv_ipChar = Object.values(srv_interface!.address![0])
    for(let i=0; i<srv_ipChar.length; i++ ){
        srv_ipStr = srv_ipStr.concat(srv_ipChar[i])
    }

    // Listen Port Not working Rn
    const srv_listenPort = srv_info.wgInterface.listenPort!
    console.log(srv_listenPort)
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

    //filePath
    const srv_filePath = srv_info.filePath
    
    //Peers
    const srv_peers = srv_info.peers!

    // Recap
    const list_srv_info : serverinfotype = {
        ip : srv_ipStr,                                                         // SERVER: IP
        port : srv_listenPort,                                                  // SERVER: LISTEN PORT
        name : srv_nameStr,                                                     // SERVER: NAME
        filePath : srv_filePath,                                                // SERVER: FILE PATH
        peers : srv_peers,                                                      // SERVER: PEERS
        publicKey: srv_publicKeyStr                                             // SERVER: PUBLICKEY  
    }                                                                                      
    return list_srv_info
}

const getAllIpsUsed = async (server:WgConfig): Promise<string[]> => {           // Return a list whose contains all the busy ips in the range [10.13.13.1 - 10.13.13.num_max_ip (var @ r: 27)

    const srv_interface = server.wgInterface                                    // Obj contains wg interface settings
    const srv_peers = server.peers                                              // Obj contains couples of IP-Pubkey of all peers

    var ip_list : string[] = [ '10.13.13.255/32', '10.13.13.1/32' ]                                   // Maybe /32
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
    for(let i=2; i<num_peers+2; i++ ){                                          // For to build the string to be returned, Avoid 10.13.13.1 and 10.13.13..num_max_ip (var @ r: 27)
                                                                 
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
        const pool = await getAllIpsUsed(server)
        if(pool.length < num_max_ip){                
            do{                                                                 // Cicla finchè ip_func non è incluso in pool
                ip = server.wgInterface.address![0].substring(0,9)
                const random : number = getRandomIntInclusive(0,num_max_ip)
                ip =  (ip.concat(random.toString())).concat('/32')
            }while((pool.includes(ip)))
            console.log("Free IP requested: ", ip)

        } else if (pool.length == num_max_ip) {
            throw new Error('All ips are busy')
        }
        return ip.substring(0,(ip.length-3))
    } catch(e) {
        console.log(e);
    }
    return ip
}

const createServerFile = async () => {
    try {
        // Make a new CONFIG
        // const ServerfilePath = "/home/mattia/test/"
        const ServerfilePath = path.join(process.env.FOLDER!, 'wg0.conf')
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
                filePath: path.join(process.env.FOLDER!, `/client-${i}.conf`)
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

const clientRequest = async () : Promise<string> => {                               // Client side - 1

    const new_clientPath = path.join(process.env.TEMPLATE_CONFIG!)                  // Client file
    const new_client = new WgConfig({
        wgInterface: { address: ['10.13.13.255/32'] },                              // IP of template
        filePath: new_clientPath
    })
    new_client.wgInterface.name = 'new client request'                              // Edit name of template
    await new_client.generateKeys()
    await new_client.generateKeys({ overwrite: true })                              // Edit keys of template
    
    const privkey = new_client.wgInterface.privateKey!
    exec(`echo "${privkey}" > ${process.env.FOLDER!}/privatekey`)
    const pubkey = new_client.publicKey!
    exec(`echo "${pubkey}" > ${process.env.FOLDER!}/publickey`)
    //new_client.publicKey = pubkey
    await new_client.writeToFile()
    return pubkey
}

const srvCreatePeer = async (server:WgConfig, client_pubkey:string) : Promise<string> => {    // Server side
    
    const peers = server.peers!
    for(let i=0; i<peers.length; i++){
        if(client_pubkey == peers[i].publicKey){
            throw new Error(`Public key already used in another peer`)
        }
    }
    const ip = await getFreeIp(server)!
    const host = ip.substring(9,ip.length)
    const full_Ip = ip.concat('/32')
    // Write file into server config file
    const new_peer = server.createPeer({
        allowedIps: [full_Ip]
    })
    new_peer.name = `Client-${host}`
    new_peer.publicKey = client_pubkey
    try{
        server.addPeer(new_peer)
        await server.writeToFile()
        console.log("new server config after add:\n")
        console.log( (await getConfig()).peers )

        // Restart Server config
        await stopInterface(server.filePath)
        await startInterface(server.filePath)
        console.log("Exec wg command in order to show all peers")
    } catch (e) {
        console.error(e)
    }
    return full_Ip
}

const writeConfClient = async ( ip: string, pubkey: string): Promise<void> => {   // Client side - 2
    const client = await getTemplateConfig()
    const client_ip = ip
    client.publicKey! = pubkey
    console.log("IP: ", ip, "\nPublicKey:", pubkey, "\n")
    //[Interface]
    // Privatekey = ...
    client.wgInterface.listenPort = undefined
    client.wgInterface.name! = ('Client-').concat(ip.substring(9,ip.length))
    client.wgInterface.address![0] = ip.concat('/24')
    //[Peer]
    const srv_ip = (ip.substring(0,9)).concat('0/24')
    const serverAsPeer = client.createPeer({
        allowedIps: [srv_ip]
    })
    client.addPeer(serverAsPeer)
    client.peers![0].name! = "Monokee"
    client.peers![0].publicKey = process.env.PUBLICKEY!
    client.peers![0].endpoint = (process.env.SERVER_IP!).concat(`:`, (process.env.PORT!))
    //client.peers![0].allowedIps![0] = (ip.substring(0,9)).concat('0/24')
    client.peers![0].persistentKeepalive = 15 

    for(let i=1; i<client.peers!.length; i++){
        client.removePeer(client.peers![i].publicKey!)
    }

    const host = client_ip.substring(9,ip.length)
    client.filePath =  path.join(process.env.FOLDER!, `/wg0.conf`)
    await client.writeToFile()
    
    // Delete temp folder
    const folder_to_rm = (process.env.TEMPLATE_CONFIG!).substring(0,20)
    exec(`rm -rf ${folder_to_rm}`)
    
    await startInterface(client.filePath)
    console.log("Try to ping the server at '10.13.13.1'")

    exec("sh ./src/script/show_peer.sh", (error:any, stdout:any, stderr:any) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });


    const ls = spawn("ls", ["-la"]);

    
    ls.stdout.on('data', function (data:any) {
        console.log('stdout: ' + data.toString());
    });
    
    ls.stderr.on('data', function (data:any) {
        console.log('stderr: ' + data.toString());
    });
    
    ls.on('exit', function (code:any) {
        console.log('child process exited with code ' + code.toString());
    });

    //const server_ip = '10.13.13.1'
    //console.log("\n \nPing the server ", server_ip)
    //exec(`ping -c 4 ${server_ip}`)
}

const deleteClient = async (pubkey : string): Promise<WgConfig> => {
    const server = await getConfig()
    console.log("Will be deleted the client:")
    console.log(pubkey)
    console.log("from the server ", server.wgInterface!.address![0])
    try{
        const host = await getHost(pubkey)
        server.removePeer(pubkey)                                      // INPUT: null - OUTPUT: Server config file . peers
        await server.writeToFile()
        console.log("New peers list:")
        console.log(server.peers)
    } catch (e) {
        console.error(e)
    }
    return server
} 

const startInterface = async ( path:string ): Promise<void> => {
    const wg_interface = await getConfig()
    console.log("Bring UP the interface wg0")
    wg_interface.up(path)
    //exec(`wg-quick up wg0`)

    //exec(`wg`)

    //await exec(`systemctl stop wg-quick@wg0`)
    //await exec(`systemctl start wg-quick@wg0`)
    //await exec(`systemctl status wg-quick@wg0`)
}

const stopInterface = async ( path:string ): Promise<void> => {
    const wg_interface = await getConfig()
    console.log("Bring DOWN the interface wg0")
    //wg_interface.down(path)
    wg_interface.down(path)
    //exec(`wg-quick down wg0`)

    //exec(`wg`)
}

const getHost = async (pubkey : string): Promise<string> => {
    const peer = (await getConfig()).peers
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
app.get('/config', asyncHandler(async (req: Request, res: Response) => {
    const srv_config = await getConfig()
    return res.send( srv_config )
}));

//==================================================================================
//================= API - server config ============================================
app.get('/info', asyncHandler(async (req: Request, res: Response) => {
    const srv_info = await getServerInfo()
    return res.send( srv_info )
}));

//==================================================================================
//================= API - server interface =========================================
app.get('/interface', asyncHandler(async (req: Request, res: Response) => {  // Temporary bc returns private key
    const srv_config = await getConfig()                                      // INPUT: null - OUTPUT: Server config file . interface
    const srv_interface_to_send = srv_config.wgInterface                            // obj contains wg interface settings
    return res.send( srv_interface_to_send )
}));

//==================================================================================
//================= API - server peers =============================================
app.get('/peers', asyncHandler(async (req: Request, res: Response) => {
    const srv_peers = (await getConfig()).peers                               // Obj contains wg peers info 
    return res.send( srv_peers )
}));

//==================================================================================
//================= API - All Ip ===================================================
app.get('/all_ip/', asyncHandler(async (req: Request, res: Response) => {
    const ip_list_to_send = await getAllIpsUsed(await getConfig())            // List with busy IPs (string[])
    return res.send( ip_list_to_send )
}));

//==================================================================================
//================= API - Free Ip ==================================================
app.get('/free_ip', asyncHandler(async (req: Request, res: Response) => {
    const free_ip_to_send = getFreeIp(await getConfig())                      // String containing a free random IP in the server busy-ip list
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
//================= API - Client Request - 1 =======================================
app.put('/request', asyncHandler(async(req: Request, res: Response) => {
    await prepareClientEnv()
    console.log("Client Request sent correctly")

    const pubkey = {
        publickey : await clientRequest()
    }

    return res.send (pubkey)
}))

//==================================================================================
//================= API - Create peer on server ====================================
app.put('/server/', asyncHandler(async(req: Request, res: Response) => {
    const server = await getConfig()
    let data = req.body;
    const client_pubkey = data.publickey
    const ip_returned = await srvCreatePeer(server, client_pubkey)
    const new_client = {
        ip : (ip_returned).substring(0,(ip_returned.length-3)),
        publickey: client_pubkey
    }
    return res.send ( new_client )
}))

//==================================================================================
//================= API - Write Client wg config file - 2 ==========================

app.put('/create', asyncHandler(async(req: Request, res: Response) => {
    let data = req.body;
    const ip : string = data.ip
    const pubkey : string = data.publickey
    await writeConfClient(ip,pubkey)
    return res.send ("File ready in /etc/wireguard/")
}))

//==================================================================================
//================= API - Delete Client ============================================
app.delete('/server/', asyncHandler(async (req: Request, res: Response) => {
    let data = req.body;
    let host = await getHost(data.publickey)
    //host = host.substring(0,(host.length-3))
    if (host != "empty" ){
        deleteClient(data.publickey)
        return res.send ( "Client " + host + " deleted succesfully ")
    }else{
        return res.send ("No client existing with this publickey")
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