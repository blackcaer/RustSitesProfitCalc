//const { Console } = require('console')
const fs = require('fs')    //file stream
//const prompt = require('prompt')
const rb = require('./lib/sitereq_rb.js')   // Needs bypass of cloudflare 
const sm = require('./lib/sitereq_sm')

const NAME_RB_ITEMS = "rb_itembd.txt"
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

    console.log(`items.length: ${items.length}`)

    return { "success": true, "items": items }
}

// glowny plik do zbierania danych z wielu stron, wszak analiza wszędzie jest taka sama, od razu dane wszystkich stron mialbym posegregowane w jednym miejscu

;// Main:
(async () => {
    var data = {}
    data.rb_items = []
    data.sm_items = []
    var sites = [data.rb_items]

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

            console.log("Rustbet:")
            console.log(SPACE + `${stats.rb.found}/${data.rb_items.length} items found in smdb\n`)

            if (stats.rb.notfound != false)
                console.log(SPACE + `Not found: \n ${stats.rb.notfound}\n`)
        }
    }
    
    { // Filtering 1

    }
    var itemcount = data.rb_items.length

    { // Fetching sm data for each item      
        let time_start,time_end // measuring time
        // Rustbet: 
        
        time_start = Date.now()
        let smheaders
        try{
        smheaders = JSON.parse(fs.readFileSync(PATH_HEADER,"utf8"))
        }catch(err){

        }

        //{headers:{Cookie:fs.readFileSync(PATH_COOKIES,"utf8")}} 
        //console.log(smheaders)
        for (let sitenr = 0; sitenr < 1; sitenr++) //sites.length; sitenr++) 
        {
            for (let itemnr = 0; itemnr < itemcount ; itemnr++) //itemnr < TMP_ITEM_LIMIT; itemnr++)
            {
                console.log(`Item nr ${itemnr}`);

                let item = sites[sitenr][itemnr]     //shortcut
                //let options = {cd_tooManyRequest_error:31000,maxTMRerrInRow:6,appid:252490, nameid:item.nameid, hash_name:item.name,req_data:{headers:{Cookie:fs.readFileSync(PATH_COOKIES,"utf8")}}, logErr:true, logInfo:true}
                let options = {cd_tooManyRequest_error:5000,maxTMRerrInRow:1,appid:252490, nameid : item.nameid, hash_name:item.name,req_data:smheaders, logErr:true, logInfo:true}
                let tmp     // Variable holding actual response from getData (with histogram/priceoverview etc./)
                item.sm_data = {"status":{"all":true,"histogram":true}}     // if error, overwrite bad one to false and .all to false
                
                options.type = "histogram"
                tmp = await sm.getData(options)
                if(tmp.success == true && tmp.response.success === 1)
                    item.sm_data.histogram = tmp.response   
                else
                {
                    console.log(`Error while getting histogram: "${tmp.error}", \n
                    success: ${tmp.success}\n
                    histogram.success: ${tmp.histogram.success}\n`)
                    item.sm_data.status.all = false
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

        console.log(`Fetching all ${data.rb_items.length} items took ${(time_end-time_start)/1000} seconds`);
    }

    { // Filtering 2 (when we know real price of those items)
        for (let sitenr = 0; sitenr < sites.length; sitenr++) 
        {
            for (let itemnr = 0; itemnr < itemcount; itemnr++) //data.rb_items.length; itemnr++)  TMP_ITEM_LIMIT
            {


            }
        }
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
                    if(item.roe>4.5)        // TODO temporary
                        result.push(item)
                }

            }
        }
    }

    console.log("XXXXXXXXXXXXXXXXXX")
    result.sort((a,b)=>{return b.roe-a.roe})  // zle dziala

    for (item of result)
    {
        console.log(`${item.name} :  ${item.roe} \n`);
    }

    //  (kurs nagrody * 0,85)/kurs beta -1 = game sum (??razcej ta)

    //for(let i=0;i<data.rb_items.length;i++)   // TODO delete test
    //{ 
        //console.log(data.rb_items[0]);
    //    console.log(`${data.rb_items[i].name} :  ${data.rb_items[i].roe}`);
        //console.log(data.rb_items[i].roe);
    //}
    
    //console.log(data)
    //X znajdz w sm
    //X dopsiz do niego obiekt sm (nie lepiej dolaczyc samo nameid? bo chyba starczy tyle)
    // wyszukaj jego cene do atrybutu-obiektu sm_data
    // analiza

    // pobierz dane ze stron bez kopii 
    // pobranie danych ze steama 
    //do rbitems dodac kolejną property sm_data : {price: , realprice: , } etc.
    //analiza steam
    //analiza stron

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


