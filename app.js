//const { Console } = require('console')
const fs = require('fs')    //file stream
const { isReadStream } = require('request/lib/helpers')
//const prompt = require('prompt')
const rb = require('./lib/sitereq_rb.js')   // Needs bypass of cloudflare 
const sm = require('./lib/sitereq_sm')

const PATH_RB_ITEMS = "./src/rb_itemdb.txt"
const PATH_RBEQ_ITEMS = "./src/rbeq_itemdb.txt"
const PATH_RCH_ITEMDB = "./src/rch_itemdb.txt"
const PATH_RCHEQ_ITEMS = "./src/rcheq_itemdb.txt"

const PATH_SM_ITEMDB = "./src/itemdb.js"

const PATH_COOKIES = "./src/cookies/steam_cookies_priceov.txt"
const PATH_HEADER = "./src/cookies/steam_header.txt"

const storeData = (data, path) => {
    try {
        fs.writeFileSync(path, JSON.stringify(data))
    } catch (err) {
        console.error(err)
        return false
    }
}

const readData = (path) => {
    try {
        var data = JSON.parse(fs.readFileSync(path))
    } catch (err) {
        console.error(err)
        return false
    }
    return data
}

/**
 * Reads JSON data from file, returns data as {success:boolean, items:Array} with no duplicates. Duplicate is whem item1.name === item2.name.
 * Function adds .quantity property to the item, which is number of items with the same .name.
 * @param {string} path - path to the database 
 * @returns {{'success':true, 'items':Array} | {'success':false, 'error':string} } 
 */
const prepareItemsFrom = function (path) {
    var rdyitems = []
    if (fs.existsSync(path)) {
        try{
        let tmp = (JSON.parse(fs.readFileSync(path, { encoding: 'utf8', flag: 'r' }))).items

        for (const item of tmp) {
            let pos = rdyitems.findIndex((el) => { return el.name === item.name })
            if (pos === -1) {
                rdyitems.push(item)
                rdyitems[rdyitems.length - 1].quantity = 1    // when this item is added first time, it will always be set to 1
                
                continue
            }
            rdyitems[pos].quantity++
        }}catch(err)
        {   
            return { "success": false, "error": err }
        }
    }
    else {
        return { "success": false, "error": `${path} not found` }    
    }
    return { "success": true, "items": rdyitems }
}

/**
 * Function is checking whether name is on the white or black list. If on none of them, returns 0.
 * @param {string} name - name to check
 * @param {string[]} whitelist - if name in whitelist, returns 2
 * @param {string[]} blacklist - if name in blacklist, returns 1
 * 
 */
const checkLists = function (name = "", whitelist = [], blacklist = []) {
    if (whitelist.includes(name))
        return 2
    else if (blacklist.includes(name))
        return 1
    else
        return 0

}

const filter1 = function ({ item, Wfrom = 10, Bto = 0.3 } = {}) {
    // needs item.price

    let listAs = 0
    try {
        if (item.price < 0)     // whitelist
            listAs = 2
        else if (item.price >= Wfrom)  // whitelist
            listAs = 2
        else if (item.price <= Bto)    // blacklist
            listAs = 1

    } catch (error) {
        return { "success": false, "error": ("filter1part1 error: " + error) }
    }
    return { "success": true, "list": listAs, }

}

/**
 * Returns true if item schouldn't be filtered out and true if it schould.
 * If treshold === 0 filter always returns true
 * 
 * @param {*} treshold - if (roe < treshold) || (treshold < 0 && roe > |treshold|) it filters it out (returns false)
 * @param {*} roe - item's roe
 * 
 */
const filterroe = function(treshold,roe){
    if(treshold === 0)
        return true
    else if(treshold > 0)
        return roe > treshold
    else // treshold < 0
        return roe < -treshold 
}

