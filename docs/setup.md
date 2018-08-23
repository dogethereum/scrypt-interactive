
## Setting up the client

The specific commands used to setup our Ubuntu 16.04 server can be found [here](https://github.com/TrueBitFoundation/scrypt-interactive/blob/master/bin/server_setup.sh).

More general directions follow:

```bash
# Install the latest stable release of the Parity Ethereum client.
# You can look for the binary [here](https://github.com/paritytech/parity/releases).
# Place the binary in this directory.

# For example for v1.11
wget https://releases.parity.io/v1.11.8/x86_64-unknown-linux-gnu/parity

# make sure it's executable
chmod 755 ./parity

# Initialize the parity development chain database with
# kill this after the dev db is setup (a few seconds).
./parity --chain dev --no-jsonrcp --no-ws

# Ensure you have the latest version of node installed (currently v9.4.0).

# Then install npm packages deps:
npm install
npm install -g sequelize-cli
npm install -g truffle

# run parity (kill after a few seconds)
npm run parity

# Install postgres and run it on the default port `5432`:
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# give you user the ability to execute commands as postgres user
# by giving it the right permissions in pg_hba.conf
# See setup instruction at the bottom of the page

# Bootstrap your database with:
sequelize db:create
sequelize db:migrate
NODE_ENV=test sequelize db:create
NODE_ENV=test sequelize db:migrate

# Configure your client by updating the `.env` file, as follows:
#
# export WEB3_HTTP_PROVIDER=http://localhost:8545
# export WEB3_PARITY_PROVIDER=http://localhost:4242
# export DOGE_RELAY_ADDRESS=0x0
# export SCRYPT_VERIFIER_ADDRESS=0x0
# export SCRYPT_RUNNER_ADDRESS=0x0
# export CLAIM_MANAGER_ADDRESS=0x0
```

### Setup PostgreSQL 9.5 in Ubuntu 16.04

Edit configuration file

```
sudo vim /etc/postgresql/9.5/main/pg_hba.conf
```

To end like this users postgress and ubuntu can login without password
from localhost.

```
host    all             postgres        127.0.0.1/32            trust
host    all             ubuntu          127.0.0.1/32            trust
host    all             all             127.0.0.1/32            md5
```

Restart the service

```
sudo service postgresql restart
```

Now it should be possible to create the databases

```
sequelize db:create
sequelize db:migrate
NODE_ENV=test sequelize db:create
NODE_ENV=test sequelize db:migrate
```

Make sure it is running

```
ps aux|grep postgr
```

Execute psql to grant access to the databases

```
sudo su postgres
psql
```

Create the ubuntu role and grant access to the databases

```
create role ubuntu with login;
alter database dogethereum_development owner to ubuntu;
```
