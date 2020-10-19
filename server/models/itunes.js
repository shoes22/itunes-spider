'use strict';
const scapers = require('../../libs');
const fs = require('fs')
const path = require('path');

const parseAll = async () => {
  // determine if the file exist
  const filePath = '../../tmp/itunes.csv'
  
  try {
    fs.unlinkSync(path.resolve(__dirname, filePath))
  } catch(err) {
    //console.log(err)
  }

  fs.closeSync(fs.openSync(path.resolve(__dirname, filePath), 'w'))

  const scaper = new scapers.iTunesScaper();  
  const csvFile = new scapers.CsvFile({
    path: path.resolve(__dirname, filePath),
    headers: ['id', 'link','feedUrl', 'trackName', 'author', 'trackCount', 'primaryGenreName', 'genres', 'releaseDate', 'email', 'language', 'firstReleaseDate'],
  })

  scaper.csvFile = csvFile;
  await scaper.parsePopularPodcasts();
  
}

module.exports = {
  parseAll
}