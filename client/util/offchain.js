require('dotenv').config()

const Web3 = require('web3')
const Resolver = require('truffle-resolver')
const path = require('path')

const PARITY_DEV_ADDRESS = '0x00a329c0648769a73afac7f9381e08fb43dbea72'

const parityProvider = new Web3.providers.HttpProvider(process.env.WEB3_PARITY_PROVIDER)
const parity = new Web3(parityProvider)

const resolver = new Resolver({
  // eslint-disable-next-line camelcase
  working_directory: path.resolve(__dirname, '../../'),
  // eslint-disable-next-line camelcase
  contracts_build_directory: 'build/contracts',
})

const ScryptRunner = resolver.require('ScryptRunner')
ScryptRunner.setProvider(parityProvider)
ScryptRunner.defaults({
  from: PARITY_DEV_ADDRESS,
  gas: "800000000",
})

function deployScryptRunner() {
  return new Promise((resolve, reject) => {
    parity.eth.sendTransaction({
      data: ScryptRunner.bytecode,
      from: PARITY_DEV_ADDRESS,
      gas: 5500000,
    }, (err, txhash) => {
      if (err) {
        reject(err);
      } else {
        parity.eth.getTransactionReceipt(txhash, (err, receipt) => {
          if (err) {
            reject(err);
          } else {
            resolve(ScryptRunner.at(receipt.contractAddress));
          }
        });
      }
    });
  });
}

async function scryptRunner () {
  return deployScryptRunner();
}

module.exports = {
  scryptRunner: scryptRunner,
}
