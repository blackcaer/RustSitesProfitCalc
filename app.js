const fs = require('fs')    //file stream

const rb = require('./lib/sitereq_rb.js')   // Needs to bypass cloudflare 
const sm = require('./lib/sitereq_sm')

const NAME_LOG_DATA = 'datalog'

const PATH_RB_ITEMS = "./src/rb_itemdb.txt"
const PATH_RBEQ_ITEMS = "./src/rbeq_itemdb.txt"
const PATH_RCH_ITEMDB = "./src/rch_itemdb.txt"
const PATH_RCHEQ_ITEMS = "./src/rcheq_itemdb.txt"
const PATH_RC_ITEMS = "./src/rc_itemdb.txt"

const PATH_RB_TEST = "./src/test/rb_test.txt"
const PATH_RBEQ_TEST = "./src/test/rbeq_test.txt"
const PATH_RCH_TEST = "./src/test/rch_test.txt"
const PATH_RCHEQ_TEST = "./src/test/rcheq_test.txt"
const PATH_RC_TEST = "./src/test/rc_test.txt"

const PATH_SM_ITEMDB = "./src/itemdb.js"

const PATH_COOKIES = "./src/cookies/steam_cookies_priceov.txt"
const PATH_HEADER = "./src/cookies/steam_header.txt"

const PATH_LOGS = "./logs/"

/**
 * 
 * @param {string} spaceindate 
 * @param {string} space 
 * @param {string} spaceintime 
 * @returns {string}
 */
Date.prototype.yyyymmddhhiiss = function (spaceindate = '', space = '', spaceintime = '') {
    let mm = this.getMonth() + 1; // getMonth() is zero-based
    let dd = this.getDate();
    let hh = this.getHours();
    let ii = this.getMinutes();
    let ss = this.getSeconds();

    let date =
        [this.getFullYear(),
        (mm > 9 ? '' : '0') + mm,
        (dd > 9 ? '' : '0') + dd
        ].join(spaceindate);

    let time =
        [(hh > 9 ? '' : '0') + hh,
        (ii > 9 ? '' : '0') + ii,
        (ss > 9 ? '' : '0') + ss
        ].join(spaceintime);

    return date + space + time
}

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
const filterroe = function (treshold, roe) {
    if (treshold === 0)
        return true
    else if (treshold > 0)
        return roe > treshold
    else // treshold < 0
        return roe < -treshold
}

