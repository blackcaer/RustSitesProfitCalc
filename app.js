//const { Console } = require('console')
const fs = require('fs')    //file stream
//const prompt = require('prompt')
const rb = require('./lib/sitereq_rb.js')   // Needs bypass of cloudflare 
const sm = require('./lib/sitereq_sm')

const NAME_RB_ITEMS = "rb_itemdb.txt"
//const NAME_RB_ITEMSSHORT="testsrc_short.txt"

const PATH_RB_ITEMS = "./src/" + NAME_RB_ITEMS //rb_itembd.txt
const PATH_SM_ITEMDB = "./src/itemdb.js"

const PATH_COOKIES="./src/cookies/steam_cookies_priceov.txt"
const PATH_HEADER="./src/cookies/steam_header.txt"

const storeData = (data, path) => {
    try {
        fs.writeFileSync(path, JSON.stringify(data))
    } catch (err) {
        console.error(err)
    }
}

const prepareRbItems = async function (pathRbDb) {
    var items = []
    if (fs.existsSync(pathRbDb)) {
        let tmp = JSON.parse(fs.readFileSync(pathRbDb, { encoding: 'utf8', flag: 'r' }))

        for (const item of tmp) {
            let pos = items.findIndex((el) => { return el.name === item.name })
            if (pos === -1) {
                items.push(item)
                items[items.length-1].quantity = 1
                continue
            }
            items[pos].quantity++
        }
        //storeData(items,pathRbDb)
    }
    else {
        return { "success": false, "error": [`Error: ${pathRbDb} not found`] }
    }
    return { "success": true, "items": items }
}

/**
 * Function is checking whether name is on the white or black list. If on none of them, returns 0.
 * @param {string} name - name to check
 * @param {string[]} whitelist - if name in whitelist, returns 2
 * @param {string[]} blacklist - if name in blacklist, returns 1
 * 
 */
const itemStatus = function(name="",whitelist=[],blacklist=[]){
    if(whitelist.includes(name))
        return 2
    else if(blacklist.includes(name))
        return 1
    else
        return 0
    
}
// glowny plik do zbierania danych z wielu stron, wszak analiza wszędzie jest taka sama, od razu dane wszystkich stron mialbym posegregowane w jednym miejscu

