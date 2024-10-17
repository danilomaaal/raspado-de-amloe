/*
    01010010011000010111001101110000011000010110010001101111 0110010001100101 0100000101001101010011000100111101000101 
	author: DM
	license: MIT
*/

import puppeteer, { TimeoutError } from "puppeteer";
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

	// set timeouts
	const ourTimeoutValue = 5 * 60 * 1000;
	
	// create db connection
	const uri = "mongodb://localhost:27017/";
	const client = new MongoClient(uri);	
	const database = client.db("discursos");
	const mananeras = database.collection("mananeras");	
	
	// number of pags to parse
	const totalPages = 158; 
	let parsedPages = [];
	let entries = {};

	// start session
	let browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null,
		protocolTimeout: ourTimeoutValue,
		pipe: true, // workarround for "Error: Attempted to use detached Frame" see https://github.com/puppeteer/puppeteer/issues/12423
		args: ["--disable-features=site-per-process"]
	})

    try { // open page
        const page = await browser.newPage();
		const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36";
		await page.setUserAgent(userAgent);
        page.setDefaultNavigationTimeout(ourTimeoutValue);
		page.setDefaultTimeout(ourTimeoutValue);

        await page.goto("https://lopezobrador.org.mx/secciones/version-estenografica/", {
            waitUntil: "domcontentloaded"
          });
		  
		console.log("Acquiring links and titles.");
		  
		for (let index = 1; index <= totalPages; index++) {
			
			console.log(`Navegating to page ${index} (of ${totalPages}).`);
			
			try {
				await page.waitForSelector(".entry-post", { visible: true, timeout: ourTimeoutValue }); 
				
				// @ts-ignore
				entries = await page.evaluate(() => {

				const interventions = document.querySelectorAll(".entry-post");
				
				// generate an iterable array to get title and date for each entry
				return Array.from(interventions).map((entry) => {
					// @ts-ignore
					const title = entry.querySelector(".entry-title").innerText;
					// @ts-ignore
					const date = entry.querySelector(".entry-date").innerText;
					// @ts-ignore
					const link = entry.querySelector(".entry-title a[href*='://']").href;
					// empty strings to be filled 
					let text = "";
					// recolection date
					let acquisition = "";
					return { title, date, link, text, acquisition };
				});
				
			});
			
		} catch(err) {

			switch ( err.name ) {

				case TimeoutError:
					 entries.title = `${err.name}. No data available from page ${index}.`;
					 entries.date = null;
					 entries.link = null;
					 entries.text = null;
					 entries.acquisition = null;
					 continue;

				case TypeError:
					entries.title = `${err.name}. No data available from page ${index}.`;
					entries.date = null;
					entries.link = null;
					entries.text = null;
					entries.acquisition = null;
					continue;
					
				default:
					entries.title = `Default: ${err.name} at page ${index}.`;
					entries.date = null;
					entries.link = null;
					entries.text = `Error call: ${err.call()}`;
					entries.acquisition = null;
					continue;
				};

			} finally {
				// store objects in arr
				parsedPages.push(entries);		   
				console.log("The last parsed page contained the following entries: ", entries, "\n");
				await sleep(waitRandomly());

				// navigate next pages, stop when reaching the last one
				if( index != totalPages ){
					await page.waitForSelector(".tw-pagination > .older > a", { visible: true, timeout: ourTimeoutValue });
					next(page);
				}				
			}
		}; // end of first iteration
		console.log("OK! A list of links has been generated.");

		console.log("Now we'll start getting all the transcriptions.");				
		for (let pags of parsedPages) {

			// @ts-ignore
			for (let entry of pags) {
				
				if (entry.link == null) {
					console.log("Unavailable link. Skipping to the next one.");
					continue;
				} else {
					try {
						console.log(`Accessing: ${entry.link}`);
						
						await page.goto(entry.link, { waitUntil: "domcontentloaded" });

						await page.waitForSelector(".entry-content", { visible: true, timeout: ourTimeoutValue });

						console.log("Parsing text.");

						entry.text = await page.evaluate(() => { // @ts-ignore
							return document.querySelector(".entry-content").innerText;
						});

						// set scrape date
						entry.acquisition = `${new Date()}`;
	
						console.log("Done.");

						await sleep(waitRandomly()); // pause
					
					} catch(err) {
						switch ( err.name ) {
							case TimeoutError:
								entry.text = `${err.name}. No text available.`;
								entry.acquisition = null;
								continue;
							case TypeError:
								entry.text = `${err.name}. No text available.`;
								entry.acquisition = null;
								continue;
							default:
								console.error("Default error: \n", err);
								entry.text = `${err.name}. No text available.`;
								entry.acquisition = null;
								continue;
						};
					} finally {
						    const result = await mananeras.insertOne(entry);
							console.log(`The following entry was inserted with the _id: ${result.insertedId}`);
							console.log(entry);
							entry = undefined;
					};
				};
			}; // inner
		}; // outer

		console.log("OK! Data was saved in database.");

	} catch (err) {
        console.error("Error: \n", err);
    } finally {
		console.log("Now closing database client and browser.");
		await browser?.close();
		await client.close();
    };
};

// start
run();
