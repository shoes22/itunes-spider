const axios = require("axios").default;
const cheerio = require("cheerio");
const _ = require("lodash")

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
          await this.writeToFile(pageLink)
          //const podcasts = await this.getPodcastLinks(pageLink);
          //this.podcasts = [...this.podcasts, ...podcasts];
        }
      }
    }

    this.currentPageNumber = null;
    this.pageNumberLinks = [];  
    this.pages = [];
    return this.podcasts.length;
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

    const csvData = podcasts.filter((podcast) => podcast.link !== null);
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

}

module.exports = iTunesScaper;