const getMarketWBlists = async function ({ req_data={},count= 100, search_descriptions= false, sort_column= 'popular', sort_dir= 'desc', appid= 252490,popularx100 = 3, unpopularx100 = 13 } = {}) {      // TODO sprawdzic czy trzeba async dopisac
    // The most popular items *100 to whitelist
    // The most unpopular items *100 to blacklist
    let whitelist = [], blacklist = []
    let options = { count: count, search_descriptions: search_descriptions, sort_column: sort_column, sort_dir: sort_dir, appid: appid, req_data: req_data }

    let precursor = await sm.getChunkOfSteamMarket({ ...options, start: 0, count: 1 })    // To get totalitems value
    if (precursor.success == false) {
        console.log("Failed to run precursor in filter 1: ")
        console.log(precursor.error)
        return { 'success': false, 'error': ("Failed to run precursor in filter 1: "+precursor.error)}
    }
    let totalitems = precursor.info.total_count

    let promisetab = [] // Tab holding promises of all fetches in this filter

    // Whitelist: sm popular
    for (let i = 0; i < popularx100; i++) {
        let start = i * 100
        promisetab.push(sm.getChunkOfSteamMarket({ ...options, start: start }).then((resp, err) => {
            //console.log(`Promise tab 1 nr: ${i}`);
            if (err) {
                console.log(`(getMarketSearch start: ${start})`);       // TODO delete logging inside a func
                console.log(`Error while getting data to filter1: ${err}`)
                return { 'success': false, 'error': err }
            }
            else if (resp.success != true) {
                console.log(`(getMarketSearch start: ${start})`);
                let err = `Error while getting data to filter1: data success isn't true`
                console.log(err)
                return { 'success': false, 'error': err }
            }
            else {
                for (let j = 0; j < resp.data.length; j++) {
                    whitelist.push(resp.data[j].hash_name)
                }
            }
        }))
    }
    // Blacklist: sm unpopular
    for (let i = 0; i < unpopularx100; i++) {
        let start = totalitems - 100 * (unpopularx100 - i)
        promisetab.push(sm.getChunkOfSteamMarket({ ...options, start: start }).then((resp, err) => {
            //console.log(`Promise tab 2 nr: ${i}`);
            if (err) {
                console.log(`(getMarketSearch start: ${start})`);
                console.log(`Error while getting data to filter1: ${err}`)
                return { 'success': false, 'error': err }

            }
            else if (resp.success != true) {
                console.log(`(getMarketSearch start: ${start})`);
                let err = `Error while getting data to filter1: data success isn't true`
                console.log(err)
                return { 'success': false, 'error': err }
            }
            else {
                for (let j = 0; j < resp.data.length; j++) {
                    blacklist.push(resp.data[j].hash_name)
                }
            }
        }))
    }

    console.log("Downloading market data...");
    let t1 = Date.now()
    await Promise.all(promisetab)
    let t2 = Date.now()

    console.log(`Market search data fetched in ${(t2 - t1) / 1000} s`)
    return { 'success': true, 'whitelist': whitelist, 'blacklist': blacklist }

}

const prepareSite = function(path,sitename){
    let rb_fetch_result
    try{
    if(sitename==="rch")
        rb_fetch_result = {success: true, items: JSON.parse(fs.readFileSync(path,{encoding:"utf8"}))}
    else if(sitename==="rcheq")
    {
        let tmp = []
        for(let item of JSON.parse(fs.readFileSync(path,{encoding:"utf8"})).items)
            tmp.push({ name: item.market_hash_name, price: item.price/100, quantity: item.amount })
        rb_fetch_result = { success: true, items: tmp }
    }
    else
        rb_fetch_result = prepareItemsFrom(path)
    }catch(error)
    {return {success:false, error:error}}

    if (rb_fetch_result.success === false) {
        
        return {success:false, error:rb_fetch_result.error}
    }
    
    return {success:true, items: rb_fetch_result.items}

}
// glowny plik do zbierania danych z wielu stron, wszak analiza wszędzie jest taka sama, od razu dane wszystkich stron mialbym posegregowane w jednym miejscu

// .liststatus
// 2 - whitelist
// 1 - blacklist
// 0 - nothing

