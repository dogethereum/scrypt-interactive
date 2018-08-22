
## Monitors setup

There are two monitors:

*   Defender: Defend claims made by the operator
*   Challenger: Challenges any claim with an invalid scrypt hash

These monitors use environment variables to determine how to communicate
to the ethereum network and to get the operator address.

It is better if they run in separate consoles so the variables do not overlap.

### Deployment of contracts

*   First complete the [setup](https://github.com/dogethereum/scrypt-interactive/blob/master/docs/setup.md) guide.

    Both monitors use the postgresql database to store information.

*   Deploy contracts:

    ```bash
    truffle.cmd migrate --network ganache --reset
    ```

    It should output the address of deployed contracts:

    ```bash
    SCRYPT_VERIFIER_ADDRESS=0x51799b119e53b2c8cd13b8a08c3a1b5e9c64ff9d
    CLAIM_MANAGER_ADDRESS=0x243536a9bfa1ffd72a4dab85485bb665aa6c4b78
    DOGE_RELAY_ADDRESS=0x684f1a2a551ff65d007310abe48b1f7e9b54b94c
    SCRYPT_RUNNER_ADDRESS=0xf7c0844698fa6218305cea54adcefa77165a56f5
    ```

    This addresses will be used by the monitors.

*   Run parity node, required for offchain computation.

    ```bash
    npm run parity
    ```

     You might have to edit its path in package.json if it is not in the `PATH`.

     Parity is used to run the scrypt hash verification offchain.

### Setting environment

These environment variables are required and need to be keep updated

Provider connected to the network:
```bash
set WEB3_HTTP_PROVIDER=http://localhost:8545
```

Parity's provider (required for offchain computations):
```bash
set WEB3_PARITY_PROVIDER=http://localhost:4242
```

Deployed contract addresses:
```bash
set SCRYPT_VERIFIER_ADDRESS=0x51799b119e53b2c8cd13b8a08c3a1b5e9c64ff9d
set CLAIM_MANAGER_ADDRESS=0x243536a9bfa1ffd72a4dab85485bb665aa6c4b78
set DOGE_RELAY_ADDRESS=0x684f1a2a551ff65d007310abe48b1f7e9b54b94c
set SCRYPT_RUNNER_ADDRESS=0xf7c0844698fa6218305cea54adcefa77165a56f5
```

These addresses are displayed by the migration script on deployment.

Operator address, monitors will use this address to send transactions:
```bash
set OPERATOR_ADDRESS=0x5745cf9ea9710f7c65254c1e2605eeff403b474c
```

### Launch

You have to make a deposit of ether in the contract:
```bash
node cli.js deposit 10
```

This will deposit 10 ethers, your operator address has to have enough balance.

This command uses the operator address to deposit ether. This action
have to be done separately for the challenger and the defender if they
use different accounts.

#### Defender

To launch the defender:
```bash
node cli.js defend
```

The defender will start listening for claims from the operator address and
reply to any challenge. If there's no challenge or all the challenges
have been resolved it will try to get the claim marked as successful.

#### Challenger

To launch the challenger
```bash
node cli.js monitor
```

The challenger will start listening for any claims and verify if the
scrypt hash is valid, and will start the challenge to any invalid claim.
If the claimant fails to respond in time it will call timeout to have
the challenge resolved as abandoned.
