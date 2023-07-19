import puppeteer from "puppeteer"

async function run (){

	// start session
	let browser = await puppeteer.launch({
		headless: false, // visible browser to debug
		defaultViewport :null, // website page in full width and height
	})

    try { // open page
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(2 * 60 * 1000);

        await page.goto("https://lopezobrador.org.mx/secciones/version-estenografica/", {
            waitUntil: "domcontentloaded",
          });   
          
        const entries = await page.evaluate( () => {
            const internventions = document.querySelectorAll(".entry-post")
            // generate an iterable array to get title and date for each entrie
            return Array.from(internventions).map((entrie) => {
                // get title and date
                const title = entrie.querySelector(".entry-title").innerText;
                const date = entrie.querySelector(".entry-date").innerText;
                return { title, date };
            });
            
        });
  
        console.log(entries);

    } catch (err) {
        console.error("Failed", err);
    }
    finally {
        await browser?.close();
    }
}

// start
run();
