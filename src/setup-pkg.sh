cd ~/stage-unitn-meneghin
apt update && apt install nodejs -y && node -v
apt install npm -y
 
apt install curl && curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
source ~/.bashrc
nvm install 12.22.12 && nvm use 12.22.12

npm i fs
npm install dotenv --save
npm install express
npm install body-parser
npm install --save path
npm install -g yarn
npm install typescript
npm i wireguard-tools
npm i --save-dev

touch ~/stage-unitn-meneghin/.env

echo 'SERVER_URL="stage-meneghin1.intranet.athesys.it"' >> ~/stage-unitn-meneghin/.env
echo 'SERVER_IP="10.111.0.44"' >> ~/stage-unitn-meneghin/.env
echo 'SERVER_PUBKEY="RLGHcYlX5toih+S/xpE3yqv23yiaey/6u1QYERHUz3c=="' >> ~/stage-unitn-meneghin/.env
echo 'SERVER_PORT="41194"' >> ~/stage-unitn-meneghin/.env
echo 'SERVER_NETWORK="10.13.13.0/24"' >> ~/stage-unitn-meneghin/.env
echo 'SERVER_INTERFACE="10.13.13.1"' >> ~/stage-unitn-meneghin/.env
echo 'SERVER_CONFIG="/etc/wireguard/wg0.conf"' >> ~/stage-unitn-meneghin/.env

yarn build
yarn start