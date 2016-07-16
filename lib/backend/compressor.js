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

Compressor.prototype._lock = function _lock(label, retry) {
  if (this.locked) {
    this.queue.push(retry);
    return false;
  }

  this.locked = true;
  return true;
};

Compressor.prototype._unlock = function _unlock(label) {
  this.locked = false;

  if (this.queue.length !== 0)
    this.queue.shift()();
};

Compressor.prototype._capture = function _capture(label) {
  const start = this.offset;

  return () => {
    const end = this.offset;
    return (err, callback) => {
      callback(err, start, end - start);
    };
  };
};

Compressor.prototype.append = function append(stream, callback) {
  if (!this._lock('append', () => this.append(stream, callback)))
    return;

  const done = this._capture('append');

  const onFlush = (err) => {
    if (err)
      return stream.emit('error', err);

    const next = done();
    this._unlock('append');
    next(err, callback);
  };

  // Strings or buffers
  if (!stream.pipe) {
    this.gzip.write(stream);
    this.gzip.flush(onFlush);
    return;
  }

  stream.pipe(this.gzip, { end: false });
  stream.on('end', () => {
    this.gzip.flush(onFlush);
  });
};

Compressor.prototype.finish = function finish(header, callback) {
  if (!this._lock('finish', () => this.finish(header, callback)))
    return;

  const done = this._capture('finish');

  this.gzip.end();
  this.gzip.flush((err) => {
    const next = done();
    this._unlock('finish');

    next(err, (err) => {
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
