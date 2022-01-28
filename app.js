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

const PATH_COOKIES="./src/cookies/steam_cookies_priceov.txt"
const PATH_HEADER="./src/cookies/steam_header.txt"

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
const checkLists = function(name="",whitelist=[],blacklist=[]){
    if(whitelist.includes(name))
        return 2
    else if(blacklist.includes(name))
        return 1
    else
        return 0
    
}

const filter1part1 = function({item,Wfrom=10,Bto=0.3}={}){
    // needs .price
    let listAs = 0
    // sitesplace
    try{
        if (item.price < 0)     // whitelist
        {
            console.log(`======================= NEGATIVE PRICE VALUE AT ${item.name} =======================`)
            item.liststatus = listAs;w++
        } else if (item.price >= Wfrom)  // whitelist
            item.liststatus = listAs;
        else if (item.price <= Bto)    // blacklist
            item.liststatus = listAs;

        item.liststatus = listAs
    }catch(error){
        return {"success":false,"error":("filter1part1 error: "+error)}
    }
    return {"success":true,"list":listAs}

}

const filter1part2 = function({item}={}){
;

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
    data.sites={}
    data.sites["rustbet"]={info:{name:"rustbet",filter1:true},data:[]}

    /*if (TEST===true)
    {
        let datatmp = readData('./tmp/data.txt')
        if (!datatmp)
            return false
        data = datatmp 
        console.log("LOADED PREV DATA");
    }*/

    //var sites = [data.rb_items]
    //data.info.sites.type = ["rustbet"]   // .type[i] == site name in sites[i]
    //let siteinfo = data.info.sites

    try{    // Getting headers from file
    smreqdata = JSON.parse('{'+fs.readFileSync(PATH_HEADER,"utf8")+'}')
    }catch(err){
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
            // sitesplace
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

        { // Showing statistics, errors
            const SPACE = "      "
            console.log("Nameids added");
            console.log("\nRustbet:")
            console.log(SPACE + `${stats.rb.found}/${data.rb_items.length} items found in smdb\n`)

            if (stats.rb.notfound != false)
                console.log(SPACE + `Not found: \n ${stats.rb.notfound}\n`)
        }
    }

    // MAIN SITES LOOP
    for(let sitename in data.sites){// sites:
        var sitedata = data[sitename].data

        { // Filtering 1

            { // Site price
                let b=0,w=0
                for (let itemnr = 0; itemnr < sitedata[sitename].length; itemnr++)
                {
                    let result=filter1part1({'item':sitedata[itemnr]})
                    if (result.success && result.list!==0)
                        if(result.list===2)
                            w++
                        else if(result.list===1)
                            b++
                    else
                    {
                        console.log(`Error in item ${sitedata[itemnr].name}:`);
                        console.log(result.error);
                    }
                }
                console.log(`\n\n1.1: \nWhitelisted: ${w} \nBlacklisted: ${b}`)
            }

            // Lists fetched from steam market search, needed to avoid repeating the same market fetches for all sites
            let whitelist = []
            let blacklist = []

            { // Popularity on steam market
                let popularx100 = 3   // The most popular items *100 to whitelist
                let unpopularx100 = 13 // The most unpopular items *100 to blacklist
                
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
                for (let i = 0; i < popularx100; i++) 
                {
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
                for (let i = 0; i < unpopularx100; i++) 
                {
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
                let t1=Date.now()
                await Promise.all(promisetab)
                let t2=Date.now()

                console.log(`Market search data fetched in ${(t2-t1)/1000} s`)
            }

            { // Displaying info and setting liststatus after filtering 1.2 
                let w=0,b=0

                // sitesplace
                for (let i = 0; i < sitedata[sitename].length; i++) {
                    let item = sitedata[sitename][i]
                    if(item.liststatus===1 || item.liststatus===2)
                        continue
                    //console.log(whitelist,blacklist);

                    let itstat = checkLists(item.name, whitelist, blacklist)

                    if (itstat === 2) { item.liststatus = itstat; w++}
                    else if (itstat === 1) { item.liststatus = itstat; b++}
                }
                

                console.log(`\n\n1.2: Whitelisted: ${w} \nBlacklisted: ${b}`)
            }
            //console.log(`Items after filter 1: ${itemcount}\n`)
        }
        
        { // Fetching sm data for each item      
            let tstart,tend // measuring time
            // Rustbet: 
            
            tstart = Date.now()
            let count=0
            // sitesplace
            for (let itemtabnr = 0; itemtabnr < sitedata[sitename].length ; itemtabnr++) //itemnr < TMP_ITEM_LIMIT; itemnr++)
            {
                let item = sitedata[sitename][itemtabnr]     //shortcut
                
                if(item.liststatus===1)
                    continue
                
                console.log(`Item nr ${count} : ${item.name}`);    // status

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
                    if(tmp.response != undefined)
                        console.log(`Histogram success: ${tmp.response.success}`)
                    item.sm_data.status.allgood = false
                    item.sm_data.status.histogram = false
                }
                count++
                // reszta wsm useless poki co a problemy robi, priceoverview jest zawarte w histogramie
                /*
                options.type = "pricehistory"
                item.sm_data.pricehistory = await sm.getData(options)
                options.type = "priceoverview"
                item.sm_data.priceoverview = await sm.getData(options)
                */
            }
        
            tend = Date.now()

            console.log(`\nFetching all ${data.rb_items.length} items took ${(tend-tstart)/1000} seconds`);
        }

        //{   // for testing purposes only
        //    if (TEST!==true)
        //    {storeData(data,'./tmp/data.txt')}
        //}
        

        { // Calculating .roe
            // sitesplace
            for (let itemnr = 0; itemnr < sitedata[sitename].length; itemnr++) //data.rb_items.length; itemnr++)  TMP_ITEM_LIMIT
            {
                let item = sitedata[sitename][itemnr]
                if(item.liststatus===1)
                    continue
                    
                item.roe = (item.sm_data.histogram.lowest_sell_order/100) / item.price // steam price / site price
            }
        }

        var results={}
        
        { // Sorting by roe
            // sitesplace
            results[siteinfo.type[sitenr]] = {roe:[]}
            let restab = results[siteinfo.type[sitenr]].roe

            for (let itemnr = 0; itemnr < sitedata[sitename].length; itemnr++)
                {
                    let item = sitedata[sitename][itemnr]
                    if(item.liststatus !== 1)
                        restab.push(item)
                }
            
            restab.sort((a,b)=>{return a.roe-b.roe})    // asc
        
        }

        { // Filtering 2 (when we know real price of those items and roe)

            // sitesplace
            for (let itemnr = 0; itemnr < sitedata[sitename].length; itemnr++) //data.rb_items.length; itemnr++)  TMP_ITEM_LIMIT
            {
                ;

            }
        
    
        }

        { // Getting volume from priceoverview

        }

        { // Filtering 3 

        }

    }
    { // Display
        let sredni_kurs_suma=0
        let sredni_kurs_count=0
        for (sitename of data.info.sites.type)  //TODO change
        {
            console.log(`\n        ${sitename}:`)
            for(item of results[sitename].roe)
            {
                //if(item.roe<4.5)
                //    break
                if(item.liststatus===2)
                    console.log(`==wl==\n${item.name} :  ${item.roe}\n`);
                else
                    console.log(`${item.name} :  ${item.roe} \n`);
                
                sredni_kurs_suma += item.roe
                sredni_kurs_count++
            }
            
        }
        console.log(`\nŚredni kurs tych przedmiotów to ${sredni_kurs_suma/sredni_kurs_count}`);
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


