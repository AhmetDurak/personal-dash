const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const buf = fs.readFileSync(process.argv[2] || '/home/ahmetdrk/Downloads/meine.deutsche-bank.de.pdf');
const parser = new PDFParse();
parser.parse(buf, { max: 2 }).then(d => {
  console.log(d.text);
});
