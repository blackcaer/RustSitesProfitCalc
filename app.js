//const { Console } = require('console')
const fs = require('fs')    //file stream
const { isReadStream } = require('request/lib/helpers')
//const prompt = require('prompt')
const rb = require('./lib/sitereq_rb.js')   // Needs bypass of cloudflare 
const sm = require('./lib/sitereq_sm')

const NAME_RB_ITEMS = "rb_itemdb.txt"
//const NAME_RB_ITEMSSHORT="testsrc_short.txt"

const PATH_RB_ITEMS = "./src/" + NAME_RB_ITEMS //rb_itembd.txt
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

const prepareRbItems = async function (pathRbDb) {
    var items = []
    if (fs.existsSync(pathRbDb)) {
        let tmp = (JSON.parse(fs.readFileSync(pathRbDb, { encoding: 'utf8', flag: 'r' }))).items

        for (const item of tmp) {
            let pos = items.findIndex((el) => { return el.name === item.name })
            if (pos === -1) {
                items.push(item)
                items[items.length - 1].quantity = 1
                
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
const checkLists = function (name = "", whitelist = [], blacklist = []) {
    if (whitelist.includes(name))
        return 2
    else if (blacklist.includes(name))
        return 1
    else
        return 0

}

const filter1part1 = function ({ item, Wfrom = 10, Bto = 0.3, } = {}) {
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
// glowny plik do zbierania danych z wielu stron, wszak analiza wszędzie jest taka sama, od razu dane wszystkich stron mialbym posegregowane w jednym miejscu

// .liststatus
// 2 - whitelist
// 1 - blacklist
// 0 - nothing
var TEST = false

    ;// Main:
(async () => {
    var smreqdata
    var data = {}
    data.sites = {}
    data.sites["rustbet"] = { info: { name: "rustbet", filter1: true }, data: [] }  // key schould === .name
    data.sm_items = []
    /*if (TEST===true)
    {
        let datatmp = readData('./tmp/data.txt')
        if (!datatmp)
            return false
        data = datatmp 
        console.log("LOADED PREV DATA");
    }*/

    try {    // Getting headers from file
        smreqdata = JSON.parse('{' + fs.readFileSync(PATH_HEADER, "utf8") + '}')
    } catch (err) {
        console.log('Headers file error:')
        console.log(err);
        return false
    }

    //if(TEST!==true) //for testing purposes only
    //{

    { // Preparing all items:

        // Preparing rb_iems
        {
            let rb_fetch_result = await prepareRbItems(PATH_RB_ITEMS)

            if (rb_fetch_result.success === false) {
                console.log(rb_fetch_result.error)  // log err
                return false
            }
            else    // if good
                data.sites["rustbet"].data.push(...rb_fetch_result.items)
        }

        // Preparing sm_market database:
        {
            data.sm_items.push(...JSON.parse(fs.readFileSync(PATH_SM_ITEMDB, { encoding: 'utf8', flag: 'r' })))
        }
    }

    { // Adding nameid to items
        let stats = {}  // statistics of found/not found items etc

        { // "rustbet":
            stats.rb = {}
            stats.rb.found = 0
            stats.rb.notfound = []
            let rbdata = data.sites["rustbet"].data
            // sitesplace
            for (let i = 0; i < rbdata.length; i++) {
                let currname = rbdata[i].name
                let found = data.sm_items.find(el => el.name === currname)
                if (found === undefined) {
                    stats.rb.notfound.push(currname)
                    rbdata.splice(i,1)
                    i--
                    continue
                }
                stats.rb.found++
                rbdata[i].nameid = found.nameid
                //console.log(`Item found: ${found.name}`)
            }
        }

        { // Showing statistics, errors
            const SPACE = "      "
            console.log("Nameids added");
            console.log("\nRustbet:")
            console.log(SPACE + `${stats.rb.found}/${data.sites["rustbet"].data.length + stats.rb.notfound.length} items found in smdb\n`)

            if (stats.rb.notfound != false)
                console.log(SPACE + `Not found: \n${stats.rb.notfound}\n`)
        }
    }

    // Lists fetched from steam market search in filter 1.2 (by getMarketWBlists), needed to avoid repeating the same market fetches for all sites:
    var whitelist_smmarket = []
    var blacklist_smmarket = []

    { // Popularity on steam market (filter 1.2 loading)
        let wbresult = await getMarketWBlists({req_data:smreqdata, popularx100:3, unpopularx100:13 }) // await?
        if (wbresult.success == true) {
            whitelist_smmarket = wbresult.whitelist
            blacklist_smmarket = wbresult.blacklist
        } else {
            console.log(wbresult.err)
            console.log("TENTEN");
            return false    //TODO obsluga bledu, np globalna lista bledow wyswietlana pod koniec
        }
    }

    var results = {}    // results.<sitename>.<resulttype>

    // MAIN SITES LOOP
    for (let sitename in data.sites) {// sites:
        var sitedata = data.sites[sitename].data

        { // Filter 1

            { // Site price
                let b = 0, w = 0 // counters
                for (let itemnr = 0; itemnr < sitedata.length; itemnr++) {
                    let item = sitedata[itemnr]
                    // Notify if negative price value:
                    if(item.price <= 0)
                        console.log(`======================= NEGATIVE PRICE VALUE IN ${item.name} =======================`)
                    
                    let result = filter1part1({ 'item': item })
                    if (result.success)
                    {
                        if (result.list === 2)
                            w++
                        else if (result.list === 1)
                            b++
                        item.liststatus = result.list
                    }else
                    {
                        console.log(`F1.1 Error in item ${item.name}:`);
                        console.log(result.error);
                    }
                }
                console.log(`\n\n1.1: \nWhitelisted: ${w} \nBlacklisted: ${b}`)
            }

            { // Filter 1.2 with display
                let w = 0, b = 0    // counters

                // sitesplace
                for (let i = 0; i < sitedata.length; i++) {
                    let item = sitedata[i]
                    if (item.liststatus === 1 || item.liststatus === 2) 
                        continue

                    // >here< only items with liststatus == 0 or undefined

                    let itstat = checkLists(item.name, whitelist_smmarket, blacklist_smmarket)

                    if (itstat === 2) { item.liststatus = itstat; w++ }         // Ifs for counting 
                    else if (itstat === 1) { item.liststatus = itstat; b++ }
                }


                console.log(`\n\nF 1.2 ${sitename}: Whitelisted: ${w} \nBlacklisted: ${b}`)
            }

        }

        { // Fetching sm data for each item      
            let tstart, tend // Measuring time
            // Rustbet: 

            tstart = Date.now()
            let count = 0
            // sitesplace
            for (let itemtabnr = 0; itemtabnr < sitedata.length; itemtabnr++) 
            {
                let item = sitedata[itemtabnr]
                count++
                if (item.liststatus === 1)  // If blacklisted
                    continue

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

        //{   // for testing purposes only
        //    if (TEST!==true)
        //    {storeData(data,'./tmp/data.txt')}
        //}

        { // Calculating .roe
            // sitesplace
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


        { // Sorting by roe
            // sitesplace
            results[sitename] = { roe: [] }
            let restab = results[sitename].roe

            for (let itemnr = 0; itemnr < sitedata.length; itemnr++) {
                let item = sitedata[itemnr]
                if (item.liststatus !== 1)
                    restab.push(item)
            }

            restab.sort((a, b) => { return a.roe - b.roe })    // asc TODO close this callback in separate func
        }

        { // Filter 2 (when we know real price of those items and roe)

            // sitesplace
            for (let itemnr = 0; itemnr < sitedata.length; itemnr++) 
            {
                let item = sitedata[itemnr]

            }


        }

        { // Getting volume from priceoverview

        }

        { // Filtering 3 

        }

    }

    { // Display
        let sredni_kurs_suma = 0
        let sredni_kurs_count = 0
        for (let sitename in data.sites)  //TODO check if it is good
        {
            console.log(`\n       ${sitename}:`)
            console.log("\n       Rate of exchange: \n");
            for (item of results[sitename].roe) {
                //if(item.roe<4.5)
                //    break
                if (item.liststatus === 2)
                    console.log(`==wl== ${item.name} :  ${item.roe}\n`);
                else
                    console.log(`       ${item.name} :  ${item.roe} \n`);

                sredni_kurs_suma += item.roe
                sredni_kurs_count++
            }

        }
        console.log(`\nŚredni kurs tych przedmiotów to ${sredni_kurs_suma / sredni_kurs_count}`);
    }

    //  0,85 * kN/kS - 1 = suma gry

    //optymalizacja:
    //fetchowanie sm tylko w danym zakresie cenowym (dział 'filtering' tuz po preparing)

    //obsluga bledow przy kazdym json parse

})();//end main IFEE func


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
    liststatus : 2
  }
*/