import { Handler } from 'aws-lambda'

interface InitIteratorInput {
  stateName: "GetElementCount"
  collection: Array<any>
}

interface Iterator {
  count: number
  index: number
  continue: boolean
}

interface ProcessElementInput {
  stateName: "ProcessElement"
  collection: Array<any>
  iterator: Iterator
}

const initIterator: Handler<InitIteratorInput, Iterator> = (event, _context, callback) => {
  console.log(event);
  callback(null, {
    count: event.collection.length,
    index: 0,
    continue: event.collection.length > 0
  });
};

const processElement: Handler<ProcessElementInput, Iterator> = (event, _context, callback) => {
  const element = event.collection[event.iterator.index];
  console.log({ msg: 'Processing element', element });
  callback(null, {
    count: event.iterator.count,
    index: event.iterator.index + 1,
    continue: event.iterator.index < event.iterator.count - 1,
  });
}

export const entrypoint: Handler<InitIteratorInput | ProcessElementInput, Iterator> = (event, context, callback) => {
  switch(event.stateName) {
  case 'GetElementCount': {
    initIterator(event, context, callback)
    break
  }
  case 'ProcessElement': {
    processElement(event, context, callback)
    break
  }
  default: {
    throw new Error(`Unknown event ${event}`)
  }}
}
