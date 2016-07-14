'use strict';

const util = require('util');
const zlib = require('zlib');

const Buffer = require('buffer').Buffer;
const PassThrough = require('stream').PassThrough;

const backend = require('../backend');
const constants = backend.constants;

function Compressor(options) {
  // `Compressor` is writable, but please consider this private
  PassThrough.call(this);

  this.options = options || {};
  this.gzip = new zlib.Gzip(this.options.gzip || {});

  this.locked = false;
  this.queue = [];

  // TODO(indutny): a way to do streaming mode instead?
  // Should API accept a file name?
  this.header = null;
  this.offset = 0;

  this.gzip.on('data', (chunk) => {
    if (this.header === null) {
      this.header = chunk.slice(0, 10);
      chunk = chunk.slice(10);
    }

    if (chunk.length === 0)
      return;

    this.offset += chunk.length;
    if (this.write(chunk))
      return;

    this.gzip.pause();
    this.once('drain', () => this.gzip.resume());
  });
}
util.inherits(Compressor, PassThrough);
module.exports = Compressor;

Compressor.prototype._lock = function _lock(retry) {
  if (this.locked) {
    this.queue.push(retry);
    return false;
  }

  this.locked = true;
  return true;
};

Compressor.prototype._unlock = function _unlock() {
  this.locked = false;

  if (this.queue.length !== 0)
    this.queue.shift()();
};

Compressor.prototype._capture = function _capture() {
  const start = this.offset;

  return (err, callback) => {
    callback(err, start, this.offset - start);
  };
};

Compressor.prototype.append = function append(stream, callback) {
  if (!this._lock(() => this.append(stream, callback)))
    return;

  const done = this._capture();

  stream.pipe(this.gzip, { end: false });
  stream.on('end', () => {
    this.gzip.flush((err) => {
      if (err)
        return stream.emit('error', err);

      this._unlock();
      done(err, callback);
    });
  });
};

Compressor.prototype.finish = function finish(header, callback) {
  if (!this._lock(() => this.finish(header, callback)))
    return;

  const done = this._capture();

  this.gzip.end();
  this.gzip.flush((err) => {
    this._unlock();

    done(err, (err) => {
      if (err)
        return callback(err);

      this._render(header, callback);
    });
  });
};

Compressor.prototype._render = function _render(index, callback) {
  this.header[3] |= constants.FCOMMENT;

  zlib.deflate(index, (err, index) => {
    if (err)
      return callback(err);

    const escaper = new backend.Escaper();
    const all = [ this.header ].concat(escaper.escape(index));
    this.push(null);
    callback(null, Buffer.concat(all));
  });
};
