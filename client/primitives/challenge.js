
const {
  getSessionID,
  getSession,
} = require('./session')
const events = require('../util/events')
const submitChallenge = require('./submitChallenge')
const submitQuery = require('./query').submitQuery
const submitFirstQuery = require('./query').submitFirstQuery
const triggerVerificationGame = require('./triggerVerificationGame')
const submitFinalStepVerification = require('./submitFinalStepVerification')
const timeout = require('../util/timeout')

const responseTime = 10

const queryAfterResponses = async (api, claim, challenger) => {
  const sessionID = await getSessionID(api, claim, challenger)
  const newResponseEvent = api.scryptVerifier.NewResponse({
    sessionId: sessionID, challenger: challenger,
  })
  const challengerConvictedEvent = api.scryptVerifier.ChallengerConvicted({
    sessionId: sessionID, challenger: challenger,
  })
  const challengeResolution = () => {
    return Promise.race([
      new Promise(async (resolve, reject) => {
        try {
          // Make sure we are waiting for challenger to timeout
          let [lastClaimantMessage, lastChallengerMessage] = await api.scryptVerifier.getLastSteps(sessionID)
          while (lastClaimantMessage < lastChallengerMessage) {
            let elapsed = Date.now() - new Date(lastChallengerMessage * 1000)
            // Wait a little longer than responseTime (10% more)
            if (elapsed <= responseTime * 1000 * 1.1) {
              await timeout(responseTime * 1000 * 1.1 - elapsed)
            } else {
              break
            }
            [lastClaimantMessage, lastChallengerMessage] = await api.scryptVerifier.getLastSteps(sessionID)
          }
          if (lastClaimantMessage < lastChallengerMessage) {
            // Request challenger timeout
            await api.scryptVerifier.timeout(sessionID, claim.claimID, api.claimManager.address, { from: challenger })
          } else {
            reject(new Error('Session already decided'))
          }
          resolve()
        } catch (err) {
          console.log(`${err}`)
          reject(err)
        }
      }).then(() => {
        return new Promise(async (resolve, reject) => {
          try {
            // Wait until the challenge is over
            let ready = false
            while (!ready) {
              ready = await api.claimManager.getClaimReady(claim.claimID)
              if (!ready) {
                await timeout(2000)
              }
            }
            await api.claimManager.checkClaimSuccessful(claim.claimID, { from: challenger })
            resolve()
          } catch (err) {
            console.log(`${err}`)
            reject(err)
          }
        })
      }),
      new Promise((resolve, reject) => {
        challengerConvictedEvent.watch((err, result) => {
          console.log('We lost the game :(')
          if (err) { return reject(err) }
          resolve(result)
        })
      }),
    ])
  }

  try {
    await new Promise((resolve, reject) => {
      newResponseEvent.watch(async (err, result) => {
        if (err) { return reject(err) }
        try {
          await submitQuery(api, claim, sessionID, challenger)
          // check if we are on the final step
          const session = await getSession(api, sessionID)
          const lowStep = session.lowStep
          const highStep = session.highStep
          if (lowStep.add(1).eq(highStep)) {
            // if so: trigger final onchain verification
            // await submitFinalStepVerification(api, claim, sessionID, session, challenger)
            await challengeResolution()
            resolve()
          }
        } catch (err) {
          reject(err)
        }
      })
    })
  } catch (error) {
    throw error
  } finally {
    await events.tryStopWatching(challengerConvictedEvent, 'ChallengerConvicted')
    await events.tryStopWatching(newResponseEvent, 'NewResponse')
  }
}

module.exports = async (api, claim, challenger) => {
  const verificationGameStartedEvent = api.claimManager.VerificationGameStarted({
    claimID: claim.claimID,
    challenger: challenger,
  })

  const respondWithQueries = new Promise((resolve, reject) => {
    verificationGameStartedEvent.watch(async (err, event) => {
      try {
        if (err) { return reject(err) }
        if (event) {
          await queryAfterResponses(api, claim, challenger)
        }
      } catch (error) {
        reject(error)
      } finally {
        await events.tryStopWatching(
          verificationGameStartedEvent,
          'VerificationGameStarted'
        )
      }
      resolve()
    })
  })

  await submitChallenge(api, claim, challenger)

  await triggerVerificationGame(api, claim, challenger)

  // submit the first query; do not wait for a responseEvent.
  const sessionID = await getSessionID(api, claim, challenger)
  submitFirstQuery(api, claim, sessionID, challenger)

  await respondWithQueries
}
