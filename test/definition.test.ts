import AWS from 'aws-sdk'
import { readStateMachineDefinition, StateMachineHelper } from './helper'

const stepFunctions = new AWS.StepFunctions({
  endpoint: 'http://step-functions:8083',
  accessKeyId: 'AKIAXTTRUF7NU7KDMIED',
  secretAccessKey: 'S88RXnp5BHLsysrsiaHwbOnW2wd9EAxmo4sGWhab',
  region: 'local',
})
const helper = new StateMachineHelper(stepFunctions)
const dummyArn = 'arn:aws:lambda:::function:StateFunctionHandler'
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

  it('happy path integration test', async () => {
    const executionHistory = await helper.runAndWait(
      stateMachineArn,
      input,
      '',
      'SUCCEEDED',
      50000,
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
  }, 60000)

  it('happy path', async () => {
    const executionHistory = await helper.runAndWait(
      stateMachineArn,
      input,
      'HappyPath',
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
      { collection: [] },
      'EmptyCollection',
    )
    const processCalls = executionHistory.getCallsTo('ProcessElement')
    expect(processCalls.length).toBe(0)
  })

  it('fails at intialization', async () => {
    const executionHistory = await helper.runAndWait(
      stateMachineArn,
      null,
      'FailsAtInit',
      'FAILED',
    )
    const processCalls = executionHistory.getCallsTo('ProcessElement')
    expect(processCalls.length).toBe(0)
  })

  it('timeouts at processing element and retries ', async () => {
    const executionHistory = await helper.runAndWait(
      stateMachineArn,
      input,
      'ProcessingFailsAndGetsRetried',
      'SUCCEEDED',
      5000,
      1000,
    )
    const processCalls = executionHistory.getCallsTo('ProcessElement')
    expect(processCalls.length).toBe(4)
    expect(processCalls[0].parsedInput).toEqual({
      ...input,
      stateName: 'ProcessElement',
      iterator: { count: 3, continue: true, index: 0 },
    })
    expect(processCalls[1].parsedInput).toEqual({
      ...input,
      stateName: 'ProcessElement',
      iterator: { count: 3, continue: true, index: 0 },
    })
  }, 10000)
})
