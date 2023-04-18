## Prerequisites
- nvm
  - 
- [npm](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-20-04)
  - `sudo apt update`
  - `sudo apt install nodejs`
  - `node -v` Output **v10.19.0**
  - `sudo apt install npm`
-[nvm]()
  - `sudo apt install curl` 
  - `curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash`
  - `source ~/.bashrc `
  - `nvm install 12.22.12`
- [fs](https://www.npmjs.com/package/fs)
  - `npm i fs`
- [dot env](https://www.npmjs.com/package/dotenv)
  - `npm install dotenv --save`
- [Express](https://www.npmjs.com/package/express)
  - `npm install express`
- [Body-Parser](https://www.npmjs.com/package/body-parser)
  - `npm install body-parser`
- [Path](https://www.npmjs.com/package/path)
  - `npm install --save path`
- [yarn](https://www.npmjs.com/package/yarn)
  - `sudo npm install -g yarn`
- [typescript](https://www.npmjs.com/package/typescript)
  - `npm install typescript`
- [wireguard-tools](https://www.npmjs.com/package/wireguard-tools)
  - `npm i wireguard-tools`

- npm i --save-dev

## Run the project
In order to run the project you must run it from a terminal with sudo permissions
- `sudo -i`
- `yarn run build`
- `yarn run start`

## Test the API
I'm using Postman, `sudo snap install postman`
- **PUT** request at http://localhost:3000/client
- **GET** request ad http://localhost:3000/server
