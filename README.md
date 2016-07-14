# json-reaper-backend
[![NPM version](https://badge.fury.io/js/json-reaper-backend.svg)](http://badge.fury.io/js/json-reaper-backend)
[![Build Status](https://secure.travis-ci.org/indutny/json-reaper-backend.svg)](http://travis-ci.org/indutny/json-reaper-backend)

## Why?

Just for fun!

## How?

`json-reaper-backend` uses `COMMENT` section in `gzip` file to store offsets
to the various DEFLATE chunks through the file. These chunks are completely
independent and can be decompressed on their own (because of `Z_FULL_FLUSH`).

## Installation

```bash
npm install json-reaper-backend
```

## Usage


Compression:
```js
const backend = require('json-reaper-backend');
const fs = require('fs');

const c = new backend.Compressor();

// Add data chunk
const file = fs.createReadStream('input-file');
c.append(file, (err, offset, length) => {
  // Generate header using offsets
  const index = JSON.stringify({ offset: offset, length: length });
  c.finish(index, (err, header) => {
    const out = fs.createWriteStream('output-file.gz');

    // Put header first
    out.write(header);

    // Put the headless data afterwards
    fs.createReadStream('/tmp/headless').pipe(out);
  });
});

// Write body without header to a temporary location
c.pipe(fs.createWriteStream('/tmp/headless'));
```

Decompression:
```js
const backend = require('json-reaper-backend');

const file = new backend.File('output-file.gz');
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
```

## LICENSE

This software is licensed under the MIT License.

Copyright Fedor Indutny, 2016.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.
