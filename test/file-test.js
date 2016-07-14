'use strict';

const assert = require('assert');
const path = require('path');

const async = require('async');

const backend = require('../');

describe('JSON Reaper File', () => {
  let f;
  beforeEach((cb) => {
    f = new backend.File(path.join(__dirname, 'fixtures', 'file'));
    f.open(cb);
  });
  afterEach((cb) => {
    f.close(cb);
  });

  it('should read the data', (cb) => {
    f.read(1, 10, (err, data) => {
      if (err)
        return cb(err);

      assert.equal(data.length, 4);
      assert.equal(data.toString(), 'bcd\n');
      cb(null);
    });
  });

  it('should stream the data', (cb) => {
    const s = f.stream(1, 3);

    let chunks = '';
    s.on('data', (chunk) => chunks += chunk);
    s.on('end', () => {
      assert.equal(chunks, 'bcd');
      cb(null);
    });
  });
});
