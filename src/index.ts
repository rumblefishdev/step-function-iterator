import { Handler } from 'aws-lambda'

interface InitIteratorInput {
  collection: Array<any>
}

interface Iterator {
  count: number
  index: number
  continue: boolean
}

interface ProcessElementInput extends InitIteratorInput {
  iterator: Iterator
}

export const initIterator: Handler<InitIteratorInput, Iterator> = (event, _context, callback) => {
  console.log(event);
  callback(null, {
    count: event.collection.length,
    index: 0,
    continue: event.collection.length > 0
  });
};

export const processElement: Handler<ProcessElementInput, Iterator> = (event, _context, callback) => {
  const element = event.collection[event.iterator.index];
  console.log({ msg: 'Processing element', element });
  callback(null, {
    count: event.iterator.count,
    index: event.iterator.index + 1,
    continue: event.iterator.index < event.iterator.count - 1,
  });
}
