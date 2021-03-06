const timeout = require('../util/timeout')
const events = require('../util/events')
const StepResponse = require('../db/models').StepResponse

const HEX_ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000'

module.exports = async (cmd, api, claim) => {
  cmd.log(`Waiting to defend claim ${claim.id}`)

  const computeStep = require('./computeStep')
  const claimantConvictedEvent = api.scryptVerifier.ClaimantConvicted({ claimant: claim.claimant })
  const queryEvent = api.scryptVerifier.NewQuery({ claimant: claim.claimant })

  try {
    await Promise.race([

      // @TODO(shrugs) - fix this
      // if claimant loses the verification game
      new Promise((resolve, reject) => {
        claimantConvictedEvent.watch(async (err, result) => {
          cmd.log('We lost the game :(')
          if (err) { return reject(err) }
          resolve(result)
        })
      }),

      // resolves when the claim is ready (i.e. the game is over.
      // expected to resolve all times besides losing
      new Promise(async (resolve, reject) => {
        try {
          let ready = false
          while (!ready) {
            await timeout(2000)
            ready = await api.claimManager.getClaimReady(claim.claimID)
          }
          await api.claimManager.checkClaimSuccessful(claim.claimID, { from: claim.claimant })
          let [decided, invalid] = await api.claimManager.getClaimStatus(claim.claimID)
          if (decided && invalid) {
            // We lost
            reject(new Error('Session already decided'))
            return
          }
          cmd.log('The claim was successful!')
          resolve()
        } catch (error) {
          let [decided, invalid] = await api.claimManager.getClaimStatus(claim.claimID)
          if (decided && !invalid) {
            // We won!
            cmd.log('The claim was successful!')
            resolve()
            return
          }
          cmd.log('Error while resolving defense. The claim didn\'t end in the state we expected.')
          return reject(error)
        }
      }),

      // respond to Query calls by challengers
      // this never resolves.
      new Promise(async (resolve, reject) => {
        try {
          let stepResponse

          queryEvent.watch(async (err, event) => {
            if (err) { return reject(err) }
            try {
              let sessionId = event.args.sessionId.toNumber()
              let session = await api.getSession(sessionId)

              if (session.medHash === HEX_ZERO) {
                // medHash being all 0s means: the verification game is in progress.
                cmd.log(`Defending step ${session.medStep.toNumber()}`)

                stepResponse = (await StepResponse.findOrCreate({
                  where: { claim_id: claim.id, sessionID: sessionId, step: session.medStep.toNumber() },
                }))[0]

                if (stepResponse.stateHash) {
                  // the response has been computed before.
                  // therefore: provide the same response.
                  await api.respond(
                    stepResponse.sessionID,
                    stepResponse.step,
                    stepResponse.stateHash,
                    { from: claim.claimant }
                  )
                } else {
                  // the response has never been computed before.
                  // therefore: compute it now.
                  await computeStep(cmd, api, claim, stepResponse)
                  await api.respond(
                    stepResponse.sessionID,
                    stepResponse.step,
                    stepResponse.stateHash,
                    { from: claim.claimant }
                  )
                }
              } else {
                // medHash not being all 0s means: the verification game is in its final step.
                let lowStepResponse, highStepResponse

                // get results for lowStep
                lowStepResponse = (await StepResponse.findOrCreate({
                  where: { claim_id: claim.id, sessionID: sessionId, step: session.lowStep.toNumber() },
                }))[0]

                if (!lowStepResponse.state) {
                  await computeStep(cmd, api, claim, lowStepResponse)
                }

                // get results for highStep
                highStepResponse = (await StepResponse.findOrCreate({
                  where: { claim_id: claim.id, sessionID: sessionId, step: session.highStep.toNumber() },
                }))[0]

                if (!highStepResponse.state) {
                  await computeStep(cmd, api, claim, highStepResponse)
                }

                // trigger the final-step verification on-chain.
                await api.scryptVerifier.performStepVerification(
                  sessionId,
                  claim.claimID,
                  lowStepResponse.state,
                  highStepResponse.state,
                  highStepResponse.proof,
                  api.claimManager.address,
                  { from: claim.claimant, gas: 3000000 }
                )

                await timeout(1000)
              }
            } catch (error) {
              reject(error)
            }
          })
        } catch (error) {
          cmd.log('Error while responding to Query() events.')
          reject(error)
        }
      }),

    ])
  } catch (error) {
    throw error
  } finally {
    await events.tryStopWatching(claimantConvictedEvent, 'ClaimantConvicted')
    await events.tryStopWatching(queryEvent, 'Query()')
  }
  cmd.log('Done with claim.')
}
