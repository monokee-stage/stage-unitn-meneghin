cd ~/stage-unitn-meneghin
apt update && apt install nodejs -y && node -v
apt install npm -y
 
apt install curl -y && curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
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

echo 'CLIENT_URL="stage-meneghin-client.intranet.athesys.it"' >> ~/stage-unitn-meneghin/.env
echo 'SERVER_URL="stage-meneghin1.intranet.athesys.it"' >> ~/stage-unitn-meneghin/.env
echo 'SERVER_IP="10.111.0.44"' >> ~/stage-unitn-meneghin/.env
echo 'FOLDER="/etc/wireguard/"' >> ~/stage-unitn-meneghin/.env
echo 'TEMPLATE_CONFIG="/etc/wireguard/temp/wg0-temp.conf"' >> ~/stage-unitn-meneghin/.env
echo 'CONFIG="/etc/wireguard/wg0.conf"' >> ~/stage-unitn-meneghin/.env

yarn build
yarn start