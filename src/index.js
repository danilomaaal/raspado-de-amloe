/*
    01010010011000010111001101110000011000010110010001101111 0110010001100101 0100000101001101010011000100111101000101 
	author: DM
	license: MIT
*/

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
	return Math.floor(Math.random() * (20 - 3 + 1) + 3) * 1000;
}


async function run() {

	// start session
	let browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null
	})

    try { // open page
        const page = await browser.newPage();
		const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36";
		await page.setUserAgent(userAgent);
        page.setDefaultNavigationTimeout(2 * 60 * 1000);

        await page.goto("https://lopezobrador.org.mx/secciones/version-estenografica/", {
            waitUntil: "domcontentloaded"
          });

	    // iterate until 137th pag
	   const pags = 137; 
	   let parsedData = [];

	   for (let i = 1; i <= pags; i++){
		   console.log("Now parsing page: ", i);

		   await page.waitForSelector(".entry-post", { visible:true });

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
		   
		   //console.log("Current object is: ", entries);
		   await page.waitForSelector(".tw-pagination > .older > a", { visible: true });
		   next(page);

		   await sleep(waitRandomly()); // pause

	       parsedData.push(entries);
		};

		for (const element of parsedData) {
			for (const entry of element) {
				console.log(`Now accessing: ${entry.link}`);
				
				await page.goto(entry.link, {
					waitUntil: "domcontentloaded"
				});

				await page.waitForSelector(".entry-content", 
				{ visible:true,
					timeout: 60000
				});
				
				entry.text = await page.evaluate(() => {
					// @ts-ignore
					return document.querySelector(".entry-content").innerText;
				})
				await sleep(waitRandomly()); // pause to avoid overloading server
		}
	}
	    // save obj to disk
	    let JSONdata = JSON.stringify(parsedData);
		parsedData = undefined;

	    fs.writeFile("text.json", JSONdata, "utf8", (err) => {
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
