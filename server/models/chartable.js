'use strict';
const scapers = require('../../libs');
const fs = require('fs')
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');

const top200Links = [
  'https://chartable.com/charts/chartable/podcast-global-all-podcasts-reach',
  'https://chartable.com/charts/chartable/podcasts-global-arts-reach',
  'https://chartable.com/charts/chartable/podcasts-global-business-reach',
  'https://chartable.com/charts/chartable/podcasts-global-comedy-reach',
  'https://chartable.com/charts/chartable/podcasts-global-education-reach',
  'https://chartable.com/charts/chartable/podcasts-global-fiction-reach',
  'https://chartable.com/charts/chartable/podcasts-global-government-reach',
  'https://chartable.com/charts/chartable/podcasts-global-health-fitness-reach',
  'https://chartable.com/charts/chartable/podcasts-global-history-reach',
  'https://chartable.com/charts/chartable/podcasts-global-kids-family-reach',
  'https://chartable.com/charts/chartable/podcasts-global-leisure-reach',
  'https://chartable.com/charts/chartable/podcasts-global-music-reach',
  'https://chartable.com/charts/chartable/podcasts-global-news-reach',
  'https://chartable.com/charts/chartable/podcasts-global-religion-spirituality-reach',
  'https://chartable.com/charts/chartable/podcasts-global-science-reach',
  'https://chartable.com/charts/chartable/podcasts-global-society-culture-reach',
  'https://chartable.com/charts/chartable/podcasts-global-sports-reach',
  'https://chartable.com/charts/chartable/podcasts-global-tv-film-reach',
  'https://chartable.com/charts/chartable/podcasts-global-technology-reach',
  'https://chartable.com/charts/chartable/podcasts-global-true-crime-reach'
];

const topTrendingLinks = [
  'https://chartable.com/charts/chartable/podcasts-global-all-podcasts-trending',
  'https://chartable.com/charts/chartable/podcasts-global-arts-trending',
  'https://chartable.com/charts/chartable/podcasts-global-business-trending',
  'https://chartable.com/charts/chartable/podcasts-global-comedy-trending',
  'https://chartable.com/charts/chartable/podcasts-global-education-trending',
  'https://chartable.com/charts/chartable/podcasts-global-fiction-trending',
  'https://chartable.com/charts/chartable/podcasts-global-government-trending',
  'https://chartable.com/charts/chartable/podcasts-global-health-fitness-trending',
  'https://chartable.com/charts/chartable/podcasts-global-history-trending',
  'https://chartable.com/charts/chartable/podcasts-global-kids-family-trending',
  'https://chartable.com/charts/chartable/podcasts-global-leisure-trending',
  'https://chartable.com/charts/chartable/podcasts-global-music-trending',
  'https://chartable.com/charts/chartable/podcasts-global-news-trending',
  'https://chartable.com/charts/chartable/podcasts-global-religion-spirituality-trending',
  'https://chartable.com/charts/chartable/podcasts-global-science-trending',
  'https://chartable.com/charts/chartable/podcasts-global-society-culture-trending',
  'https://chartable.com/charts/chartable/podcasts-global-sports-trending',
  'https://chartable.com/charts/chartable/podcasts-global-tv-film-trending',
  'https://chartable.com/charts/chartable/podcasts-global-technology-trending',
  'https://chartable.com/charts/chartable/podcasts-global-true-crime-trending'
];

const findAll = async (chartType, getLeftovers) => {
  let filePath;
  switch (chartType) {
    case 1:
      filePath = getLeftovers ? '../../tmp/chartableTopLeftovers.csv' : '../../tmp/chartableTop.csv';
      break;
    case 2:
      filePath = getLeftovers ? '../../tmp/chartableTrendingLeftovers.csv' : '../../tmp/chartableTrending.csv';
      break;
    case 3:
      filePath = getLeftovers ? '../../tmp/appleLeftovers.csv' : '../../tmp/appleTop.csv';
      break;
  }

  const headers = ['link', 'title', 'chartableUrl', 'catRank', 'isNew', 'itunesId'];

  const csvFile = new scapers.CsvFile({
    path: path.resolve(__dirname, filePath),
    headers: headers,
  });
  return await csvFile.readCsv();
}

