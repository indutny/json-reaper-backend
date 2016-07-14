'use strict';

const backend = require('..');
const path = require('path');

const file = new backend.File(path.join(__dirname, 'output-file.gz'));
file.open((err) => {
  const d = new backend.Decompressor(file);

  d.getIndex((err, index) => {
    index = JSON.parse(index.toString());
    console.log(index);

    const input = d.fetch(index.offset, index.length);
    input.pipe(process.stdout);
    input.on('end', () => file.close());
  });
});
