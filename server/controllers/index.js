const chartableContorller = require('./chartable');
const path = require('path');
const scapers = require('../../libs');
const parseLinkHeader = require('parse-link-header');

const home = (req, res) => {
  // find all
  res.sendFile(path.join(__dirname, '../views/index.html'));
}

const websub = async (req, res) => {
  console.log(req.query);
  if (req.query['hub.challenge']) {
    let expiryTime = 0;
    const mongo = new scapers.mongo();
    await mongo.connect('podcasts');
    if (req.query['hub.lease_seconds']) {
      const leaseMilliseconds = req.query['hub.lease_seconds'] * 1000;
      expiryTime = parseInt((Date.now() + leaseMilliseconds - 10800000) / 1000); //Get UNIX timestamp of expiry time, minus 3 hours.
    }
    await mongo.findAndUpdateWebSubPodcast(req.query['hub.topic'], expiryTime);
    //await mongo.findPodcast(req.query['hub.topic'])
    res.send(req.query['hub.challenge']);
  } else if (req.header('link')) {
    const parsedLinkHeader = parseLinkHeader(req.header('link'));
    console.log(parsedLinkHeader);
    if (parsedLinkHeader?.self?.url) {

    }
    res.send('Link received Successfully!');
  } else {
    res.send('ERROR: No valid challenge.');
  }
}

module.exports = {
  chartable: chartableContorller,
  home,
  websub
}
