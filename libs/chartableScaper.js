const axios = require("axios").default;
const cheerio = require("cheerio");
const _ = require("lodash")
//const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
let Parser = require('rss-parser');
let rssParser = new Parser();
const url = 'mongodb://exander05:zuDhuc-fogbyk-4qexge@localhost:27017';
const dbName = 'podcast_data';
const mongo = require('./mongo');
const { curly, CurlSslVersionMax, CurlHttpVersion } = require('node-libcurl');
const https = require('https');
const constants = require('crypto').constants;
const tls = require('tls');

class chartableScaper {
  constructor() {
    this.url = "https://chartable.com/charts/chartable";
    this.top_url = "";
    this.csvFile = null;
    this.cookie = null;
    this.cookie2 = null;
    this.db = null;
    this.client = null;
    this.currentPageNumber = null;
    this.pageNumberLinks = [];
    this.pages = [];
    this.podcasts = [];
    this.mongo = new mongo();
    //this.top_links = ['https://chartable.com/charts/chartable/podcast-global-all-podcasts-reach'];

    /*MongoClient.connect(url, function(err, client) {
      assert.equal(null, err);
      console.log("Connected successfully to server");
    });*/
  }

  parse = async () => {
    const html = await this.fetchHtml(this.url);
    const selector = cheerio.load(html);
    const searchResults = selector("body").find("#genre-nav > .grid3-column > ul > li > a")

    // get all categories
    const links = searchResults.map((idx, el) => {
      const elementSelector = selector(el);
      const link = elementSelector.attr("href").trim();
      return link
    }).get();

    await this.mongo.connect('podcasts');
    console.log('connected to mongo!');

    for(let i = 0; i < links.length; i++){
      console.log(links[i])
      const letterLinks = await this.getCategoryAlphaLinks(links[i]); // get letters within each category
      for(let j = 0; j < letterLinks.length; j++) {
        // each letter, get page numbers
        console.log(`> ${letterLinks[j]}`)
        this.currentPageNumber = null;
        this.pageNumberLinks = [];
        await this.getPageNumberLinks(letterLinks[j]);
        let pagelinks = this.pageNumberLinks.map((item) => item.link )
        this.pages = _.uniq(pagelinks);

        for(let k = 0; k < this.pages.length; k++) {
          let pageLink = this.pages[k];
          console.log(`---> ${pageLink}`)
          await this.writeToFile(pageLink)
          //const podcasts = await this.getPodcastLinks(pageLink);
          //this.podcasts = [...this.podcasts, ...podcasts];
        }
      }
    }
    await this.mongo.disconnect();
    console.log('disconnected to mongo!');
    this.currentPageNumber = null;
    this.pageNumberLinks = [];
    this.pages = [];
    console.log('done yeah')
  }

  getCategoryName = (url, isApple) => {
    const parts = url.split('-');
    const total = parts.length - 1;
    let endState, startState;

    if (isApple) {
      startState = 1;
      endState = parts.findIndex(el => el == 'podcasts');
    } else {
      startState = 2;
      endState = parts[3] == 'podcasts' ? total - 1 : total;
    }

    let string = '';
    for (var i = startState; i < endState; i++) {
      string += parts[i];
      if ((i + 1) !== endState) {
        string += '-';
      }
    }
    return string;
  }

  parsePopularPodcasts = async (loadLinks) => {
    const links = [];
    for (let i = 0; i < loadLinks.length; i++) {
      const html = await this.fetchHtml(loadLinks[i]);
      const catName = this.getCategoryName(loadLinks[i], false);
      const selector = cheerio.load(html);
      const searchResults = selector("table").find("tr").map(function (i, el){
        const url = selector(this).children("td").eq(2).find("a.blue").attr('href');
        if (!url) {
          return null;
        }
        const rank = selector(this).children("td").eq(0).children("div").eq(0).text();
        const title = selector(this).children("td").eq(2).find("a.blue").text();
        const movement = selector(this).children("td").eq(0).children("div").eq(1).children('span').text();
        const isNew = (movement == 'NEW');
        return {rank: parseInt(rank), cat: catName, url: url, title: title, isNew: isNew};
      }).toArray();
      links.push(...searchResults);
      console.log("parsed " + loadLinks[i]);
    }

    console.log(links.length + " total links in the array.")
    const filteredLinks = _.groupBy(links, item => item.url);
    const filteredLinksArr = Object.entries(filteredLinks);
    console.log(filteredLinksArr.length + " unique links in the array.");
    //console.log(filteredLinks);
    //await this.writeToFile(filteredLinks[0], 1);

    await this.mongo.connect('podcasts');
    console.log('connected to mongo!');
    for(let i = 0; i < filteredLinksArr.length; i++) {
      await this.writeToFile(filteredLinksArr[i][0], filteredLinksArr[i][1], i + 1);
    }
    await this.mongo.disconnect();
    console.log('disconnected to mongo!');
  }

