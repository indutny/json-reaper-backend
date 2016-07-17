'use strict';

const zlib = require('zlib');

const Buffer = require('buffer').Buffer;

const async = require('async');

const backend = require('../backend');
const constants = backend.constants;

function Decompressor(file) {
  this.file = file;
  this.headerOffset = null;
}
module.exports = Decompressor;

const READ_CHUNK_SIZE = 16 * 1024;

Decompressor.prototype.getIndex = function getIndex(callback) {
  async.waterfall([
    callback => this.file.read(0, 10, callback),
    (header, callback) => {
      if (header.length !== 10)
        return callback(new Error('No gzip header found'));

      // TODO(indutny): validate magic?

      if ((header[3] & constants.FCOMMENT) === 0)
        return callback(new Error('No COMMENT section found in file'));

      // TODO(indutny): check for EXTRA, NAME and skip them
      this._fetchCStr(10, callback);
    }, (escaped, callback) => {
      this.headerOffset = 10 + escaped.length + 1;

      const escaper = new backend.Escaper();
      callback(null, Buffer.concat(escaper.unescape(escaped)));
    }, (compressed, callback) => {
      zlib.inflate(compressed, callback);
    }
  ], callback);
};

Decompressor.prototype._fetchCStr = function _fetchCStr(off, callback) {
  const chunks = [];

  let done = false;
  async.whilst(() => !done, (callback) => {
    this.file.read(off, READ_CHUNK_SIZE, (err, chunk) => {
      if (err)
        return callback(err);
      if (chunk.length === 0)
        return callback(new Error('Unexpected EOF'));

      let i;
      for (i = 0; i < chunk.length; i++)
        if (chunk[i] === 0)
          break;

      if (i === chunk.length) {
        chunks.push(chunk);
        callback(null);
        return;
      }

      chunks.push(chunk.slice(0, i));
      done = true;
      callback(null, Buffer.concat(chunks));
    });
  }, callback);
};
const ZLIB_HEADER = Buffer.from('789c', 'hex');

Decompressor.prototype.fetch = function fetch(start, len) {
  if (this.headerOffset === null)
    throw new Error('Call .getIndex() first');

  const input = this.file.stream(this.headerOffset + start, len);

  const res = zlib.Inflate();

  input.unshift(ZLIB_HEADER);
  input.pipe(res, { end: false });

  // Emulate end
  input.on('end', () => {
    res.flush(() => res.push(null));
  });

  return res;
};

