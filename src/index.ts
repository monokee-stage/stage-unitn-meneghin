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

        // Adding peer into the interface by adding the route using snippets instead of library in order to avoid the re-start of the interface
        //wg set wg0 peer $pubkey allowed-ips $ipc
        const add = await spawn("wg", ["set", "wg0", "peer", `"${client_pubkey}"`, "allowed-ips", `${full_Ip}`], { stdio: [], shell: true });
        add.stdout.on('data', function (data:any) {
            console.log(data.toString());
        });
        add.stderr.on('data', function (data:any) {
            console.log('ERROR: ' + data.toString());
        });
        //add.on('exit', function (code:any) {
        //    console.log('Add peer process exited with code ' + code.toString());
        //});

        await addRoute(full_Ip)

        console.log("new server config after add:\n")
        console.log( (await getConfig()).peers )
        console.log("\n")
        await wg()

        /* // It Works but you need to re-start the interface
        // Restart Server config
        await stopInterface(server.filePath)
        await startInterface(server.filePath)
        */
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
    
    // Start Interface and test
    await startInterface(client.filePath)
    await enableInterface()
    await wg()
    await delay(2000)
    await pingIp("10.13.13.1")
}

const deleteClient = async (pubkey : string): Promise<WgConfig> => {
    const server = await getConfig()
    console.log("Will be deleted the client:")
    console.log(pubkey)
    console.log("from the server ", server.wgInterface!.address![0],"\n")
    try{
        const ip = await getIp(pubkey)
        
        //wg set wg0 peer $pubkey remove
        const remove = await spawn("wg", ["set", "wg0", "peer", `"${pubkey}"`, "remove"], { stdio: [], shell: true });
        remove.stdout.on('data', function (data:any) {
            console.log(data.toString());
        });
        remove.stderr.on('data', function (data:any) {
            console.log('ERROR: ' + data.toString());
        });
        //remove.on('exit', function (code:any) {
        //    console.log('remove peer process exited with code ' + code.toString());
        //});
        await deleteRoute(ip)

        console.log(pubkey)
        server.removePeer(pubkey)
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
    wg_interface.up(path)                                             // Using libraries

    await delay(1000);

    // show interface status
    const systemctl2 = spawn("systemctl", ["status","wg-quick@wg0"]);
    systemctl2.stdout.on('data', function (data:any) {
        console.log(data.toString());
    });
    systemctl2.stderr.on('data', function (data:any) {
        console.log('ERROR: ' + data.toString());
    });
    //systemctl2.on('exit', function (code:any) {
    //    console.log('systemctl status process exited with code ' + code.toString());
    //});
}

const enableInterface = async (): Promise<void> => {

    // Default enable interface at startup
    const systemctl = spawn("systemctl", ["enable","wg-quick@wg0"]);
    systemctl.stdout.on('data', function (data:any) {
        console.log(data.toString());
    });
    systemctl.stderr.on('data', function (data:any) {
        console.log('ERROR: ' + data.toString());
    });
    //systemctl.on('exit', function (code:any) {
    //    console.log('systemctl enable process exited with code ' + code.toString());
    //});

    console.log("wg0 Enable at startup")
}

const stopInterface = async ( path:string ): Promise<void> => {
    const wg_interface = await getConfig()
    wg_interface.down(path)
}

const addRoute = async ( ip:string) : Promise<void> => {
    // Execution of: ip -4 route add $ipc dev wg0
    const addDevRoute = await spawn("ip", ["-4", "route", "add", ip, "dev", "wg0"]);
    addDevRoute.stdout.on('data', function (data:any) {
        console.log(data.toString());
    });
    addDevRoute.stderr.on('data', function (data:any) {
        console.log('ERROR: ' + data.toString());
    });
    //addDevRoute.on('exit', function (code:any) {
    //    console.log('Add Route process exited with code ' + code.toString());
    //});
}

const deleteRoute = async ( ip:string) : Promise<void> => {
    // Execution of: ip -4 route delete $ipc dev wg0
    const addDevRoute = await spawn("ip", ["-4", "route", "delete", ip, "dev", "wg0"]);
    addDevRoute.stdout.on('data', function (data:any) {
        console.log(data.toString());
    });
    addDevRoute.stderr.on('data', function (data:any) {
        console.log('ERROR: ' + data.toString());
    });
    //addDevRoute.on('exit', function (code:any) {
    //    console.log('Delete Route process exited with code ' + code.toString());
    //});
}

const wg = async(): Promise<void> => {
    // Esecution of: wg
    const wg = await spawn("wg");

    wg.stdout.on('data', function (data:any) {
        console.log(data.toString());
    });
    wg.stderr.on('data', function (data:any) {
        console.log('ERROR: ' + data.toString());
    });
    //wg.on('exit', function (code:any) {
    //    console.log('wg process exited with code ' + code.toString());
    //});
}

const pingIp = async ( ip:string ): Promise<void> => {
    console.log("IP = ", ip)
    const ping = spawn("ping", ["-c", "4", ip]);
    ping.stdout.on('data', function (data:any) {
        console.log(data.toString());
    });
    ping.stderr.on('data', function (data:any) {
        console.log('ERROR: ' + data.toString());
    });
    
    ping.on('exit', function (code:any) {
        if(code == 0){
            console.log('Peer has been configure correctly')
        }else{
            console.log('ERROR: delete peer process exited with code ' + code.toString());
        }
    });

}

const getIp = async (pubkey : string): Promise<string> => {
    const peer = (await getConfig()).peers
    let ip : string = ""
    let count = 0
    try{
        for(let i=0; i<peer!.length; i++){
            let ip_temp = peer![i].allowedIps![0]

            if(pubkey === peer![i].publicKey){
                ip = ip_temp
                //console.log("ip: ", ip)
            }else{
                count = count + 1
                if(count == peer!.length){
                    throw new Error(`Not able to find a match between the pubkey provided and the ips available`) 
                }
            }
        }
    } catch (e) {
        console.error(e)
    }
    return ip
}

const getHost = async (pubkey : string): Promise<string> => {
    console.log("pubkey ", pubkey)
    const peer = (await getConfig()).peers
    console.log(peer!.length)
    let host : string = ""
    let count = 0
    try{
        for(let i=0; i<peer!.length; i++){
            let ip = peer![i].allowedIps![0]
            let publicKey = peer![i].publicKey!
            if(pubkey === peer![i].publicKey!){
                host = (ip).substring(9,(ip.length-3))
                console.log("ip: ", ip, " | host: ", host)
            }else{
                count = count + 1
                if(count == peer!.length){
                    throw new Error(`Not able to find a match between the pubkey provided and the hosts created`) 
                }
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
    const client_pubkey = data.publicKey
    const host = await getHost(client_pubkey)

    if (host != "empty" ){
        const varToSend = {
            host : host
        }
        return res.send( varToSend )
    }else{
        return res.send ("No host existing with this publickey")
    }
}));

//==================================================================================
//================= API - Client Request - 1 =======================================
app.put('/request', asyncHandler(async(req: Request, res: Response) => {
    await prepareClientEnv()
    console.log("Client Request sent correctly")

    const pubkey = {
        publicKey : await clientRequest()
    }

    return res.send (pubkey)
}))

//==================================================================================
//================= API - Create peer on server ====================================
app.put('/server/', asyncHandler(async(req: Request, res: Response) => {
    const server = await getConfig()
    let data = req.body;
    const client_pubkey = data.publicKey
    const ip_returned = await srvCreatePeer(server, client_pubkey)
    const new_client = {
        ip : (ip_returned).substring(0,(ip_returned.length-3)),
        publicKey: client_pubkey
    }
    return res.send ( new_client )
}))

//==================================================================================
//================= API - Write Client wg config file - 2 ==========================

app.put('/create', asyncHandler(async(req: Request, res: Response) => {
    let data = req.body;
    const ip : string = data.ip
    const pubkey : string = data.publicKey
    await writeConfClient(ip,pubkey)
    return res.send ("File ready in /etc/wireguard/")
}))

//==================================================================================
//================= API - Delete Client ============================================
app.delete('/server/', asyncHandler(async (req: Request, res: Response) => {
    let data = req.body;
    const pubkey:string = data.publicKey
    //const pubkey = "nxdximkvAzaR5MZOzSBkrx2DuqVkzWm1lDg3bcUJPiI="
    let host = await getHost(pubkey)
    
    //host = host.substring(0,(host.length-3))
    if (host != "empty" ){
        deleteClient(pubkey)
        return res.send ( "Client " + host + " deleted succesfully ")
    }else{
        return res.send ("No client existing with this publickey: " + host)
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