  parseApplePodcasts = async () => {
    const catLinks = [];
    const links = [];
    const html = await this.fetchHtml('https://chartable.com/charts/itunes/us');
    const selector = cheerio.load(html);
    const podcasts = selector('body').find('div.w-50-ns').eq(0).find("a.blue").each(function (i, el){
      catLinks.push(selector(this).attr('href'));
    });
    for (let i = 0; i < catLinks.length; i++) {
      let more = true;
      let url = catLinks[i];
      const catName = this.getCategoryName(url, true);
      do {
        const html2 = await this.fetchHtml(url);
        const selector2 = cheerio.load(html2);
        const searchResults = selector2("table").find("tr").map(function (i, el){
          const url2 = selector2(this).children("td").eq(2).find("a.blue").attr('href');
          if (!url2) {
            return null;
          }
          const rank = selector2(this).children("td").eq(0).children("div").eq(0).text();
          const title = selector2(this).children("td").eq(2).find("a.blue").text();
          const movement = selector2(this).children("td").eq(0).children("div").eq(1).children('span').text();
          const isNew = (movement == 'NEW');
          return {rank: parseInt(rank), cat: catName, url: url2, title: title, isNew: isNew};
        }).toArray();
        links.push(...searchResults);
        console.log("parsed " + url);
        const next = selector2('nav.pagination').find('span.next a');
        if (next.length) {
          url = 'https://chartable.com' + next.attr('href');
        } else {
          more = false;
        }
      } while (more == true);
      console.log('All ' + catName + ' links parsed!');
    }

    console.log(links.length + " total links in the array.")
    const filteredLinks = _.groupBy(links, item => item.url);
    const filteredLinksArr = Object.entries(filteredLinks);
    console.log(filteredLinksArr.length + " unique links in the array.");
    //console.log(filteredLinks);
    //await this.writeToFile(filteredLinks[0], 1);
    await this.mongo.connect('podcasts');
    console.log('connected to mongo!');
    for(let i = 0; i < filteredLinksArr.length; i++) {
      await this.writeToFile(filteredLinksArr[i][0], filteredLinksArr[i][1], i + 1);
    }
    await this.mongo.disconnect();
    console.log('disconnected to mongo!');
  }

  testUrl = async (url) => {
    return await this.fetchHtml(url);
  }

  // private methods
  writeToFile = async (url, data, num) => {
    let iTunesId, rssFeed;
    const existingResult = await this.mongo.findPodcastByChartableUrl(url);
    if (existingResult) {
      iTunesId = existingResult.itunesId;
      rssFeed = existingResult.url;
      console.log("EXISTING URL #" + num + ": " + rssFeed);
    } else {
      const html = await this.fetchHtml(url);
      const selector = cheerio.load(html);
      iTunesId = selector("body").find("div.links a.link").map(function (i, el){
        if (selector(this).text() == "Listen on Apple Podcasts") {
          const link = selector(this).attr('href').split('id');
          return link[1].split('?')[0];
        }
      })[0];
      rssFeed = selector("body").find("div.links a.link").map(function (i, el){
        if (selector(this).text() == "RSS feed") {
          return selector(this).attr('href');
        }
      })[0];
      console.log("NEW FETCHED URL #" + num + ": " + rssFeed);
    }
    const isNewColumn = data.map(x => x.isNew);
    const catRank = data.map(x => x.cat + ':' + x.rank);

    const csvData = []

    csvData.push({link: rssFeed, title: data[0].title, chartableUrl: url, catRank: catRank, isNew: isNewColumn.includes(true), itunesId: iTunesId});

    if(this.csvFile) {
      try {
        await this.csvFile.append(csvData)
      } catch(e) {
        console.log(e)
        console.log('error inserting.')
      }
    }
  }

  fixBadLink = async (url) => {
    const html = await this.fetchHtml(url);
    const selector = cheerio.load(html);
    const iTunesId = selector("body").find("div.links a.link").map(function (i, el){
      if (selector(this).text() == "Listen on Apple Podcasts") {
        const link = selector(this).attr('href').split('id');
        return link[1].split('?')[0];
      }
    })[0];
    const rssFeed = selector("body").find("div.links a.link").map(function (i, el){
      if (selector(this).text() == "RSS feed") {
        return selector(this).attr('href');
      }
    })[0];
    console.log("NEW FETCHED iTunesID #" + iTunesId + ": " + rssFeed);
    return {iTunesId: iTunesId, rssFeed: rssFeed};
  }

