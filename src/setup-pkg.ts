const { exec } = require('child_process')

exec('cd ~/stage-unitn-meneghin')
exec('apt update && apt install nodejs -y && node -v')
exec('apt install npm -y')
 
exec('apt install curl && curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash')
exec('source ~/.bashrc')
exec('nvm install 12.22.12 && nvm use 12.22.12')

exec('npm i fs')
exec('npm install dotenv --save')
exec('npm install express')
exec('npm install body-parser')
exec('npm install --save path')
exec('npm install -g yarn')
exec('npm install typescript')
exec('npm i wireguard-tools')
exec('npm i --save-dev')

exec('touch ~/stage-unitn-meneghin/.env')

exec('SERVER_URL="stage-meneghin1.intranet.athesys.it" > ~/stage-unitn-meneghin/.env')
exec('SERVER_IP="10.111.0.44" > ~/stage-unitn-meneghin/.env')
exec('SERVER_PUBKEY="RLGHcYlX5toih+S/xpE3yqv23yiaey/6u1QYERHUz3c==" > ~/stage-unitn-meneghin/.env')
exec('SERVER_PORT="41194" > ~/stage-unitn-meneghin/.env')
exec('SERVER_NETWORK="10.13.13.0/24" > ~/stage-unitn-meneghin/.env')
exec('SERVER_INTERFACE="10.13.13.1" > ~/stage-unitn-meneghin/.env')
exec('SERVER_CONFIG="/etc/wireguard/wg0.conf" > ~/stage-unitn-meneghin/.env')

exec('yarn build')
exec('yarn start')