var C =         // testing config
{ 
    datarb: 1,          //t create data.sites[rq]
    datarch: 1,         //t create data.sites[rch]
    datarbeq: 1,        //t create data.sites[rbeq]
    datarbeqAllTrue: false,  //f make data[rbeq] but with all filters ON (like in normal rb)
    datarcheq: 1,
}

;// Main:
(async () => {
    var smreqdata
    var data = {}
    data.sites = {}
    {   // Settings for every site
    if (C.datarb) 
        data.sites["rb"] = { info: { name: "rb", path: PATH_RB_ITEMS, prepare: 1, filter1: true, filter2: true, filter3: true, fetchsmdata: true, calcroe: true, sortroe: true, displayroe: true, filterroe: 0 }, data: [] }  // key schould === .name
    if (C.datarbeq) 
        data.sites["rbeq"] = { info: { name: "rbeq", path: PATH_RBEQ_ITEMS, prepare: 1, filter1: false, filter2: false, filter3: false, fetchsmdata: true, calcroe: true, sortroe: true, displayroe: true, filterroe: 0 }, data: [] }

    if (C.datarbeqAllTrue) // for testing
        data.sites["rbeq"] = { info: { name: "rb", path: PATH_RBEQ_ITEMS, prepare: 0, filter1: true, filter2: true, filter3: true, fetchsmdata: true, calcroe: true, sortroe: true, displayroe: true, filterroe: 0 }, data: [] }  // key schould === .name

    if (C.datarch)
        data.sites["rch"] = { info: { name: "rch", path: PATH_RCH_ITEMDB, prepare: 0, filter1: true, filter2: true, filter3: true, fetchsmdata: true, calcroe: true, sortroe: true, displayroe: true, filterroe: 0 }, data: [] }

    if (C.datarcheq) 
        data.sites["rcheq"] = { info: { name: "rcheq", path: PATH_RCHEQ_ITEMS, prepare: 0, filter1: false, filter2: false, filter3: false, fetchsmdata: true, calcroe: true, sortroe: true, displayroe: true, filterroe: 0 }, data: [] }
        

    data.sm_items = []

    }

    {   // Getting headers from file
        try {
            smreqdata = JSON.parse('{' + fs.readFileSync(PATH_HEADER, "utf8") + '}')
        } catch (err) {
            console.log('Headers file error:')
            console.log(err);
            return false
        }
    }

    { // Preparing all items:

        // Preparing sites
        for (let sitename in data.sites) {// sites:
            let sitedata = data.sites[sitename].data
            let siteinfo = data.sites[sitename].info
            
            if(siteinfo.prepare){    // for testing
                tmp = prepareSite(siteinfo.path,sitename)
                if(tmp.success)
                    sitedata.push(...tmp.items)
                else
                {
                    console.log(`Error while preparing site ${tmp.error}`)
                    return false
                }
            }
        }

        // Preparing sm_market database
        {
            data.sm_items.push(...JSON.parse(fs.readFileSync(PATH_SM_ITEMDB, { encoding: 'utf8', flag: 'r' })))
        }

    }
    
    { // Adding nameid to items
        let stats = {}  // statistics of found/not found items etc

        for(let sitename in data.sites)
        {    
            stats[sitename] = {}
            stats[sitename].found = 0
            stats[sitename].notfound = []

            let sitedata = data.sites[sitename].data
            for (let i = 0; i < sitedata.length; i++) {
                let currname = sitedata[i].name     // item name
                let found = data.sm_items.find(el => el.name === currname)
                if (found === undefined) {
                    stats[sitename].notfound.push(currname)
                    sitedata.splice(i,1)
                    i--
                    continue
                }
                stats[sitename].found++
                sitedata[i].nameid = found.nameid
            }
        
            { // Showing statistics, errors

                console.log("\nAdding nameid:");
                console.log(`\n${sitename}:`)
                console.log("      " + `${stats[sitename].found}/${data.sites[sitename].data.length + stats[sitename].notfound.length} items found in smdb\n`)

                if (stats[sitename].notfound != false)
                    console.log("      " + `Not found: \n${stats[sitename].notfound}\n`)
            }
        }
    }
    // Lists fetched from steam market search in filter 1.2 (by getMarketWBlists), needed to avoid repeating the same market fetches for all sites:
    var whitelist_smmarket = []
    var blacklist_smmarket = []

    { // Popularity on steam market (data for filter 2)
        let wbresult = await getMarketWBlists({req_data:smreqdata, popularx100:3, unpopularx100:13 }) // await?
        if (wbresult.success == true) {
            whitelist_smmarket = wbresult.whitelist
            blacklist_smmarket = wbresult.blacklist
        } else {
            console.log(wbresult.err)
            return false    //TODO obsluga bledu, np globalna lista bledow wyswietlana pod koniec
        }
    }

    var results = {}    // results.<sitename>.<resulttype>

    // Getting and analyzing data loop 
    for (let sitename in data.sites) {// sites:
        let sitedata = data.sites[sitename].data
        let siteinfo = data.sites[sitename].info

        if(siteinfo.filter1){ // Filter 1 - Site price
            let b = 0, w = 0 // counters
            for (let itemnr = 0; itemnr < sitedata.length; itemnr++) {
                let item = sitedata[itemnr]

                // Notify if negative price value:
                if(item.price <= 0)
                    console.log(`======================= NEGATIVE PRICE VALUE IN ${item.name} =======================`)
                
                let result = filter1({ 'item': item })
                if (result.success)
                {
                    if (result.list === 2)
                        w++
                    else if (result.list === 1)
                        b++
                    item.liststatus = result.list
                }else
                {
                    console.log(`F1 ${sitename}: Error in item ${item.name}:`);
                    console.log(result.error);
                }
            }
            console.log(`\n\nF1 ${sitename}: \nWhitelisted: ${w} \nBlacklisted: ${b}`)
        }

        if(siteinfo.filter2){ // Filter 2 with display
            let w = 0, b = 0    // counters

            for (let i = 0; i < sitedata.length; i++) {
                let item = sitedata[i]
                if (item.liststatus === 1 || item.liststatus === 2) 
                    continue

                // >here< only items with liststatus == 0 or undefined

                let itstat = checkLists(item.name, whitelist_smmarket, blacklist_smmarket)

                if (itstat === 2) { item.liststatus = itstat; w++ }         // Ifs for counting 
                else if (itstat === 1) { item.liststatus = itstat; b++ }
            }

            console.log(`\n\nF2\n ${sitename}: Whitelisted: ${w} \nBlacklisted: ${b}\n`)
        }

        if(siteinfo.fetchsmdata){ // Fetching sm data for each item      
            let tstart, tend // Measuring time
            // Rustbet: 

            tstart = Date.now()
            let count = 0
            for (let itemtabnr = 0; itemtabnr < sitedata.length; itemtabnr++) 
            {
                let item = sitedata[itemtabnr]
                if (item.liststatus === 1)  // If blacklisted
                    continue

                count++
                console.log(`Item nr ${count} : ${item.name}`);    // status

                let options = { cd_tooManyRequest_error: 5000, maxTMRerrInRow: 1, appid: 252490, nameid: item.nameid, hash_name: item.name, req_data: smreqdata, logErr: true, logInfo: true }
                let GDresp     // Variable holding actual response from getData (with histogram/priceoverview etc./)
                item.sm_data = { "status": { "allgood": true, "histogram": true } }     // if error, overwrite bad one to false and .allgood to false, TODO check if it is needed

                options.type = "histogram"
                GDresp = await sm.getData(options)      // TODO try to make it async if possible
                if (GDresp.success == true && GDresp.response.success === 1)
                    item.sm_data.histogram = GDresp.response
                else {
                    console.log(`Error while getting histogram: "${GDresp.error}"`)
                    console.log(`GetData success: ${GDresp.success}`)
                    if (GDresp.response != undefined)
                        console.log(`Histogram success: ${GDresp.response.success}`)
                    item.sm_data.status.allgood = false
                    item.sm_data.status.histogram = false
                }
                
            }

            tend = Date.now()

            console.log(`\nFetching all ${count} items for ${sitename} took ${(tend - tstart) / 1000} seconds`);
        }

        if(siteinfo.calcroe){ // Calculating .roe
            for (let itemnr = 0; itemnr < sitedata.length; itemnr++)
            {
                let item = sitedata[itemnr]
                if (item.liststatus === 1)  // if Blisted
                    continue

                if (item.sm_data.status.histogram == true)
                    try{
                    item.roe = (item.sm_data.histogram.lowest_sell_order / 100) / item.price // steam price / site price
                    }catch(err)
                    {console.log(`ERROR while trying to set roe for item ${item.name}: ${err}`)}
                else
                    console.log(`Error: Item status for ${item.name} histogram is false`);
            }
        }

        if(siteinfo.sortroe){ // Sorting by roe
            results[sitename] = { roe: [] }
            let restab = results[sitename].roe

            for (let itemnr = 0; itemnr < sitedata.length; itemnr++) {
                let item = sitedata[itemnr]
                if (item.liststatus !== 1)
                    restab.push(item)
            }

            restab.sort((a, b) => { return a.roe - b.roe })    // asc TODO close this callback in separate func
        }

        if(siteinfo.filter3){ // Filter 3 (when we know real price of those items and roe)

            for (let itemnr = 0; itemnr < sitedata.length; itemnr++) 
            {
                let item = sitedata[itemnr]

            }


        }

        // Getting volume from priceoverview
    }

    // Display loop
    for (let sitename in data.sites)  
    {
        let siteinfo = data.sites[sitename].info
        
        if(siteinfo.displayroe){ // Display roe
            let sredni_kurs_suma = 0
            let sredni_kurs_count = 0

            try{
                console.log(`\n\n\n       ====================== ${sitename} ======================`)
                console.log("       Rate of exchange: \n");
                for (item of results[sitename].roe) {
                    
                    if(!filterroe(siteinfo.filterroe, item.roe))
                        continue

                    if (item.liststatus === 2)
                        console.log(`==wl== ${item.name} :  ${item.roe}\n`);
                    else
                        console.log(`       ${item.name} :  ${item.roe} \n`);

                    sredni_kurs_suma += item.roe
                    sredni_kurs_count++
                }
            }catch(err){
                console.log(`Display roe error: ${err}`);
                continue
            }
            if(results[sitename].roe.length != 0)
                console.log(`\nŚredni kurs tych przedmiotów to ${sredni_kurs_suma / sredni_kurs_count}`);
            else
                console.log("       == No items ==");
        }
        
    }
})();//end main IFEE func

