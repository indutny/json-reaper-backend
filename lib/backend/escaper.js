'use strict';

const SEQ_FF = Buffer.from('ffff', 'hex');
const SEQ_ZERO = Buffer.from('fffe', 'hex');

const FF = Buffer.from('ff', 'hex');
const ZERO = Buffer.from('00', 'hex');

function Escaper() {
}
module.exports = Escaper;

Escaper.prototype.escape = function escape(buf) {
  const parts = [];

  let last = 0;

  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x00) {
      parts.push(buf.slice(last, i), SEQ_ZERO);
      last = i + 1;
    } else if (buf[i] === 0xff) {
      parts.push(buf.slice(last, i), SEQ_FF);
      last = i + 1;
    }
  }

  if (last !== buf.length)
    parts.push(buf.slice(last));
  parts.push(ZERO);

  return parts;
};


Escaper.prototype.unescape = function unescape(buf) {
  const chunks = [];
  let last = 0;
  for (let i = 0; i < buf.length - 1; i++) {
    const c = buf[i];
    if (c !== 0xff)
      continue;

    chunks.push(buf.slice(last, i));
    last = i + 2;

    const n = buf[i + 1];
    if (n === 0xff)
      chunks.push(FF);
    else if (n === 0xfe)
      chunks.push(ZERO);
  }

  if (last !== buf.length)
    chunks.push(buf.slice(last));

  return chunks;
};
