import AWS from 'aws-sdk'
import { readStateMachineDefinition, StateMachineHelper } from './helper'

const stepFunctions = new AWS.StepFunctions({
  endpoint: 'http://step-functions:8083',
  accessKeyId: 'AKIAXTTRUF7NU7KDMIED',
  secretAccessKey: 'S88RXnp5BHLsysrsiaHwbOnW2wd9EAxmo4sGWhab',
  region: 'local',
})
const helper = new StateMachineHelper(stepFunctions)
const dummyArn = 'arn:aws:lambda:::function:some-function'
const machineName = 'MySampleStateMachine'

describe('state machine definition', () => {
  let definition: any
  let stateMachineArn: string
  const input = { collection: [{ index: 0 }, { index: 1 }, { index: 2 }] }

  beforeAll(async () => {
    definition = readStateMachineDefinition(
      __dirname + '/../template.yml',
      machineName,
      (definition) => {
        definition.States.GetElementCount.Resource = dummyArn
        definition.States.ProcessElement.Resource = dummyArn
        return definition
      })
  })

  beforeEach(async () => {
    stateMachineArn = await helper.createOrUpdateStateMachine(definition, machineName)
  })

  it('happy path', async () => {
    const executionHistory = await helper.runAndWait(
      stateMachineArn,
      'HappyPath',
      input,
    )
    const initCalls = executionHistory.getCallsTo('GetElementCount')
    expect(initCalls.length).toBe(1)
    expect(initCalls[0].parsedInput).toEqual({
      ...input,
      stateName: 'GetElementCount',
    })

    const processCalls = executionHistory.getCallsTo('ProcessElement')
    expect(processCalls.length).toBe(3)
    expect(processCalls[0].parsedInput).toEqual({
      ...input,
      stateName: 'ProcessElement',
      iterator: { count: 3, continue: true, index: 0 },
    })
    expect(processCalls[1].parsedInput).toEqual({
      ...input,
      stateName: 'ProcessElement',
      iterator: { count: 3, continue: true, index: 1 },
    })
    expect(processCalls[2].parsedInput).toEqual({
      ...input,
      stateName: 'ProcessElement',
      iterator: { count: 3, continue: true, index: 2 },
    })
  })

  it('empty collection', async () => {
    const executionHistory = await helper.runAndWait(
      stateMachineArn,
      'EmptyCollection',
      input,
    )
    const processCalls = executionHistory.getCallsTo('ProcessElement')
    expect(processCalls.length).toBe(0)
  })
})
