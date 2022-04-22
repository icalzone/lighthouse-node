const gulp = require("gulp");
const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const printer = require("lighthouse/lighthouse-cli/printer");
const Reporter = require("lighthouse/lighthouse-core/report/report-generator");
const fs = require("fs-extra");
const config = require("./lighthouse-config.js");

async function write(file, report) {
  try {
    await fs.outputFile(file, report);
  } catch (e) {
    console.log("error while writing report ", e);
  }
}

async function launchChrome() {
  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ["--disable-gpu", "--no-sandbox", "--headless", "--disable-storage-reset"],
      enableExtensions: true,
      logLevel: "error"
    });
    console.log(chrome.port);
    return {
      port: chrome.port,
      chromeFlags: ["--headless"],
      logLevel: "error"
    };
  } catch (e) {
    console.log("Error while launching Chrome ", e);
  }
}

async function lighthouseRunner(opt, url) {
  try {
    return await lighthouse(url, opt, config);
  } catch (e) {
    console.log("Error while running lighthouse");
  }
}

function genReport(result) {
  return Reporter.generateReport(result.lhr, "html");
}

async function run(timestamp, num, url) {
  let chromeOpt = await launchChrome();
  let result = await lighthouseRunner(chromeOpt, url);
  let report = genReport(result);
  await printer.write(
    report,
    "html",
    `./cases/lighthouse-report@${timestamp}-${num}.html`
  );

  let r = [];
  r.push(result.lhr.audits["first-contentful-paint"].rawValue);
  r.push(result.lhr.audits["first-meaningful-paint"].rawValue);
  r.push(result.lhr.audits["speed-index"].rawValue);
  r.push(result.lhr.audits["interactive"].rawValue);
  r.push(result.lhr.audits["first-cpu-idle"].rawValue);
  r.push(result.lhr.audits["estimated-input-latency"].rawValue);
  r.push(result.lhr.categories.performance.score);

  return r;
  await chrome.kill();
}

gulp.task("start", async function() {
  let timestamp = Date.now();
  let spent = [];
  //let url = "https://www.hypertherm.com/en-US/";
  let url = "https://www.hypertherm.com/en-US/learn/consumables-and-torches/for-powermax-and-max-systems/";
  //let url = "https://www.hypertherm.com/en-US/learn/consumables-and-torches/for-powermax-and-max-systems/flushcut-consumables/";
  //let url = "https://www.hypertherm.com/en-US/learn/about-our-products/xpr-plasma-cutting-systems/";
  //let url = "https://www.hypertherm.com/en-US/hypertherm/powermax/powermax45-xp/";

  //let url = "https://epistage.hypertherm.com/en-US/?region=NART";
  //let url = "https://epistage.hypertherm.com/en-US/hypertherm/pronest/pronest-lt-cadcam-nesting-software/?region=NART"
  //let url = "https://epistage.hypertherm.com/en-US/products/software/pronest-lt-subscription-plans/?region=NART"
  //let url = "https://epistage.hypertherm.com/en-US/products/plasma-cutting-and-gouging-systems/?region=NART"
  //let url = "https://epistage.hypertherm.com/en-US/hypertherm/powermax/powermax45-xp/?region=NART"
  //let url = "https://epistage.hypertherm.com/en-US/products/?DefaultProductWebType=Plasma+systems&ProductLine=Powermax&ProductLine=Freedom&region=NART"
  //let url = "https://epistage.hypertherm.com/en-US/contact-us/?region=NART"
  //let url = "https://epistage.hypertherm.com/en-US/learn/consumables-and-torches/for-powermax-and-max-systems/?region=NART"

  for (let i = 0; i < 10; i++) {
    spent.push(await run(timestamp, i, url));
  }

  let template = await fs.readFileSync(
    "./summary/template/template.html",
    "utf-8"
  );
  let summary = Reporter.replaceStrings(template, [
    {
      search: "%%TIME_SPENT%%",
      replacement: JSON.stringify(spent)
    },
    {
      search: "%%TIMESTAMP%%",
      replacement: timestamp
    },
    {
      search: "%%PAGE%%",
      replacement: url
    }
  ]);
  write(`./summary/report/summary@${timestamp}.html`, summary);
});

// lighthouse-batch -s https://www.hypertherm.com/en-US/?region=NART,https://www.hypertherm.com/en-US/hypertherm/pronest/pronest-lt-cadcam-nesting-software/?region=NART,https://www.hypertherm.com/en-US/products/software/pronest-lt-subscription-plans/?region=NART,https://www.hypertherm.com/en-US/products/plasma-cutting-and-gouging-systems/?DefaultProductWebType=Plasma+systems"&"region=NART,https://www.hypertherm.com/en-US/hypertherm/powermax/powermax45-xp/?region=NART,https://www.hypertherm.com/en-US/products/?DefaultProductWebType=Plasma+systems"&"ProductLine=Powermax"&"ProductLine=Freedom"&"region=NART,https://www.hypertherm.com/en-US/contact-us/?region=NART,https://www.hypertherm.com/en-US/learn/consumables-and-torches/for-powermax-and-max-systems/?region=NART
