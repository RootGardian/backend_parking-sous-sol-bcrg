const fs = require('fs');
const { ZipArchive } = require('archiver');
const archive = new ZipArchive({ zlib: { level: 9 } });
const output = fs.createWriteStream('test.zip');
archive.pipe(output);
archive.append('Hello', { name: 'hello.txt' });
archive.finalize();
