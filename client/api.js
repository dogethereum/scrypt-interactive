const promisify = require('es6-promisify')
const BigNumber = require('bignumber.js')
const { toSession, toResult, toClaim } = require('./util/models')

module.exports = async ({ claimManager, scryptVerifier, scryptRunner, dogeRelay }, web3) => {
  const ethGetBalance = promisify(web3.eth.getBalance, web3.eth)

  return {
    web3,
    /**
     * The instances, for direct access to methods like events.
     */
    claimManager,
    scryptRunner,
    scryptVerifier,
    dogeRelay,
    /**
     * @return Claim
     */
    getClaim: async (...args) => {
      return toClaim(
        await claimManager.getClaim.call(...args)
      )
    },
    /**
     * @return BigNumber value of ether deposited
     */
    getDeposit: async (...args) => {
      return claimManager.getDeposit.call(...args)
    },
    /**
     * @desc deposit ether to the ClaimManager
     */
    makeDeposit: async (...args) => {
      return claimManager.makeDeposit(...args)
    },
    /**
     * @desc withdraw ether from the ClaimManager
     */
    withdrawDeposit: async (...args) => {
      return claimManager.withdrawDeposit(...args)
    },
    /**
     * @desc challenges the provided claim
     */
    challengeClaim: async (...args) => {
      return claimManager.challengeClaim(...args)
    },
    /**
     * This is only used for testing
     */
    createClaim: async (...args) => {
      let newArgs = args.slice(0, 3)
      newArgs.push(dogeRelay.address)
      newArgs.push(args[3])
      return claimManager.checkScrypt(...newArgs)
    },
    /**
     * @return BigNumber number of blocks that represent challenge timeout
     */
    getChallengeTimeout: async () => {
      return claimManager.defaultChallengeTimeout.call()
    },
    /**
     * @desc get the minimum deposit necessary to challenge
     * @return BigNumber minDeposit
     */
    getMinDeposit: async () => {
      return claimManager.minDeposit.call()
    },
    /**
     * @desc get the ether balance of any address
     * @param string address
     * @return BigNumber balance of the supplied addres
     */
    getBalance: async (addr) => {
      return new BigNumber(await ethGetBalance(addr))
    },
    /**
     * @desc get the session info from scryptVerifier
     * @param sessionId
     * @return Session
     */
    getSession: async (sessionId) => {
      return toSession(await scryptVerifier.getSession.call(sessionId))
    },
    /**
     * @desc get the state proof and hash from scryptRunner
     * @param input original input
     * @param step compute up to this step
     * @return Result
     */
    getResult: async (input, step) => {
      return toResult(await scryptRunner.getStateProofAndHash.call(input, step))
    },
    /**
     * @desc Claim a state for a step. Called by claimant.
     * @param sessionId
     * @param step
     * @param stateHash
     */
    respond: async (...args) => {
      return scryptVerifier.respond(...args)
    },
    /**
     * @desc challenge a claimant to prove a stateHash for a step.
     *       Caled by challenger.
     * @param sessionId
     * @param step
     */
    query: async (...args) => {
      return scryptVerifier.query(...args)
    },
    /**
     * @desc finalize the verification game by proving the final step's state
     * @param claimId
     * @param preState
     * @param postState
     * @param proof
     */
    performStepVerification: async (...args) => {
      return scryptVerifier.performStepVerification(...args)
    },
    /**
     * @desc just test the connection
     */
    testConnection: async () => {
      await claimManager
    },

    getStateProofAndHash: async (input, step) => {
      return scryptRunner.getStateProofAndHash.call(input, step)
    },
  }
}
