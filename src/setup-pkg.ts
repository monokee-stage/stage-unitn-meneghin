
const { exec } = require('child_process')

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

exec('yarn build')
exec('yarn start')