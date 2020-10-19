'use strict';
const scapers = require('../../libs');
const path = require('path');

const parseAll = async () => {
  const scaper = new scapers.iTunesScaper();
  const csvFile = new scapers.CsvFile({
    path: path.resolve(__dirname, '../../tmp/itunes.csv'),
    headers: ['id', 'link'],
  })

  scaper.csvFile = csvFile;
  const podcastsCount = await scaper.parse();
  console.log({podcastsCount})
}

module.exports = {
  parseAll
}