const update = async (results, chartType, shouldPullNow) => {
  let filePath, key;
  switch (chartType) {
    case 1:
      filePath = '../../tmp/chartableTopLeftovers.csv';
      key = 'top';
      break;
    case 2:
      filePath = '../../tmp/chartableTrendingLeftovers.csv';
      key = 'trending';
      break;
    case 3:
      filePath = '../../tmp/appleLeftovers.csv';
      key = 'topAppleUS';
      break;
  }

  const mongo = new scapers.mongo();
  await mongo.connect('podcasts');
  console.log('connected!');
  let count = 0;
  let total = 0;

  const headers = ['link', 'title', 'chartableUrl', 'catRank', 'isNew', 'itunesId'];

  const csvFile = new scapers.CsvFile({
    path: path.resolve(__dirname, filePath),
    headers: headers,
  });
  await csvFile.create([]);
  for (const data of results) {
    const iTunesId = (data[5] == undefined) ? null : data[5];
    const catRanks = data[3].split(',').map(element => {
      const newEl = element.split(':');
      newEl[1] = parseInt(newEl[1]);
      return newEl;
    });
    const podcast = await mongo.findAndUpdatePodcast(data[0], data[2], key, catRanks, JSON.parse(data[4]), iTunesId, shouldPullNow);
    total++;
    if (podcast.value) {
      count++;
    } else {
      console.log('#' + total + ': ' + data[1] + ' (' + data[0] + ') -' + iTunesId);
      if (data[0].length) {
        const submitResult = await submitURL(data[0], iTunesId);
        console.log(submitResult);
      } else {
        console.log("URL empty, doing nothing.");
      }
      const csvData = [];
      csvData.push(data);
      await csvFile.append(csvData);
    }
  }
  await mongo.disconnect();
  console.log('disocnnected!');
  console.log(count + ' found podcasts out of ' + results.length);
}

const fixBadLink = async (results) => {
  const filePath = '../../tmp/appleTest.csv';

  const headers = ['link', 'title', 'chartableUrl', 'catRank', 'isNew', 'itunesId'];
  const scaper = new scapers.chartableScaper();
  const csvFile = new scapers.CsvFile({
    path: path.resolve(__dirname, filePath),
    headers: headers,
  });
  await csvFile.create([]);
  await scaper.signIn();
  for (const data of results) {
    if (data[0] == "https://feeds.megaphone.fm/49") {
      const fixedData = await scaper.fixBadLink(data[2]);
      data[0] = fixedData.rssFeed;
      data[5] = fixedData.iTunesId;
    }
    const csvData = [];
    csvData.push(data);
    await csvFile.append(csvData);
  }
  console.log("Completed!");
}

const parseApple = async () => {
  const filePath = '../../tmp/appleTop.csv';
  fs.closeSync(fs.openSync(path.resolve(__dirname, filePath), 'w'))
  const scaper = new scapers.chartableScaper();
  const csvFile = new scapers.CsvFile({
    path: path.resolve(__dirname, filePath),
    headers: ['link', 'title', 'chartableUrl', 'catRank', 'isNew', 'itunesId'],
  });
  scaper.csvFile = csvFile;
  await scaper.signIn();
  await scaper.parseApplePodcasts();
}

const testUrl = async (url) => {
  const scaper = new scapers.chartableScaper();
  //await scaper.signIn();
  await scaper.testUrl(url);
}

const parseAll = async (getTop) => {
  // determine if the file exist
  const filePath = getTop ? '../../tmp/chartableTop.csv' : '../../tmp/chartableTrending.csv';

  try {
    fs.unlinkSync(path.resolve(__dirname, filePath))
  } catch(err) {
    console.log(err)
  }

  fs.closeSync(fs.openSync(path.resolve(__dirname, filePath), 'w'))

  const scaper = new scapers.chartableScaper();
  const csvFile = new scapers.CsvFile({
    path: path.resolve(__dirname, filePath),
    headers: ['link', 'title', 'chartableUrl', 'catRank', 'isNew', 'itunesId'],
  })

  scaper.csvFile = csvFile;
  await scaper.signIn();
  if (getTop) {
    await scaper.parsePopularPodcasts(top200Links);
  } else {
    await scaper.parsePopularPodcasts(topTrendingLinks);
  }
  console.log('done')

  /*try {
    const uploadFileName = `itunes-${Date.now()}.csv`
    scapers.DoUpload.upload(path.resolve(__dirname, filePath), uploadFileName, 'text/csv')
    console.log('done')
  } catch(err) {
    console.log(err);
  }*/
}

const submitURL = async (url, itunesId) => {
  const apiKey = 'GWZNQBCB6DH7QCSV5NEB';
  const apiSecret = '8weEnTPAe#2WrJJBcKAevAGRFQTsDVLn2$WSSDFz';
  const curTime = Math.floor(Date.now() / 1000);
  const authString = crypto.createHash('sha1').update(apiKey + apiSecret + curTime).digest('hex');
  const endpoint = "https://api.podcastindex.org/api/1.0/add/byfeedurl?url=" + url + "&itunesid=" + itunesId + "&pretty"
  const headers = {
    "User-Agent": "PodopoloPlayer/0.1.0",
    "X-Auth-Key": apiKey,
    "X-Auth-Date": curTime,
    "Authorization": authString
  };
  try {
    const result = await fetch(endpoint, {headers: headers});
    return result.json();
  } catch (e) {
    console.log(e);
  }
};

module.exports = {
  testUrl,
  parseAll,
  findAll,
  update,
  parseApple,
  fixBadLink,
  submitURL
}
