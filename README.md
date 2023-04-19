## Prerequisites

### [npm](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-20-04)
  - `sudo apt update`
  - `sudo apt install nodejs -y`
  - `node -v` Output **v10.19.0**
  - `sudo apt install npm -y`
 
### [nvm](https://tecadmin.net/how-to-install-nvm-on-ubuntu-20-04/)
  - `sudo apt install curl` 
  - `curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash`
  - `source ~/.bashrc `
  - `nvm install 12.22.12`

### [fs](https://www.npmjs.com/package/fs)
  - `npm i fs`

### [dot env](https://www.npmjs.com/package/dotenv)
  - `npm install dotenv --save`

### [Express](https://www.npmjs.com/package/express)
  - `npm install express`

### [Body-Parser](https://www.npmjs.com/package/body-parser)
  - `npm install body-parser`
 
### [Path](https://www.npmjs.com/package/path)
  - `npm install --save path`

### [yarn](https://www.npmjs.com/package/yarn)
  - `npm install -g yarn`

### [typescript](https://www.npmjs.com/package/typescript)
  - `npm install typescript`

### [wireguard-tools](https://www.npmjs.com/package/wireguard-tools)
  - `npm i wireguard-tools`

> NOTE Only if you encure in issues doing `yarn run build`
  - `npm i --save-dev`

## Build the .env file as follow, replaceing the fields with your data

SERVER_URL="stage-meneghin1.intranet.athesys.it"

SERVER_IP="10.111.0.44"

SERVER_PUBKEY="RLGHcYlX5tkkkkkkkkkkkkkkkkkkkk1QYERHUz3c="

SERVER_PORT="41194"

SERVER_NETWORK="10.13.13.0/24"

SERVER_INTERFACE="10.13.13.1"

SERVER_CONFIG="/etc/wireguard/wg0.conf"

__________________________________________________________________________________________

## Run the project
In order to run the project you must run it from a terminal with sudo permissions
- `yarn run build`
- `yarn run start`

## Test the API
I'm using Postman, `sudo snap install postman`
- **PUT** request at http://localhost:3000/client
- **GET** request ad http://localhost:3000/server
