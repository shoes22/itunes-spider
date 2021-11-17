const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb+srv://developer:acc3ss153asy@cluster0.anfix.mongodb.net/test?authSource=admin&ssl=true';

class mongo {
  constructor() {
      this.client = new MongoClient(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      this.database = null;
      this.collection = null;
  }

  async connect(collectionName) {
    await this.client.connect();
    this.database = this.client.db('podopolo');
    this.collection = this.database.collection(collectionName);
  }

  async findPodcast(url) {
    const query = { url: url };
    const options = {
      // sort matched documents in descending order by rating
      projection: { _id: 1, id: 1 },
    };
    return await this.collection.findOne(query, options);
  }

  async findAndUpdateWebSubSubscription(url, expiryTime) {
    const query = { 'pubsub.self': url };
    const options = {
      // sort matched documents in descending order by rating
      projection: { _id: 1, id: 1 },
    };
    const update = { hasRealtimeUpdates: true};
    if (expiryTime) {
      update['webSubExpiryTime'] = expiryTime;
    }
    return await this.collection.updateMany(query, {$set: update}, options);
  }

  async findAndUpdateWebSubPodcast(url) {
    const query = { 'pubsub.self': url };
    const options = {
      // sort matched documents in descending order by rating
      projection: { _id: 1, id: 1 },
    };
    const update = { hasRealtimeUpdates: true, pullNow: 1, updateType: "websub" };
    return await this.collection.updateMany(query, {$set: update}, options);
  }

  async findPodcastByChartableUrl(url) {
    const query = { 'award.chartableUrl': url };
    const options = {
      // sort matched documents in descending order by rating
      projection: { id: 1, url: 1, itunesId: 1 },
    };
    return await this.collection.findOne(query, options);
  }

  async findAndUpdatePodcast(url, chartableUrl, key, catRanks, isNew, iTunesId, shouldPullNow) {
    let query = { url: url };
    const data = Object.fromEntries(catRanks);
    const actKey = 'award.' + key;
    const update = {[actKey]: data, 'award.chartableUrl': chartableUrl};
    //const update = {[actKey]: data, 'award.chartableUrl': chartableUrl, pullNow: 1};
    //const update = {'award.chartableUrl': chartableUrl};
    if (isNew) {
      update['award.isNew'] = true;
    }
    if (iTunesId) {
      update['itunesId'] = parseInt(iTunesId);
    }
    if (shouldPullNow) {
      update['pullNow'] = 1;
      update['updateType'] = 'awardUpdate';
    }
    const options = {
      // sort matched documents in descending order by rating
      projection: { _id: 1, id: 1 },
    };
    const returnOne = await this.collection.findOneAndUpdate(query, {$set: update}, options);

    if (returnOne.value || !iTunesId) {
      return returnOne;
    } else if (url){
      query = {itunesId: parseInt(iTunesId)};
      update['url'] = url;
      return await this.collection.findOneAndUpdate(query, {$set: update}, options);
    } else {
      return returnOne;
    }
  }

  async disconnect() {
    await this.client.close();
  }

}

module.exports = mongo;