;// Main:
(async () => {
    var smreqdata
    var data = {}
    data.rb_items = []
    data.sm_items = []
    var sites = [data.rb_items] // TODO niegotowe do dodania nastepnej strony, np filter1

    try{    // Getting headers from file
    smreqdata = JSON.parse('{'+fs.readFileSync(PATH_HEADER,"utf8")+'}')
    }catch(err){
        console.log('Headers file error:')
        console.log(err);
        return false
    }

    { // Preparing all items:

        // Preparing rb_iems
        {
            let rb_fetch_result = await prepareRbItems(PATH_RB_ITEMS)

            if (rb_fetch_result.success === false) {
                console.log(rb_fetch_result.error)  // log err
                return false
            }
            else    // if good
                data.rb_items.push(...rb_fetch_result.items)
        }

        // Preparing sm_market database:
        {
            data.sm_items.push(...JSON.parse(fs.readFileSync(PATH_SM_ITEMDB, { encoding: 'utf8', flag: 'r' })))
        }

    }
    
    { // Adding nameid to items
        let stats = {}

        { // rb_items:
            stats.rb = {}
            stats.rb.found = 0
            stats.rb.notfound = []

            for (let i = 0; i < data.rb_items.length; i++) {
                let currname = data.rb_items[i].name
                let found = data.sm_items.find(el => el.name === currname)
                if (found === undefined) 
                {
                    //console.log(`Not found: ${currname}`);
                    stats.rb.notfound.push(currname)
                    continue
                }
                stats.rb.found++
                data.rb_items[i].nameid = found.nameid
                //console.log(`Item found: ${found.name}`)
            }
        }

        { // Showing search stats
            const SPACE = "      "
            console.log("Nameids added");
            console.log("\nRustbet:")
            console.log(SPACE + `${stats.rb.found}/${data.rb_items.length} items found in smdb\n`)

            if (stats.rb.notfound != false)
                console.log(SPACE + `Not found: \n ${stats.rb.notfound}\n`)
        }
    }
    
    var whitelist = []
    var blacklist = []

    { // Filtering 1
        
        let popularx100 = 3   // The most popular items *100 to whitelist
        let unpopularx100 = 12 // The most unpopular items *100 to blacklist
        
        
        let options = {count: 100,search_descriptions: false, sort_column: 'popular', sort_dir: 'desc', appid: 252490,req_data: smreqdata}

        let precursor = await sm.getChunkOfSteamMarket({...options,start:0,count:1})    // To get totalitems value
        if(precursor.success==false)
        {
            console.log("Failed to run precursor in filter 1: ")
            console.log(precursor.error)
            return false
        }
        let totalitems = precursor.info.total_count

        let promisetab=[] // Tab holding promises of all fetches in this filter

        // Whitelist: sm popular
        for (let i = 0; i < popularx100; i++) {
            let start = i * 100
            promisetab.push(sm.getChunkOfSteamMarket({...options,start: start}).then((resp, err) => {
                //console.log(`Promise tab 1 nr: ${i}`);
                if (err) {
                    console.log(`(getMarketSearch start: ${start})`);
                    console.log(`Error while getting data to filter1: ${err}`) 
                }
                else if (resp.success != true) {
                    console.log(`(getMarketSearch start: ${start})`);
                    console.log(`Error while getting data to filter1: data success isn't true`)
                    
                }
                else
                {
                for (let j = 0; j < resp.data.length; j++) {
                    whitelist.push(resp.data[j].hash_name)
                }}
            }))
        }

        // Blacklist: sm unpopular
        for (let i = 0; i < unpopularx100; i++) {
            let start = totalitems-100*(unpopularx100-i)
            promisetab.push(sm.getChunkOfSteamMarket({...options,start: start}).then((resp, err) => {
                //console.log(`Promise tab 2 nr: ${i}`);
                if (err) {
                    console.log(`(getMarketSearch start: ${start})`);
                    console.log(`Error while getting data to filter1: ${err}`)
                    
                }
                else if (resp.success != true) {
                    console.log(`(getMarketSearch start: ${start})`);
                    console.log(`Error while getting data to filter1: data success isn't true`)
                    
                }
                else{
                for (let j = 0; j < resp.data.length; j++) {
                    blacklist.push(resp.data[j].hash_name)
                }}
            }))
        }

        console.log("Downloading market data...");
        let time_start=Date.now()
        await Promise.all(promisetab)
        let time_end=Date.now()

        console.log(`Market search data fetched in ${(time_end-time_start)/1000} s`)
        
        /*console.log('\nWHITELIST: ');
        console.log(whitelist)
        console.log('BLACKLIST: ');
        console.log(blacklist)*/
        /*
        bezwzgledna whitelista i blacklista
        whitelist>blacklist
        kontrola powtorzen ?

        kryteria:
        -popularnosc (np 300 pierwszych W, 600 last B)
        -cena na rb (np (>30$) W, <0.5$ B)
        -

        */

        // Deleting blacklisted items

        var w=0,b=0

        for (let i = 0; i < data.rb_items.length; i++) {         // TODO zmienic na site aby bylo latwo rozszerzalne
            let itstat = itemStatus(data.rb_items[i].name,whitelist,blacklist)
            if (itstat === 2)
                {w++;continue}
            else if(itstat === 1)
                {b++;data.rb_items.splice(i,1)}

        }
    }
    var itemcount = data.rb_items.length

    console.log(`\n\nWhitelisted: ${w} Blacklisted: ${b}`)
    console.log(`Items after filter 1: ${itemcount}\n`)


    { // Fetching sm data for each item      
        let time_start,time_end // measuring time
        // Rustbet: 
        
        time_start = Date.now()

        for (let sitenr = 0; sitenr < sites.length; sitenr++) //sites.length; sitenr++) 
        {
            for (let itemnr = 0; itemnr < itemcount ; itemnr++) //itemnr < TMP_ITEM_LIMIT; itemnr++)
            {
                let item = sites[sitenr][itemnr]     //shortcut

                console.log(`Item nr ${itemnr} : ${item.name}`);    // status

                let options = {cd_tooManyRequest_error:5000,maxTMRerrInRow:1,appid:252490, nameid : item.nameid, hash_name:item.name,req_data:smreqdata, logErr:true, logInfo:true}
                let tmp     // Variable holding actual response from getData (with histogram/priceoverview etc./)
                item.sm_data = {"status":{"allgood":true,"histogram":true}}     // if error, overwrite bad one to false and .allgood to false
                
                options.type = "histogram"
                tmp = await sm.getData(options)
                if(tmp.success == true && tmp.response.success === 1)
                    item.sm_data.histogram = tmp.response   
                else
                {
                    console.log(`Error while getting histogram: "${tmp.error}"`)
                    console.log(`GetData success: ${tmp.success}`)
                    console.log(`Histogram success: ${tmp.response.success}`)
                    item.sm_data.status.allgood = false
                    item.sm_data.status.histogram = false
                }

                // reszta wsm useless poki co a problemy robi, priceoverview jest zawarte w histogramie
                /*
                options.type = "pricehistory"
                item.sm_data.pricehistory = await sm.getData(options)
                options.type = "priceoverview"
                item.sm_data.priceoverview = await sm.getData(options)
                */
            }
        }
        // Stats:
        time_end = Date.now()
        let items_sum=0
        for(let i = 0; i < sites.length; i++)
            items_sum+=sites[i].length

        console.log(`\nFetching all ${data.rb_items.length} items took ${(time_end-time_start)/1000} seconds`);
    }

    var result = []

    { // Analyzing
        for (let sitenr = 0; sitenr < sites.length; sitenr++) 
        {
            for (let itemnr = 0; itemnr < itemcount; itemnr++) //data.rb_items.length; itemnr++)  TMP_ITEM_LIMIT
            {
                let item = sites[sitenr][itemnr]
                { // Rustbet
                    item.roe = (item.sm_data.histogram.lowest_sell_order/100) / item.price // steam price / site price
                    //console.log(item.roe)
                    if(item.roe>4.4)        // TODO temporary
                        result.push(item)
                }

            }
        }
    }

    console.log("\nXXXXXXXXXXXXXXXXXX")
    result.sort((a,b)=>{return b.roe-a.roe})  

    { // Filtering 2 (when we know real price of those items and roe)
        for (let sitenr = 0; sitenr < sites.length; sitenr++) 
        {
            for (let itemnr = 0; itemnr < itemcount; itemnr++) //data.rb_items.length; itemnr++)  TMP_ITEM_LIMIT
            {


            }
        }
    }

    { // Getting volume from priceoverview

    }

    { // Filtering 3 

    }

    { // Display
        for (item of result)
        {
            console.log(`${item.name} :  ${item.roe} \n`);
        }

    }

    //  (kurs nagrody * 0,85)/kurs beta -1 = game sum (??razcej ta)

    //optymalizacja:
    //fetchowanie sm tylko w danym zakresie cenowym (dział 'filtering' tuz po preparing)

    //obsluga bledow przy kazdym json parse
})();//end main IFEE func


// https://rustbet.com/api/steamInventory   jesli zalogowany
// https://rustbet.com/api/upgrader/stock?order=1&max=20
// https://rustbet.com/api/upgrader/stock?order=-1&max=9999&count=28000
// https://steamcommunity.com/market/search/render/?query=&start=0&norender=1&count=100&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=252490
// 
/* rbitem:
 {
    _id: '61c34cfffe30de4d5795e396',
    name: 'Blackout Gloves',
    image: '6TMcQ7eX6E0EZl2byXi7vaVKyDk_zQLX05x6eLCFM9neAckxGDf7qU2e2gu64OnAeQ7835BZ4mLEfCk4nReh8DEiv5dYPaA9q7U0R_G_MCMIAFY',
    origin: 'steam',
    color: 'a7ec2e',
    locked: false,
    price: 7.2
  }
*/