  getPodcastLinks = async (url) => {
    const html = await this.fetchHtml(url);

    const selector = cheerio.load(html);
    const searchResults = selector("body").find("#selectedcontent > .column > ul > li > a")
    const links = searchResults.map((idx, el) => {
      const elementSelector = selector(el);
      const link = elementSelector.attr("href").trim();
      return link
    }).get()

    const reg = new RegExp(/(.*)(\/)(id)(\d*)/);

    const podcasts = links.map((link) => {
      const parsed = reg.exec(link);
      if(parsed) {
        const id = parsed[4];
        return {link, id}
      } else {
        return {link, id: null}
      }
    })

    return podcasts.filter((podcast) => podcast.link !== null);
  }

  getCategoryAlphaLinks = async (url) => {
    const html = await this.fetchHtml(url);
    const selector = cheerio.load(html);
    const searchResults = selector("body").find("#selectedgenre > ul.alpha > li > a")
    const links = searchResults.map((idx, el) => {
      const elementSelector = selector(el);
      const link = elementSelector.attr("href").trim();
      return link
      // return selector.attr("href").trim();
    }).get()

    return links
  }

  getPageNumberLinks = async (url) => {
    try {
      const links = await this._getPageNumberLinks(url);
      this.pageNumberLinks = [...this.pageNumberLinks, ...links];
      const lastLink = links[links.length-1];
      const lastLinkPageNumber = lastLink.text;
      const lastLinkUrl = lastLink.link;
      if(lastLinkPageNumber !== this.currentPageNumber) {
        this.currentPageNumber = lastLinkPageNumber;
        await this.getPageNumberLinks(lastLinkUrl);
      } else {
        // console.log('err', url)
        return;
      }
    } catch(e) {
      console.log('err2', url)
      console.log(e)
    }

    // console.log('done')
    //return {links, lastLink, lastLinkPageNumber}
  }

  _getPageNumberLinks = async (url) => {
    const html = await this.fetchHtml(url);
    const selector = cheerio.load(html);
    const searchResults = selector("body").find("#selectedgenre > ul.paginate > li > a");

    const links = searchResults.map((idx, el) => {
      const elementSelector = selector(el);
      const link = elementSelector.attr("href").trim();
      const text = elementSelector.text().trim();
      return {text, link}
    }).get();

    if(links.length === 0) {
      // we didn't find any page numbers
      return [{text: null, link: url}]
    }

    return links.filter((x) => x.text !== 'Next' && x.text !== 'Previous');
  }

  timeout = ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  signIn = async () => {
    /*try {
      const page = await axios.get('https://chartable.com/sign_in', {
        withCredentials: true,
        honorCipherOrder: true,
        httpsAgent: new https.Agent({ keepAlive: true, ciphers: 'ALL:!EXPORT:!EXPORT40:!EXPORT56:!aNULL:!LOW:!RC4:@STRENGTH', secureOptions: constants.SSL_OP_NO_TLSv1_3}),
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,**;q=0.8',
        'Accept-Language': 'en-us',
        'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'chartable.com'
        }
      });
      console.log(page);
    } catch (e) {
      console.log(e);
      console.log(e.request.socket.getProtocol());
      console.log(e.request.socket.getSharedSigalgs());
      console.log(e.request.socket.getCipher());
    }
    return;*/
    const { statusCode, data, headers } = await curly.get('https://chartable.com/sign_in', {
      httpHeader: [
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: en-us',
        'Connection: keep-alive',
        'Host: chartable.com'
      ],
      sslCipherList: 'ALL:!EXPORT:!EXPORT40:!EXPORT56:!aNULL:!LOW:!RC4:@STRENGTH',
      sslversion: CurlSslVersionMax.TlsV1_2,
    });
    //console.log(statusCode);
    //console.log(headers);
    const selector = cheerio.load(data);
    const csrf = selector("head").find("meta[name='csrf-token']").attr('content');
    this.cookie = headers[0]['Set-Cookie'][0].split(';')[0];
    const { statusCode: postCode, data: postData, headers: postHeaders } = await curly.post('https://chartable.com/api/session/peek', {
      httpHeader: [
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: en-us',
        'Connection: keep-alive',
        'Content-Type: application/json;charset=UTF-8',
        'Host: chartable.com',
        'X-CSRF-TOKEN: ' + csrf
      ],
      postFields: JSON.stringify({ email: 'exander05@gmail.com', password: 'Zaralex7' }),
      cookie: this.cookie,
      sslCipherList: 'ALL:!EXPORT:!EXPORT40:!EXPORT56:!aNULL:!LOW:!RC4:@STRENGTH',
      sslversion: CurlSslVersionMax.TlsV1_2,
      verbose: 1
    });
    console.log(postCode);
    console.log(postData);
    /*const post = await axios.post('https://chartable.com/api/session/peek', {
      email: "exander05@gmail.com",
      password: "Zaralex7"
    }, {
      headers: { 'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      'Content-Type': 'application/json;charset=UTF-8',
      'Cookie': this.cookie,
      'X-CSRF-TOKEN': csrf
    },
     withCredentials: true
    });
    console.log(post.config);
    console.log(post.headers);
    console.log(post.data);*/
    const newCookie = postHeaders[0]['Set-Cookie'][0].split(';')[0];
    this.cookie = this.cookie + '; ' + newCookie;
  }

