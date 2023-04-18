## Prerequisites
- npm
- nvm
- Node 12.22.12
  - check the version with `node -v`
  - `apt install npm`
- yarn
  - `sudo npm install -g yarn`
- typescript
  - `npm install typescript`
- [wireguard-tools](https://www.npmjs.com/package/wireguard-tools)
  - `npm i wireguard-tools`

## Run the project
In order to run the project you must run it from a terminal with sudo permissions
- `sudo -i`
- `yarn run build`
- `yarn run start`

## Test the API
I'm using Postman, `sudo snap install postman`
- **PUT** request at http://localhost:3000/client
- **GET** request ad http://localhost:3000/server
