'use strict';

const fs = require('fs');

const Buffer = require('buffer').Buffer;

function File(path) {
  this.path = path;
  this.fd = null;
}
module.exports = File;

File.prototype.open = function open(callback) {
  fs.open(this.path, 'r', (err, fd) => {
    if (err)
      return callback(err);

    this.fd = fd;
    callback(null);
  });
};

File.prototype.close = function close(callback) {
  fs.close(this.fd, callback);
};

File.prototype.read = function read(offset, length, callback) {
  const buf = Buffer.alloc(length);
  fs.read(this.fd, buf, 0, length, offset, (err, bytesRead, buf) => {
    if (err)
      return callback(err);

    callback(null, buf.slice(0, bytesRead));
  });
};

File.prototype.stream = function stream(offset, length) {
  return fs.createReadStream(this.path, {
    fd: this.fd,
    autoClose: false,
    start: offset,
    end: offset + length - 1
  });
};