  fetchHtml = async url => {
    const opts = {
      httpHeader: [
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: en-us',
        'Connection: keep-alive',
        'Host: chartable.com'
      ],
      sslCipherList: 'ALL:!EXPORT:!EXPORT40:!EXPORT56:!aNULL:!LOW:!RC4:@STRENGTH',
      sslversion: CurlSslVersionMax.TlsV1_2,
    };
    /*const opts = {
      headers: { 'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36' }
    };
    if (this.cookie) {
      opts.headers['Cookie'] = this.cookie;
      opts.withCredentials = true;
    }*/
    if (this.cookie) {
      opts.cookie = this.cookie;
    }
    let oldUrl = url;
    let tryUrl = url;
    let broken = true;
    let hacked = false;
    let wait = 0;
    let attempts = 0;
    while (broken) {
      try {
        await this.timeout(wait);
        const { statusCode, data, headers } = await curly.get(encodeURI(tryUrl), opts);
        if (statusCode == 429) {
          attempts++;
          wait = 15000;
          console.error(
            `ERROR: An error occurred while trying to fetch the URL: ${url}. Waiting ${wait}ms`
          );
        } else if (statusCode == 200) {
          //console.log(headers);
          //console.log(data);
          //const { data } = await axios.get(url, opts);
          broken = false;
          return data;
        } else {
          console.log(statusCode);
        }
      } catch(error) {
        attempts++;
        console.log(url);
        console.log(error);
        //tryUrl = 'https://chartable.com/podcasts/49';
        /*if (attempts % 2 == 0) {
          if (this.cookie) {
            this.cookie2 = this.cookie;
            this.cookie = null;
          } else if (this.cookie2) {
            this.cookie = this.cookie2;
          }
        }*/
        wait = 15000;
        console.error(
          `ERROR: An unidentified error occurred while trying to fetch the URL: ${url}. Waiting ${wait}ms`
        );

      }
    }
  };

  _getInfoFromiTunesApi = async (id) => {
    const endpoint = `https://itunes.apple.com/lookup?id=${id}`;
    const { data } = await axios.get(endpoint);

    if(data.resultCount > 0) {
      const {artistName, trackName, trackCount, genreIds, genres, feedUrl, releaseDate, primaryGenreName } = data.results[0];
      console.log(`> ${trackName}`)
      const genreIdsStr = JSON.stringify(genreIds);
      const genresStr = JSON.stringify(genres);
      try {
        const feedData = await this._getInfoFromRSS(feedUrl);
        const {email, firstReleaseDate, language} = feedData;
        return {artistName, trackName, trackCount, primaryGenreName, genreIds: genreIdsStr, genres: genresStr, feedUrl, email, firstReleaseDate, language, releaseDate }
      } catch (err) {
        return {artistName, trackName, trackCount, primaryGenreName, genreIds: genreIdsStr, genres: genresStr, feedUrl, releaseDate}
      }

    }
    return null;
  }

  _getInfoFromRSS = async (feedUrl) => {
    let feed = await rssParser.parseURL(feedUrl);
    const {items, language, itunes} = feed;
    const owner = itunes.owner;
    let email = null;
    if(owner && owner.email) {
      email = owner.email;
    }
    let firstReleaseDate = null;
    if(items.length > 1) {
      firstReleaseDate = items[items.length - 1]['date']
    }

    return {email, firstReleaseDate, language}
    // console.log(feed.);
  }

}

module.exports = chartableScaper;
