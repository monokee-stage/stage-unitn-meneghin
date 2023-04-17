import * as dotenv from "dotenv";
dotenv.config();

import { readFileSync, writeFileSync } from 'fs';
import fs from 'fs'
import path from 'path'
import { WgConfig, WgConfigPeer, getConfigObjectFromFile } from 'wireguard-tools'
import express, { Express, NextFunction, Request, Response } from 'express';
var bodyParser = require('body-parser')

const app: Express = express();
var jsonParser = bodyParser.json()

const port = 3000;
//const { exec } = require('node:child_process')

const getServerConfig =  async (): Promise<WgConfig> => {
    let srv_conf_file = await getConfigObjectFromFile({ filePath: process.env.SERVER_CONFIG! })

    let server = new WgConfig({
        ...srv_conf_file,
        filePath: process.env.SERVER_CONFIG!
    })
    await server.generateKeys();
    return server;
}

const asyncHandler = (fun: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fun(req, res, next))
        .catch(next)
}

// APIs
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, this is Express + TypeScript');
});

// GET server info {URL ,IP, PUBLIC KEY}
app.get('/server/', asyncHandler(async (req: Request, res: Response) => {
    // forse non risolve, metti await
    return res.send({ getServerConfig })
}));

app.put('/client/', asyncHandler(async (req: Request, res: Response) => {

}));
/*
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