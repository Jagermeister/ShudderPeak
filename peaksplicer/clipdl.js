const puppeteer = require('puppeteer');


async function download(streamingLink, selector, timePeak) {
  var currentTime = new Date().getTime();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(streamingLink);
  await Promise.all([
    page.waitForNavigation(),
    page.click(selector)
  ]);
  await browser.close();
};