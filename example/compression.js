'use strict';

const backend = require('../');
const path = require('path');
const fs = require('fs');

const c = new backend.Compressor();

// Add data chunk
const file = fs.createReadStream(path.join(__dirname, 'input-file'));
c.append(file, (err, offset, length) => {
  // Generate header using offsets
  const index = JSON.stringify({ offset: offset, length: length });
  c.finish(index, (err, header) => {
    const out = fs.createWriteStream(path.join(__dirname, 'output-file.gz'));

    // Put header first
    out.write(header);

    // Put the headless data afterwards
    fs.createReadStream('/tmp/headless').pipe(out);
  });
});

// Write body without header to a temporary location
c.pipe(fs.createWriteStream('/tmp/headless'));
