import puppeteer from "puppeteer";
import fs from "fs";


async function next(page) {
	await page.click(".tw-pagination > .older > a");
 }


 function sleep(ms) {
	 console.log("Now sleepig for ", (ms/1000) ,"secs");
	 return new Promise(resolve => setTimeout(resolve, ms));
};

function waitRandomly() {
	// select random number to wait
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

	    // iterate until 131th pag
	   const pags = 131; 
	   let data = [];

	   for (let i = 1; i <= pags; i++){
		   console.log("Now parsing page: ", i);
		   const entries = await page.evaluate(() => {
			   const interventions = document.querySelectorAll(".entry-post");
			   // generate an iterable array to get title and date for each entry
			   return Array.from(interventions).map((entry) => {
				   // @ts-ignore
				   const title = entry.querySelector(".entry-title").innerText;
				   // @ts-ignore
				   const date = entry.querySelector(".entry-date").innerText;
				   // @ts-ignore
				   const link = entry.querySelector(".entry-title a[href*='://']").href;
				   let text ="";

				   return { title, date, link, text };
			   });
		   });
		   
		   for (const entry of entries) {
			console.log(`Now accessing: ${entry.link}`);
	
			await page.goto(entry.link, {
				waitUntil: "domcontentloaded"
			  });

			entry.text = await page.evaluate(() => {
				// @ts-ignore
				return document.querySelector(".entry-content").innerText;
			})
			await sleep(waitRandomly()); // pause to avoid overloading server
			await page.goBack();
		   }

		   console.log("Current object is: ", entries);
		   
		   next(page);

		   await sleep(waitRandomly()); // pause again

	       data.push(entries);
		};

	    // save obj to disk
	    let JSONdata = JSON.stringify(data);
		data = undefined;

	    fs.writeFile("data.json", JSONdata, "utf8", (err) => {
			if (err) {
				console.error("Error: ", err);
			} else {
				console.log ("Data saved.");
			}
		});

    } catch (err) {
        console.error("Failed. Something happened :(", err);
    } finally {
		console.log("Done.");
		await browser?.close();
    }
}

// start
run();
