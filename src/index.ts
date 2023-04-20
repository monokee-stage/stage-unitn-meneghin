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
    let srv_conf_file = await getConfigObjectFromFile({ filePath: "/home/mattia/test/guardline-server.conf"}) //filePath: process.env.SERVER_CONFIG! })
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
    //let srv_info = await getServerConfig()              // Parse server file config
    //const allPeersss = srv_info.peers               // couples of IP-Pubkey of all peers
    //const srv_interface = srv_info.wgInterface      // wg interface settings
    //console.log("All peers", allPeersss)

    //const list = getAllIps(srv_info)
    
    //console.log( free_ip.toString() )

    let mask = ""
    var ipF = {ip: "10.13.13.8", mask: "/24"}
    console.log(ipF)
    
    return mask                                  //must return a single free ip in the subnetwork 10.13.13.X
    
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