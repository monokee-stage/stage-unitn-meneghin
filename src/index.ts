import * as dotenv from "dotenv";
dotenv.config();

import { readFileSync, writeFileSync } from 'fs';
import * as fs from 'fs';
import express, { Express, NextFunction, Request, Response } from 'express';
import path from 'path'
//import { WgConfig, WgConfigPeer, getConfigObjectFromFile } from 'wireguard-tools'

import {
    WgConfig,
    WgConfigPeer,
    getConfigObjectFromFile,
    checkWgIsInstalled,
    generateKeyPair,
    generateConfigString,
    parseConfigString,
    } from 'wireguard-tools'
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

const app: Express = express();
const port = 3000;
const { exec } = require('child_process')

const asyncHandler = (fun: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fun(req, res, next))
        .catch(next)
}

const getServerConfig =  async (): Promise<WgConfig> => {
    let srv_conf_file = await getConfigObjectFromFile({ filePath: process.env.SERVER_CONFIG! })
    let server = new WgConfig({
        ...srv_conf_file,
        filePath: process.env.SERVER_CONFIG!
    })
    await server.generateKeys();
    return server;
}

const createClientConfig = async () =>{ //: Promise<string>
    if ( fs.existsSync('/etc/wireguard/')){
        console.error("ERROR: Wireguard folder already exists");
    } else {
            exec('mkdir /etc/wireguard/ && cd /etc/wireguard/', async (err : any, output : any) => {
            if (err) {
                console.error("ERROR: Folder didn't created: /etc/wireguard/\n", err)
                return output;
            }
        
        const { publicKey, privateKey, preSharedKey } = await generateKeyPair({ preSharedKey: true })       //Generate key pair
        //console.log({ publicKey, privateKey, preSharedKey })
        
        const client = generateConfigString({
            wgInterface: {
                name: 'Client test',
                address: ['10.13.13.7'],
                privateKey: privateKey
            },
            peers: [
                {
                    allowedIps: [process.env.SERVER_NETWORK!],
                    publicKey: publicKey
                }
            ]
        })
        console.log(client)
        return client
        })
        
    }
}


// GET server info {PublicKey, AllowedIPs, Endpoint, PersistentKeepAlive}
app.get('/server/', asyncHandler(async (req: Request, res: Response) => {
    let srv_info = await getServerConfig()
    let srv_pubkey = srv_info.publicKey!
    let srv_ip = srv_info.wgInterface.address!.toString() // 10.13.13.1/24
    let srv_listenport = srv_info.wgInterface.listenPort!.toString()
    let srv_endpoin = (process.env.SERVER_IP!).concat(':'.toString()).concat(srv_listenport)
    //let srv_allowedips = process.env.SERVER_NETWORK!

    var srv_data = {
        //ListenPort: srv_info.wgInterface.listenPort,
        //Address: srv_ip,
        PublicKey: srv_pubkey,
        Endpoint: srv_endpoin
    };
    return res.send( srv_data )
}));


// PUT client
app.put('/client/', asyncHandler(async (req: Request, res: Response) => {
    const version = await checkWgIsInstalled()
    console.log(version)

    let client_info = await createClientConfig()
    return res.send(client_info)
}));


// APIs
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, this is Express + TypeScript');
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