const getMarketWBlists = async function ({ req_data = {}, count = 100, search_descriptions = false, sort_column = 'popular', sort_dir = 'desc', appid = 252490, popularx100 = 3, unpopularx100 = 13 } = {}) {      // TODO sprawdzic czy trzeba async dopisac
    // The most popular items *100 to whitelist
    // The most unpopular items *100 to blacklist
    let whitelist = [], blacklist = []
    let options = { count: count, search_descriptions: search_descriptions, sort_column: sort_column, sort_dir: sort_dir, appid: appid, req_data: req_data }

    let precursor = await sm.getChunkOfSteamMarket({ ...options, start: 0, count: 1 })    // To get totalitems value
    if (precursor.success == false) {
        console.log("Failed to run precursor in filter 1: ")
        console.log(precursor.error)
        return { 'success': false, 'error': ("Failed to run precursor in filter 1: " + precursor.error) }
    }
    let totalitems = precursor.info.total_count

    let promisetab = [] // Tab holding promises of all fetches in this filter

    // Whitelist: sm popular
    for (let i = 0; i < popularx100; i++) {
        let start = i * 100
        promisetab.push(sm.getChunkOfSteamMarket({ ...options, start: start }).then((resp, err) => {
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
    await Promise.allSettled(promisetab)
    let t2 = Date.now()

    console.log(`Market search data fetched in ${(t2 - t1) / 1000} s`)
    return { 'success': true, 'whitelist': whitelist, 'blacklist': blacklist }

}

/**
 * Reads JSON data from file, returns data as {success:boolean, items:Array} with no duplicates. Duplicate is whem item1.name === item2.name.
 * Function adds .quantity property to the item, which is number of items with the same .name.
 * @param {string} path - path to the database 
 * @param {string} name - name for attrib 'name' in the source data. Will be changed to 'name' in every item
 * @param {string} price - name for attrib 'price' in the source data. Will be changed to 'price' in every item
 * @returns {{'success':true, 'items':Array} | {'success':false, 'error':string} } 
 */
const prepareSite_default = function (path, items = "items", name = "name", price = "price") {
    var rdyitems = []
    if (fs.existsSync(path)) {
        try {
            let tmp = (JSON.parse(fs.readFileSync(path, { encoding: 'utf8', flag: 'r' })))[items]

            if (name !== "name")       // if name isn't unified
                for (const item of tmp) {
                    let curr_name = item[name]
                    delete item[name]
                    item.name = curr_name
                }
            if (price !== "price")       // if price isn't unified
                for (const item of tmp) {
                    let curr_price = item[price]
                    delete item[price]
                    item.price = curr_price
                }

            for (const item of tmp) {
                let pos = rdyitems.findIndex((el) => { return el.name === item.name })
                if (pos === -1) {
                    rdyitems.push(item)
                    rdyitems[rdyitems.length - 1].quantity = 1    // when this item is added first time, it will always be set to 1

                    continue
                }
                rdyitems[pos].quantity++
            }
        } catch (err) {
            return { "success": false, "error": err }
        }
    }
    else {
        return { "success": false, "error": `${path} not found` }
    }
    return { "success": true, "items": rdyitems }
}

const prepareSite = function (path, sitename) {
    let result
    try {
        if (sitename === "rch")
            result = { success: true, items: JSON.parse(fs.readFileSync(path, { encoding: "utf8" })) }
        else if (sitename === "rcheq") {
            let rdyitems = []
            //for(let item of JSON.parse(fs.readFileSync(path,{encoding:"utf8"})).items)
            //    if(item.market_hash_name )
            //        tmp.push({ name: item.market_hash_name, price: item.price/100, quantity: item.amount })
            for (let item of JSON.parse(fs.readFileSync(path, { encoding: "utf8" })).items) {

                let pos = rdyitems.findIndex((el) => { return el.name === item.market_hash_name })
                if (pos === -1) {
                    rdyitems.push({ name: item.market_hash_name, price: item.price / 100, quantity: item.amount })
                    rdyitems[rdyitems.length - 1].quantity = 1    // when this item is added first time, it will always be set to 1
                    continue
                }
                rdyitems[pos].quantity++
            }

            result = { success: true, items: rdyitems }
        }
        else if (sitename === "rc") {
            result = prepareSite_default(path, "inventory", "itemName", "itemPrice")
        }
        else
            result = prepareSite_default(path)
    } catch (error) { return { success: false, error: error } }

    if (result.success === false) {

        return { success: false, error: result.error }
    }

    return { success: true, items: result.items }

}

// glowny plik do zbierania danych z wielu stron, wszak analiza wszędzie jest taka sama, od razu dane wszystkich stron mialbym posegregowane w jednym miejscu

// .liststatus
// 2 - whitelist
// 1 - blacklist
// 0 - nothing

var C = {}

C.test = 1
C.testtype = 1  // 1,2
C.logData = 0
C.showItemNr = false

    ;// Main:
(async () => {
    var results = {}    // results.<sitename>.<resulttype>, results of sorting by resulttype ie by .roe
    // Lists fetched from steam market search in filter 1.2 (by getMarketWBlists), needed to avoid repeating the same market fetches for all sites:
    var whitelist_smmarket = []
    var blacklist_smmarket = []

    var smreqdata
    var data = {}
    data.sites = {}

    {   // Settings for every site

        data.sites["rb"] = { info: { name: "rb", path: PATH_RB_ITEMS, prepare: 1, filter1: true, filter2: true, filter3: true, fetchsmdata: true, calcroe: true, sortroe: true, displayroe: true, filterroe: 4 }, data: [] }  // key schould === .name

        data.sites["rbeq"] = { info: { name: "rbeq", path: PATH_RBEQ_ITEMS, prepare: 1, filter1: false, filter2: false, filter3: false, fetchsmdata: true, calcroe: true, sortroe: true, displayroe: true, filterroe: 0 }, data: [] }

        data.sites["rch"] = { info: { name: "rch", path: PATH_RCH_ITEMDB, prepare: 1, filter1: true, filter2: true, filter3: true, fetchsmdata: true, calcroe: true, sortroe: true, displayroe: true, filterroe: 3.4 }, data: [] }

        data.sites["rcheq"] = { info: { name: "rcheq", path: PATH_RCHEQ_ITEMS, prepare: 1, filter1: false, filter2: false, filter3: false, fetchsmdata: true, calcroe: true, sortroe: true, displayroe: true, filterroe: 0 }, data: [] }

        data.sites["rc"] = { info: { name: "rc", path: PATH_RC_ITEMS, prepare: 1, filter1: true, filter2: true, filter3: true, fetchsmdata: true, calcroe: true, sortroe: true, displayroe: true, filterroe: 4 }, data: [] }  // key schould === .name

        data.sm_items = []
    }

    // For testing:
    if (C.test) {
        if (C.testtype === 1) {
            C.logData = 1
            data.sites["rb"].info.path = PATH_RB_TEST
            data.sites["rbeq"].info.path = PATH_RBEQ_TEST
            data.sites["rb"].info.prepare = 1
            data.sites["rbeq"].info.prepare = 1

            // Turning off the rest
            data.sites["rch"].info.prepare = 0
            data.sites["rcheq"].info.prepare = 0
            data.sites["rc"].info.prepare = 0
        }
        else if (C.testtype === 2) {
            C.logData = 1
            data.sites["rb"].info.path = PATH_RB_TEST
            data.sites["rbeq"].info.path = PATH_RBEQ_TEST
            data.sites["rch"].info.path = PATH_RCH_TEST
            data.sites["rcheq"].info.path = PATH_RCHEQ_TEST
            data.sites["rc"].info.path = PATH_RC_TEST

            data.sites["rb"].info.prepare = 1
            data.sites["rbeq"].info.prepare = 1
            data.sites["rch"].info.prepare = 1
            data.sites["rcheq"].info.prepare = 1
            data.sites["rc"].info.prepare = 1

        } else {
            console.log("Wrong testtype");
            return false
        }
    }

    { // Getting headers from file
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

            if (siteinfo.prepare) {    // for testing
                tmp = prepareSite(siteinfo.path, sitename)
                if (tmp.success)
                    sitedata.push(...tmp.items)
                else {
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

        for (let sitename in data.sites) {
            if (!data.sites[sitename].info.prepare)
                continue

            stats[sitename] = {}
            stats[sitename].found = 0
            stats[sitename].notfound = []

            let sitedata = data.sites[sitename].data
            for (let i = 0; i < sitedata.length; i++) {
                let currname = sitedata[i].name     // item name
                let found = data.sm_items.find(el => el.name === currname)
                if (found === undefined) {      // if is in db
                    stats[sitename].notfound.push(currname)
                    sitedata.splice(i, 1)
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

    { // Popularity on steam market (data for filter 2)
        let wbresult = await getMarketWBlists({ req_data: smreqdata, popularx100: 3, unpopularx100: 13 }) // await?
        if (wbresult.success == true) {
            whitelist_smmarket = wbresult.whitelist
            blacklist_smmarket = wbresult.blacklist
        } else {
            console.log(wbresult.err)
            return false    //TODO obsluga bledu, np globalna lista bledow wyswietlana pod koniec
        }
    }

    {// Getting and analyzing data
        var fetched_smdata = []

        for (let sitename in data.sites) {// sites:
            let sitedata = data.sites[sitename].data
            let siteinfo = data.sites[sitename].info

            if (!data.sites[sitename].info.prepare)
                continue

            if (siteinfo.filter1) { // Filter 1 - Site price
                let b = 0, w = 0 // counters
                for (let itemnr = 0; itemnr < sitedata.length; itemnr++) {
                    let item = sitedata[itemnr]

                    // Notify if negative price value:
                    if (item.price <= 0)
                        console.log(`======================= NEGATIVE PRICE VALUE IN ${item.name} =======================`)

                    let result = filter1({ 'item': item })
                    if (result.success) {
                        if (result.list === 2)
                            w++
                        else if (result.list === 1)
                            b++
                        item.liststatus = result.list
                    } else {
                        console.log(`F1 ${sitename}: Error in item ${item.name}:`);
                        console.log(result.error);
                    }
                }
                console.log(`\nF1 ${sitename}: \nWhitelisted: ${w} \nBlacklisted: ${b}`)
            }

            if (siteinfo.filter2) { // Filter 2 with display
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

                console.log(`\nF2 ${sitename}: Whitelisted: ${w} \nBlacklisted: ${b}\n`)
            }

            if (siteinfo.fetchsmdata) { // Fetching sm data for each item      
                let tstart, tend // Measuring time
                // Rustbet: 

                tstart = Date.now()
                let count = 0
                let options = { cd_tooManyRequest_error: 5000, maxTMRerrInRow: 1, appid: 252490, nameid: null, hash_name: null, req_data: smreqdata, logErr: true, logInfo: true }
                let GDresp     // Variable holding actual response from getData (with histogram/priceoverview etc./), shortcut for getData response
                let promisetabs = {}
                promisetabs.histogram = []

                for (let itemtabnr = 0; itemtabnr < sitedata.length; itemtabnr++) {
                    let item = sitedata[itemtabnr]
                    if (item.liststatus === 1)  // If blacklisted
                        continue
                    count++

                    if (item.nameid in fetched_smdata)   // Read from cached data
                    {
                        if (C.showItemNr)
                            console.log(`Item nr ${count} : [DB]    ${item.name}`);    // status
                        item.sm_data = fetched_smdata[item.nameid]
                        continue
                    }
                    if (C.showItemNr)
                        console.log(`Item nr ${count} : [FETCH] ${item.name}`);    // status

                    options.nameid = item.nameid
                    options.hash_name = item.name
                    item.sm_data = { "status": { "allgood": true, "histogram": true } }     // if error, overwrite bad one to false and .allgood to false, TODO check if it is needed

                    options.type = "histogram"
                    promisetabs.histogram.push(sm.getData(options).then(
                        (resp) => {
                            if (resp.success == true && resp.response.success == true) {
                                item.sm_data.histogram = resp.response
                                if (fetched_smdata[item.nameid] === undefined)
                                    fetched_smdata[item.nameid] = {}
                                fetched_smdata[item.nameid].histogram = item.sm_data.histogram
                                fetched_smdata[item.nameid].status = item.sm_data.status

                            } else {
                                item.sm_data.status.allgood = false
                                item.sm_data.status.histogram = false

                                console.log(`Unknown error while getting histogram: `)
                                console.log(`GetData success: ${resp.success}`)
                                if (erresp.response != undefined)
                                    console.log(`Histogram success: ${resp.response.success}`)
                            }
                        },
                        (erresp) => {
                            item.sm_data.status.allgood = false
                            item.sm_data.status.histogram = false

                            console.log(`Error while getting histogram: "${erresp.error}"`)
                            console.log(`GetData success: ${erresp.success}`)
                            if (erresp.response != undefined)
                                console.log(`Histogram success: ${erresp.response.success}`)
                        }
                    ))
                }

                for (type in promisetabs)
                    await Promise.allSettled(promisetabs[type])

                tend = Date.now()

                console.log(`\nFetching all ${count} items for ${sitename} took ${(tend - tstart) / 1000} seconds\n`);
            }

            if (siteinfo.calcroe) { // Calculating .roe
                for (let itemnr = 0; itemnr < sitedata.length; itemnr++) {
                    let item = sitedata[itemnr]
                    if (item.liststatus === 1)  // if Blisted
                        continue

                    if (item.sm_data.status.histogram == true)
                        try {
                            item.roe = (item.sm_data.histogram.lowest_sell_order / 100) / item.price // steam price / site price
                        } catch (err) { console.log(`ERROR while trying to set roe for item ${item.name}: ${err}`) }
                    else
                        console.log(`Error: Item status for ${item.name} histogram is false`);
                }
            }

            if (siteinfo.sortroe) { // Sorting by roe
                results[sitename] = { roe: [] }
                let restab = results[sitename].roe

                for (let itemnr = 0; itemnr < sitedata.length; itemnr++) {
                    let item = sitedata[itemnr]
                    if (item.liststatus !== 1)
                        restab.push(item)
                }

                restab.sort((a, b) => { return a.roe - b.roe })    // asc TODO close this callback in separate func
            }

        }
    }

    // Saving logs of data
    if (C.logData) {
        try {
            let date = new Date()
            let fullpath = PATH_LOGS + NAME_LOG_DATA + date.yyyymmddhhiiss('-', '-', '-') + '.txt'
            storeData(data, fullpath)
        } catch (err) {
            console.log(`ERROR while trying to logData to "${fullpath}":\n ${err}`);
        }
    }

    // Display loop
    for (let sitename in data.sites) {
        if (!data.sites[sitename].info.prepare)
            continue

        let siteinfo = data.sites[sitename].info

        if (siteinfo.displayroe) { // Display roe
            let sredni_kurs_suma = 0
            let sredni_kurs_count = 0

            try {
                console.log(`\n\n\n       ====================== ${sitename} ======================`)
                console.log("       Rate of exchange: \n");
                for (item of results[sitename].roe) {
                    sredni_kurs_suma += item.roe
                    sredni_kurs_count++

                    if (!filterroe(siteinfo.filterroe, item.roe))
                        continue

                    if (item.liststatus === 2)
                        console.log(`==wl== ${item.name} :  ${item.roe}\n`);
                    else
                        console.log(`       ${item.name} :  ${item.roe} \n`);
                }
            } catch (err) {
                console.log(`Display roe error: ${err}`);
                continue
            }
            if (results[sitename].roe.length != 0)
                console.log(`\nŚredni kurs wszystkich sprawdzanych przedmiotów to ${sredni_kurs_suma / sredni_kurs_count}`);
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