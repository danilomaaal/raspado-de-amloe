/*
    01010010011000010111001101110000011000010110010001101111 0110010001100101 0100000101001101010011000100111101000101 
	author: DM
	license: MIT
*/

import puppeteer from "puppeteer";
import { MongoClient } from "mongodb";

async function next(page) {
	await page.click(".tw-pagination > .older > a");
 }


 function sleep(ms) {
	 console.log("Now sleepig for", (ms/1000), "secs.");
	 return new Promise(resolve => setTimeout(resolve, ms));
};

function waitRandomly() {
	// select random number to wait
	return Math.floor(Math.random() * (20 - 3 + 1) + 3) * 1000;
}


async function run() {

	// create connection
	const uri = "mongodb://localhost:27017/";
	const client = new MongoClient(uri);


	// start session
	let browser = await puppeteer.launch({
		headless: true,
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

		// establish db connection
		const database = client.db("discourse");
		// set colection scrape date
		const date = new Date();
		let d = date.getDate();
		let m = 1 + date.getMonth();
		let y = date.getFullYear();
		const mananeras = database.collection(`mananeras_${d}_${m}_${y}`);
	    // iterate until 155th pag
	   	const pags = 155; 
   		let parsedData = [];

		console.log("Acquiring links and titles.");
		for (let i = 1; i <= pags; i++) {
			console.log(`Parsing data from page ${i} (of ${pags}).`);

			await page.waitForSelector(".entry-post",
				{ visible:true,
				  timeout:60000
				});
			// document to insert
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
			   // empty string to be filled 
			   let text = "";
			   return { title, date, link, text };
		   });
		});
		// store array entries in obj
		parsedData.push(entries);		   
		console.log("Current array of objects is: ", entries);

		// navigate next pages
		await page.waitForSelector(".tw-pagination > .older > a", { visible: true });
		next(page);
		await sleep(waitRandomly());
		}; // end of first loop

		console.log("OK! A list of links has been generated.");
		
		for (const element of parsedData) {
			console.log("Now we'll start getting all the transcriptions.");
			for (const entry of element) {		
				console.log(`Accessing: ${entry.link}`);
				
				await page.goto(entry.link, {
					waitUntil: "domcontentloaded"
				});

				await page.waitForSelector(".entry-content", 
				{ visible:true,
					timeout: 60000
				});
				console.log("Parsing text.")
				entry.text = await page.evaluate(() => {
					// @ts-ignore
					return document.querySelector(".entry-content").innerText; // split text?
				});
				console.log("Done.")

				await sleep(waitRandomly()); // pause to avoid overloading server
			}
			console.log("Inserting objects:", {...element}); // convert array to obj before insertion
			const insertionResult = await mananeras.insertMany( element , { ordered: true } );
			console.log(`${insertionResult.insertedCount} documents were inserted from text data`);
		}
		console.log("All data has been stored in database.")
	
	} catch (err) {
        console.error("Attention! Something happened: \n", err);
    } finally {
		console.log("Done.\nNow closing browser and database clients.");
		await browser?.close();
		await client.close();
    }
}

// start
run();
