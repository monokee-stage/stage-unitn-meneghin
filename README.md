## Prerequisites
I'm assuming you are cloning this repo into your $HOME
- `cd ~`
- `git clone https://github.com/monokee-stage/stage-unitn-meneghin.git` (or ssh)
### [npm](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-20-04)
  - `sudo apt update`
  - `sudo apt install nodejs -y`
  - `node -v` Output **v10.19.0** if you are on Ubuntu 20.04
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
_________________________________________________________________________________________

## Build the .env file as follow, replaceing the fields with your data

SERVER_URL="stage-meneghin1.intranet.athesys.it"\
SERVER_IP="10.111.0.44"\
SERVER_PUBKEY="RLGHcYlX5tkkkkkkkkkkkkkkkkkkkk1QYERHUz3c="\
SERVER_PORT="41194"\
SERVER_NETWORK="10.13.13.0/24"\
SERVER_INTERFACE="10.13.13.1"\
SERVER_CONFIG="/etc/wireguard/wg0.conf"

__________________________________________________________________________________________

On one of the first rows (after import) you can edit the number of ip available
> I'm assuming the usage of:
- Subnet = 00000000
- wildcard = 11111111 
- 255 IPs available
__________________________________________________________________________________________
## Run the project
In order to run the project you must run it from a terminal with sudo permissions
- `yarn run build`
- `yarn run start`

## Into a new machine you can run the script (maybe you need sudo permissions)
`sh ~stage-unitn-meneghin/src/setup-pkg.sh`
- It install all the npm packages and build the .env file that must be customize with your server data.
- It build and start the ts files.
_________________________________________________________________________________________

## Test the API
I'm using Postman, `sudo snap install postman`
#### Get all the busy ips in your configuration
- **GET** request ad http://localhost:3000/server/all_ip/

#### Get a unique free ip in your configuration subnet
- **GET** request ad http://localhost:3000/server/all_ip/free_ip

#### Generate a client-server configuration that build wgx.conf binary file
- **PUT** request at http://localhost:3000/client/create_file

## Attention
> In order to use the library the wg.conf file MUST be a binary file, so the "touch" mode won't work with the library read-file function