//  0,85 * kN/kS-1 = suma gry

//optymalizacja:
//fetchowanie sm tylko w danym zakresie cenowym (dział 'filtering' tuz po preparing)

//obsluga bledow przy kazdym json parse

/*
  After 'preparing all items' stage, all items shall have .name, .price and .quantity
*/


/*
{"expiresAt":1643912385,"totalValue":20,"items":[{"id":740,"market_hash_name":"Blue Bandana","image":"6TMcQ7eX6E0EZl2byXi7vaVKyDk_zQLX05x6eLCFM9neAckxGDf7qU2e2gu64OnAeQ7835Je5GTFfCk4nReh8DEiv5deMKE8pLU1RfoDqy4Pdg","assetid":"3327585656388171875","color":"a7ec2e","amount":1,"price":12},{"id":2226,"market_hash_name":"Tan Boots","image":"6TMcQ7eX6E0EZl2byXi7vaVKyDk_zQLX05x6eLCFM9neAckxGDf7qU2e2gu64OnAeQ7835Je5GDHfCk4nReh8DEiv5daPqg8q7w0RfC95vL6HF0","assetid":"3486351493797235999","color":"a7ec2e","amount":1,"price":8}]}


*/
//rcheq
//https://rustchance.com/api/account/inventory?refresh=false&flames=true 

// https://rustbet.com/api/steamInventory   jesli zalogowany
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
    quantity: 1
    liststatus : 2
  }
*/