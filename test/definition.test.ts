import AWS from 'aws-sdk'
import fs from 'fs'
import { yamlParse } from 'yaml-cfn'
import waitForExpect from 'wait-for-expect'

const stepFunctions = new AWS.StepFunctions({
  endpoint: 'http://step-functions:8083',
  accessKeyId: 'AKIAXTTRUF7NU7KDMIED',
  secretAccessKey: 'S88RXnp5BHLsysrsiaHwbOnW2wd9EAxmo4sGWhab',
  region: 'local',
})
const dummyArn = 'arn:aws:lambda:::function:some-function'
const machineName = 'MyStateMachine'

async function waitForExecutionToFinish (executionArn: string) {
  await waitForExpect(async () => {
    const state = await stepFunctions.describeExecution({
      executionArn: executionArn,
    }).promise()
    expect(state.status).toEqual('SUCCEEDED')
  }, 2000, 200)
}

describe('state machine definition', () => {
  let definition: any

  let stateMachineArn: string
  beforeAll(async () => {
    const templateContent = fs.readFileSync(__dirname + '/../template.yml', 'utf8')
    const parsed = yamlParse(templateContent)
    definition = parsed.Resources?.MySampleStateMachine?.Properties.Definition
    definition.States.GetElementCount.Resource = dummyArn
    definition.States.ProcessElement.Resource = dummyArn
  })

  beforeEach(async () => {
    const existingMachines = await stepFunctions.listStateMachines({}).promise()
    const needsToUpdate = existingMachines.stateMachines.find(machine => machine.name === machineName)
    if (!needsToUpdate) {
      const stateMachine = await stepFunctions.createStateMachine({
        definition: JSON.stringify(definition),
        name: machineName,
        roleArn: 'arn:aws:iam::123456789012:role/service-role/LambdaSQSIntegration',
      }).promise()
      stateMachineArn = stateMachine.stateMachineArn
    } else {
      stateMachineArn = needsToUpdate?.stateMachineArn
      await stepFunctions.updateStateMachine({
        stateMachineArn: stateMachineArn,
        definition: JSON.stringify(definition),
      }).promise()
    }
  })

  it('happy path', async () => {
    const runResponse = await stepFunctions.startExecution({
      stateMachineArn: `${stateMachineArn}#HappyPath`,
      input: JSON.stringify({ collection: [{ index: 0 }, { index: 1 }, { index: 2 }] }),
    }).promise()
    await waitForExecutionToFinish(runResponse.executionArn)
    const executionHisory = await stepFunctions.getExecutionHistory({
      executionArn: runResponse.executionArn,
    }).promise()

    const inputDetails = (expectedIndex: number) => `
Object {
  "input": "{\\"collection\\":[{\\"index\\":0},{\\"index\\":1},{\\"index\\":2}],\\"iterator\\":{\\"continue\\":true,\\"count\\":3,\\"index\\":${expectedIndex}}}",
  "inputDetails": Object {
    "truncated": false,
  },
  "name": "ProcessElement",
}
`
    expect(executionHisory.events[2].type).toEqual('LambdaFunctionScheduled')
    expect(executionHisory.events[2].lambdaFunctionScheduledEventDetails).toMatchInlineSnapshot(`
Object {
  "input": "{\\"StateName\\":\\"GetElementCount\\",\\"collection\\":[{\\"index\\":0},{\\"index\\":1},{\\"index\\":2}]}",
  "inputDetails": Object {
    "truncated": false,
  },
  "resource": "arn:aws:lambda:us-east-1:123456789012:function:some-function",
  "timeoutInSeconds": null,
}
`)
    expect(executionHisory.events[8].type).toEqual('TaskStateEntered')
    expect(executionHisory.events[8].stateEnteredEventDetails).toMatchInlineSnapshot(inputDetails(0))
    expect(executionHisory.events[17].type).toEqual('TaskStateEntered')
    expect(executionHisory.events[17].stateEnteredEventDetails).toMatchInlineSnapshot(inputDetails(1))
    expect(executionHisory.events[26].type).toEqual('TaskStateEntered')
    expect(executionHisory.events[26].stateEnteredEventDetails).toMatchInlineSnapshot(`
Object {
  "input": "{\\"collection\\":[{\\"index\\":0},{\\"index\\":1},{\\"index\\":2}],\\"iterator\\":{\\"continue\\":true,\\"count\\":3,\\"index\\":2}}",
  "inputDetails": Object {
    "truncated": false,
  },
  "name": "ProcessElement",
}
`)
  })

  it('empty collection', async () => {
    const runResponse = await stepFunctions.startExecution({
      stateMachineArn: `${stateMachineArn}#EmptyCollection`,
      input: JSON.stringify({ collection: [] }),
    }).promise()
    await waitForExecutionToFinish(runResponse.executionArn)
    const executionHisory = await stepFunctions.getExecutionHistory({
      executionArn: runResponse.executionArn,
    }).promise()
    expect(executionHisory.events.find(event => event.stateEnteredEventDetails?.name === 'ProcessElement')).toBe(undefined)
    expect(executionHisory.events.find(event => event.stateEnteredEventDetails?.name === 'WaitABit')).toBe(undefined)
  })
})
