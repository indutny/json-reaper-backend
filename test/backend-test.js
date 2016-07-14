'use strict';

const assert = require('assert');
const PassThrough = require('stream').PassThrough;

const async = require('async');

const backend = require('../');

function File(buffer) {
  this.buffer = buffer;
}

File.prototype.read = function read(off, len, callback) {
  callback(null, this.buffer.slice(off, off + len));
};

File.prototype.stream = function stream(off, len) {
  const res = new PassThrough();
  this.read(off, len, (err, chunk) => {
    if (err)
      return res.emit('error', err);

    res.end(chunk);
  });
  return res;
};

describe('JSON Reaper backend', () => {
  it('should compress/decompress the data', (cb) => {
    const c = new backend.Compressor();

    const DATA = [ 'hello', 'big string', 'and', 'the rest' ];

    async.waterfall([
      (callback) => {
        async.map(DATA, (str, callback) => {
          const stream = new PassThrough();
          stream.end(str);

          // Test on strings too
          const input = str === 'and' ? str : stream;

          c.append(input, (err, start, length) => {
            return callback(err, { start: start, length: length });
          });
        }, callback);
      },
      (header, callback) => {
        c.finish(JSON.stringify(header), callback);
      },
      (header, callback) => {
        const chunks = [];
        c.on('data', chunk => chunks.push(chunk));
        c.on('end', () => {
          callback(null, Buffer.concat([ header ].concat(chunks)));
        });
      },
      (data, callback) => {
        const file = new File(data);

        const d = new backend.Decompressor(file);

        d.getIndex((err, index) => callback(err, d, index));
      },
      (d, index, callback) => {
        index = JSON.parse(index.toString());

        async.map(index, (range, callback) => {
          const s = d.fetch(range.start, range.length);

          let chunks = '';
          s.on('data', c => chunks += c);
          s.on('end', () => callback(null, chunks));
        }, callback);
      },
      (data, callback) => {
        assert.deepEqual(data, DATA);
        callback(null);
      }
    ], cb);
  });
});
