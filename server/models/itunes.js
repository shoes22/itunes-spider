'use strict';
const scapers = require('../../libs');
const path = require('path');

const parseAll = async () => {
  const scaper = new scapers.iTunesScaper();
  // scaper._getInfoFromiTunesApi('1069277113');

  const csvFile = new scapers.CsvFile({
    path: path.resolve(__dirname, '../../tmp/itunes.csv'),
    headers: ['id', 'link','feedUrl', 'trackName', 'author', 'trackCount', 'primaryGenreName', 'genres', 'releaseDate', 'email', 'language', 'firstReleaseDate'],
  })

  scaper.csvFile = csvFile;
  await scaper.parsePopularPodcasts()
  // await scaper.parse();
  // console.log({podcastsCount})
}

module.exports = {
  parseAll
}