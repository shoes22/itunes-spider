const fs = require('fs');
const csvParse = require('@fast-csv/parse');
const csvFormat = require('@fast-csv/format');

class CsvFile {
  static write(filestream, rows, options) {
      return new Promise((res, rej) => {
          csvFormat.writeToStream(filestream, rows, options)
              .on('error', err => rej(err))
              .on('finish', () => res());
      });
  }

  constructor(opts) {
      this.headers = opts.headers;
      this.path = opts.path;
      this.writeOpts = { headers: this.headers, includeEndRowDelimiter: true };
  }

  create(rows) {
      return CsvFile.write(fs.createWriteStream(this.path), rows, { ...this.writeOpts });
  }

  append(rows) {
      return CsvFile.write(fs.createWriteStream(this.path, { flags: 'a' }), rows, {
          ...this.writeOpts,
          // dont write the headers when appending
          writeHeaders: false,
      });
  }

  read() {
      return new Promise((res, rej) => {
          fs.readFile(this.path, (err, contents) => {
              if (err) {
                  return rej(err);
              }
              return res(contents);
          });
      });
  }

  readCsv() {
    const data = [];
    return new Promise((resolutionFunc,rejectionFunc) => {
      fs.createReadStream(this.path)
      .pipe(csvParse.parse({ignoreEmpty: true}))
      .on('error', error => rejectionFunc(error))
      .on('data', row => data.push(row))
      .on('end', rowCount => resolutionFunc(data));
    });
  }
}

module.exports = CsvFile;
