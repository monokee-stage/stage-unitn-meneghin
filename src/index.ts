import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import * as dotenv from "dotenv";
dotenv.config();

import express, {Express, Request, Response} from 'express';
var bodyParser = require('body-parser')

const app: Express = express();
var jsonParser = bodyParser.json()

const port = 3000;

app.get('/', (req: Request, res: Response)=>{
    res.send('Hello, this is Express + TypeScript');
});

// GET server info {URL ,IP, PUBLIC KEY}
app.get('/server/', (req: Request, res: Response)=>{
      res.send({
        "server": {
            "url": process.env.SERVER_URL,
            "ip": process.env.SERVER_IP,
            "pubkey": process.env.SERVER_PUBKEY
        }
    });
});

// PUT client info into variables {group, IP, pubkey} 
app.put('/client/', jsonParser, (req: Request, res: Response)=>{
    let group = req.body.group;
    let ip = "10.13.13.6" // TODO: fetch this from DB or other sources, take into account the user group
    //let pubkey = req.body.pubkey;
    let client_publickey = syncReadFile('/etc/wireguard/publickey');

    // Read PrivateKey
    const client_privatekey = syncReadFile('/etc/wireguard/privatekey');

    // Content of client's wg0.conf file
    const client_info = "[interface]\nPrivateKey = " + client_privatekey + "Address = "+ ip +"/24\n";
    const peer_info = "\n[peer]\nPublicKey = " + process.env.SERVER_PUBKEY + "\nAllowedIPs = " + process.env.SERVER_NETWORK + "\nEndpoint = "+ process.env.SERVER_IP +":" + process.env.SERVER_PORT + "\nPersistentKeepalive = 15";
    const config = client_info.concat(peer_info.toString());
    console.log(config);
    
    // Write wg0.conf
    syncWriteFile('/etc/wireguard/wg0.conf', config);



    res.send({
        "client" :{
            "ip": ip,
            "pubkey": client_publickey,
        },
        "server": {
            "url": process.env.SERVER_URL,
            "ip": process.env.SERVER_IP,
            "pubkey": process.env.SERVER_PUBKEY
        }
    });
});

function syncReadFile(filename: string) {
    const result = readFileSync(filename);
    return result;
}

function syncWriteFile(filename: string, data: any) {
    writeFileSync(filename, data, { flag: 'w' });
    const contents = readFileSync( filename);
    return contents;
}

app.listen(port, ()=> {
    console.log(`[Server]: I am running at https://localhost:${port}`);
    });