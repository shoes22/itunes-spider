const chartableContorller = require('./chartable');
const path = require('path');
const parseLinkHeader = require('parse-link-header');
const models = require('../models');

const home = (req, res) => {
  // find all
  res.sendFile(path.join(__dirname, '../views/index.html'));
}

const websub = async (req, res) => {
  console.log(req.query);
  if (req.query['hub.challenge']) {
    const mongo = req.app.get('mongo');
    let expiryTime = 0;
    if (req.query['hub.lease_seconds']) {
      const leaseMilliseconds = req.query['hub.lease_seconds'] * 1000;
      expiryTime = parseInt((Date.now() + leaseMilliseconds - 10800000) / 1000); //Get UNIX timestamp of expiry time, minus 3 hours.
    }
    await mongo.findAndUpdateWebSubSubscription(req.query['hub.topic'], expiryTime);
    //await mongo.findPodcast(req.query['hub.topic'])
    res.send(req.query['hub.challenge']);
  } else if (req.header('link')) {
    const mongo = req.app.get('mongo');
    const parsedLinkHeader = parseLinkHeader(req.header('link'));
    console.log(parsedLinkHeader);
    if (parsedLinkHeader?.self?.url) {
      await mongo.findAndUpdateWebSubPodcast(parsedLinkHeader.self.url)
    }
    res.send('Link received Successfully!');
  } else {
    res.send('ERROR: No valid challenge.');
  }
}

const checkAndUpdateFeed = async (req, res) => {
  const results = await models.ingest.checkSingleFeed(req.body.url);
  const hasUpdate = results ? false : true;
  res.send(hasUpdate);
}

module.exports = {
  chartable: chartableContorller,
  home,
  websub,
  checkAndUpdateFeed
}
