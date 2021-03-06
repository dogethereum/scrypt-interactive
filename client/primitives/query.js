
const calculateMidpoint = require('../util/math').calculateMidpoint
const getNewQueryStep = require('./getNewQueryStep')
const getSession = require('./session').getSession

const submitQuery = async (api, claim, sessionID, challenger) => {
  // @TODO: check that it is the challenger's turn, before submitting a query.
  // how: compare lastClaimantMessage and lastChallengerMessage on scryptVerifier
  // (maybe add a helper method to the contract called whoseTurnIsIt)

  // @TODO: refactor this: make sessionID available from getSession in contract
  let session = await getSession(api, sessionID)

  // if it's the first step, query for the midpoint.
  // else: compare calculated value with claimant's mid state, and query the left or right half.
  let toQueryStep, lowStep, medStep, highStep
  lowStep = session.lowStep.toNumber()
  medStep = session.medStep.toNumber()
  highStep = session.highStep.toNumber()
  console.log(`\nSession steps: ${lowStep} ${medStep} ${highStep}`)

  // mid-game: decide whether to query the left or right half of the computation.
  toQueryStep = await getNewQueryStep(api, sessionID)
  console.log(`Challenger: querying step ${toQueryStep}`)
  // submit query
  await api.query(sessionID, toQueryStep, { from: challenger })
}

const submitFirstQuery = async (api, claim, sessionID, challenger) => {
  const session = await getSession(api, sessionID)

  if (session.medHash.toString() === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    // this is the first query: simply query for the midpoint.
    const lowStep = session.lowStep.toNumber()
    const highStep = session.highStep.toNumber()
    const toQueryStep = calculateMidpoint(lowStep, highStep)
    console.log(`Challenger: querying first step ${toQueryStep}`)
    await api.query(sessionID, toQueryStep, { from: challenger })
  } else {
    throw new Error('submitFirstQuery: game is not in its first step')
  }
}

module.exports = {
  submitQuery: submitQuery,
  submitFirstQuery: submitFirstQuery,
}
