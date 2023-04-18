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
const { exec } = require('child_process')
//const { exec } = require('child_process');

const getServerConfig =  async (): Promise<WgConfig> => {
    let srv_conf_file = await getConfigObjectFromFile({ filePath: process.env.SERVER_CONFIG! })
    //console.log("srv_conf_file\n\n", srv_conf_file)

    let server = new WgConfig({
        ...srv_conf_file,
        filePath: process.env.SERVER_CONFIG!
    })
    await server.generateKeys();
    //console.log("Server config\n\n", server)
    return server;
}

const createClientConfig = async (): Promise<WgConfig> => {
    //let client_conf_file = await 

    if ( fs.existsSync('/etc/wireguard/')){
        console.log("ERROR: Wireguard folder already exists");
    } else {
        //exec('mkdir /etc/wireguard/ && cd /etc/wireguard/ && umask 077; wg genkey | tee privatekey | wg pubkey > publickey', (err : any, output : any) => {
        exec('mkdir /etc/wireguard/ && cd /etc/wireguard/', (err : any, output : any) => {
            if (err) {
                console.error("could create the folder /etc/wireguard/: ", err)
                return output;
            }else{
                const client = new WgConfig({
                    wgInterface: { address: ['10.13.13.7'] },
                        filePath: process.env.SERVER_CONFIG!
                    })
                  
                    // gen keys
                    //await Promise.all([
                        //server.generateKeys({ preSharedKey: true }),
                        //client.generateKeys({ preSharedKey: true })
                    //])






                console.log("Key Generated")
                return client;
            }

            
        })
    }
    
  
  // make a peer from server
  const serverAsPeer = server.createPeer({
    allowedIps: ['10.1.1.1/32'],
    preSharedKey: server.preSharedKey
  })
  
  // add that as a peer to client
  client.addPeer(serverAsPeer)
  
  // make a peer from client and add it to server
  server.addPeer(client.createPeer({
    allowedIps: ['10.10.1.1/32'],
    preSharedKey: client.preSharedKey
  }))




}


const asyncHandler = (fun: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fun(req, res, next))
        .catch(next)
}

// APIs
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, this is Express + TypeScript');
});


// GET server info {PublicKey, AllowedIPs, Endpoint, PersistentKeepAlive}
app.get('/server/', asyncHandler(async (req: Request, res: Response) => {
    let srv_info = await getServerConfig()
    let srv_pubkey = srv_info.publicKey!
    let srv_ip = srv_info.wgInterface.address!.toString() // 10.13.13.1/24
    //let srv_listenport = srv_info.wgInterface.listenPort!.toString()

    let srv_endpoin = (process.env.SERVER_IP!).concat(':'.toString()).concat(process.env.SERVER_PORT!) // or - Not Working - let srv_endpoin = process.env.SERVER_IP!.concat(':').concat(srv_listenport) 
    let srv_allowedips = process.env.SERVER_NETWORK!

    var srv_data = {
        //ListenPort: srv_info.wgInterface.listenPort,
        //Address: srv_ip,
        PublicKey: srv_pubkey,
        AllowedIPs: srv_allowedips,
        Endpoint: srv_endpoin,
        PersistentKeepAlive: "15"
    };
    return res.send( srv_data )
}));


// PUT client
app.put('/client/', asyncHandler(async (req: Request, res: Response) => {
    
    createClientConfig()
    return res.send("put req")
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