const axios = require("axios").default;
const cheerio = require("cheerio");
const _ = require("lodash")
let Parser = require('rss-parser');
let rssParser = new Parser();

class iTunesScaper {
  constructor() {
    this.url = "https://podcasts.apple.com/us/genre/podcasts/id26";
    this.top_url = "";
    this.csvFile = null,
    this.currentPageNumber = null;
    this.pageNumberLinks = [];
    this.pages = [];
    this.podcasts = [];
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
    }).get()

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

    this.currentPageNumber = null;
    this.pageNumberLinks = [];  
    this.pages = [];
    console.log('done yeah')
  } 

  parsePopularPodcasts = async () => {
    const html = await this.fetchHtml(this.url);
    const selector = cheerio.load(html);
    const searchResults = selector("body").find("#genre-nav > .grid3-column > ul > li > a")
    
    // get all categories
    const links = searchResults.map((idx, el) => {
      const elementSelector = selector(el);
      const link = elementSelector.attr("href").trim();
      return link
    }).get()

    for(let i = 0; i < links.length; i++) {
      const pageLink = links[i];
      console.log(pageLink)      
      await this.writeToFile(pageLink)
    }
  }

  // private methods
  writeToFile = async (url) => {
    const html = await this.fetchHtml(url);

    const selector = cheerio.load(html);
    const searchResults = selector("body").find("#selectedcontent > .column > ul > li > a")
    const links = searchResults.map((idx, el) => {
      const elementSelector = selector(el);
      const link = elementSelector.attr("href").trim();
      return link
    }).get()

    console.log(`importing total: ${links.length} podcasts`);
    
    const reg = new RegExp(/(.*)(\/)(id)(\d*)/);

    const csvData = []
    
    for(let i = 0; i < links.length; i++) {   
      const link = links[i];   
      const parsed = reg.exec(link);
      if(parsed) {
        const id = parsed[4];
        // return {link, id}
        const podcast = await this._getInfoFromiTunesApi(id);
        csvData.push({...podcast, id, link});
      }
    }

    if(this.csvFile) {
      try {
        await this.csvFile.append(csvData)
      } catch(e) {
        console.log(e)
        console.log('error inserting.')
      }
    }
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

  fetchHtml = async url => {
    try {
      const { data } = await axios.get(url);
      return data;
    } catch {
      console.error(
        `ERROR: An error occurred while trying to fetch the URL: ${url}`
      );
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

module.exports = iTunesScaper;
