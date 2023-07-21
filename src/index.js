import puppeteer from "puppeteer";
import fs from "fs";


async function next(page) {
	await page.click(".tw-pagination > .older > a");
 }


 function sleep(milliseconds) {
	 console.log("Now sleepig for ", (milliseconds/1000) ,"msecs");
	 return new Promise(resolve => setTimeout(resolve, milliseconds));
};

function waitRandomly() {
	// select random number of millisecs to wait
	return Math.floor(Math.random() * (20 - 3) + Math.random() ) * 1000;
}


async function run() {

	// start session
	let browser = await puppeteer.launch({
		headless: true, // visible browser to debug
		defaultViewport: null // website page in full width and height
	})

    try { // open page
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(2 * 60 * 1000);

        await page.goto("https://lopezobrador.org.mx/secciones/version-estenografica/", {
            waitUntil: "domcontentloaded"
          });

	    // iterate until 131th pag starting from page 2
	   const pags = 2;
	   let text = [];

	   for (let i = 1; i <= pags; i++){ //131
		   console.log("Now parsing page: ", i);
		   const entries = await page.evaluate(() => {
			   const interventions = document.querySelectorAll(".entry-post");
			   // generate an iterable array to get title and date for each entry
			   return Array.from(interventions).map((entry) => {
				   // get title and date
				   const title = entry.querySelector(".entry-title").innerText;
				   const date = entry.querySelector(".entry-date").innerText;
				   const link = entry.querySelector(".entry-title a[href*='://']").href;
				   return { title, date, link };
			   });
		   });

		   console.log("Current object is: ", entries);

		   next(page);

		   await sleep(waitRandomly()); // pause to avoid overloading server

	           //text = Object.assign(text, entries);
		   text.push(entries)
		   };

	    // save obj to disk
	    let textJSON = JSON.stringify(text);

	    fs.writeFile("links.json", textJSON, "utf8", (err) => { if (err) {  console.log("Error: ", err); } else { console.log ("File saved."); } });

    } catch (err) {
        console.error("Failed", err);
    } finally {
	console.log("Done.")
        await browser?.close();
    }
}

// start
run();
