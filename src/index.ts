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

app.get('/server/', (req: Request, res: Response)=>{
      res.send({
        "server": {
            "url": process.env.SERVER_URL,
            "ip": process.env.SERVER_IP,
            "pubkey": process.env.SERVER_PUBKEY
        }
    });
});

app.put('/client/', jsonParser, (req: Request, res: Response)=>{
    let group = req.body.group;
    let ip = "10.0.0.2" // TODO: fetch this from DB or other sources, take into account the user group
    let pubkey = req.body.pubkey;

    // TODO: save these info in the server WG0

    res.send({
        "client" :{
            "ip": ip,
            "pubkey": pubkey,
        },
        "server": {
            "url": process.env.SERVER_URL,
            "ip": process.env.SERVER_IP,
            "pubkey": process.env.SERVER_PUBKEY
        }
    });
});

app.listen(port, ()=> {
console.log(`[Server]: I am running at https://localhost:${port}`);
});