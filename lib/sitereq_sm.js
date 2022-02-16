const { options } = require("request")
const gs = require("./getSite.js")

function wait(ms) { // Helper func for getData
    return new Promise(resolve => { setTimeout(() => { resolve() }, ms) })
}

const getData_wrongArgErr = (type, logErr = false) => { // Helper func for getData
    error = `Falsy argument in getData: ${type}`
    if (logErr)
        console.log(error)
    return { "success": false, "error": error }
}

const getNameid = async ({ item_site, logErr = false, logInfo = false, req_data = {} } = {}) => // Scrapper
{
    const cd_html_error = 60000
    const cd_tooManyRequest_error = 301000
    var cd_time = 0
    var errInRow = 0
    var htmlDocument
    let options = { ...req_data, url: item_site }
    while (true) {
        if (errInRow > 0) {
            if (logInfo)
                console.log(`Cooldown activated, cooldown time: ${cd_time / 1000}s `),
                    await wait(cd_time).then(() => {
                        if (logInfo)
                            console.log(`Additional attempt nr ${errInRow} started`)
                    })
        }

        await gs.getSite(options).then(
            (response, error) => {
                if (error) {
                    if (logErr)
                        console.log("HTML ERROR:", error)
                    errInRow++
                    cd_time = cd_html_error
                }
                htmlDocument = response.body
            })

        var pos = htmlDocument.search('rSpread')
        if (pos == -1)                                //if too much requests
        {
            errInRow++;
            cd_time = cd_tooManyRequest_error
            continue;
        }
        break;
    }
    let nameid = ""
    for (let i = 9; i < 20; i++) {
        let character = htmlDocument[pos + i]
        if (character != " ")
            nameid = nameid + character
    }

    return parseInt(nameid)
}

const getMarketSearch = async ({ count = 100, start = 0, search_descriptions = 0, sort_column = 'popular', sort_dir = 'desc', appid = 252490, req_data = {} } = {}) => // getData because it is not corelated with single item
{   // Fetching https://steamcommunity.com/market/search/render/?query=&start=${start}&norender=1&count=${count}&search_descriptions=${search_descriptions}&sort_column=${sort_column}&sort_dir=${sort_dir}&appid=${appid}
    // https://steamcommunity.com/market/search/render/?query=&start=0&norender=1&count=100&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=252490

    return new Promise((resolve, reject) => {
        let options = { ...req_data, url: `https://steamcommunity.com/market/search/render/?query=&start=${start}&norender=1&count=${count}&search_descriptions=${search_descriptions}&sort_column=${sort_column}&sort_dir=${sort_dir}&appid=${appid}` }

        gs.getSite(options).then(
            (response, error) => {
                if (error)
                    reject(error + ' getMarketSearch')
                resolve(response.body)
            }
        )
    })
}

async function getChunkOfSteamMarket({ start = 0, count = 100,search_descriptions = 0, sort_column = 'popular', sort_dir = 'desc', appid = 252490,req_data = {}, cd_tooManyRequest_error=301000,maxErrInRow=2} = {}) { 
    /* returning {"success" : false, "error" : Array} if error
    returning {"success" : true, "result" : Array} if good */

    let TMRerrInRow = 0
    let response
    let cd_time
    while(true){ // If somewhat data=[] and success=true idk why but it is happening when you try call multiple async calls
        while (true) {
            console.log(start)
            await getMarketSearch({ count, start, search_descriptions, sort_column, sort_dir, appid, req_data }).then((res, err) => {
                if (err) {
                    return { "success": false, "error": [err] }
                }
                response = res
            })

            try {
                response = JSON.parse(response)
            } catch (error) {
                TMRerrInRow++
                if (TMRerrInRow <= maxErrInRow)
                    cd_time = cd_tooManyRequest_error
                else {
                    return { "success": false, "error": ["Cannot fetch proper JSON data in time"] }
                }
                console.log(`Activating cooldown time for too many requests (${cd_time / 1000}s), attempt nr ${TMRerrInRow}`)
                await wait(cd_time)
                continue
            }
            break
        }

        if (response.success == true) {
            let tmp = { "success": true, "data": [...response.results], "info": { "total_count": response.total_count, "start": response.start, "pagesize": response.pagesize } }
            return tmp
        }
        else {
            return { "success": false, "error": "Error: getMarketSearch returned failure" }
        }
    }
}
/**
 * Getting item data. Better replacement for getHistogram, getPriceHistory, getPriceOverview. 
 * Handling too many requests err not explictly, because it retries after 'cd_tooManyRequest_error' ms maxTMRerrInRow times
 * @returns 
 */
const getData = async ({ type = "", appid = 252490, nameid = undefined, hash_name = "", logErr = false, logInfo = true, req_data = {}, cd_tooManyRequest_error = 301000, maxTMRerrInRow = 2, useRetryAfter: useRetryAfter = true } = {}) => {
    
    // Checking if the arguments are correct and setting site
    var site
    if (type === 'histogram') {
        if (!nameid)
            {return getData_wrongArgErr(type, logErr)}
        site = `https://steamcommunity.com/market/itemordershistogram?country=pl&language=polish&currency=6&item_nameid=${nameid}&two_factor=0&norender=1`

    } else if (type === 'pricehistory') {
        if (!appid || !hash_name) { return getData_wrongArgErr(type, logErr) }
        site = `https://steamcommunity.com/market/pricehistory/?appid=${appid}&market_hash_name=${hash_name}`

    } else if (type === 'priceoverview') {
        if (!appid || !hash_name)
            return getData_wrongArgErr(type, logErr)
        site = `https://steamcommunity.com/market/priceoverview/?appid=${appid}&market_hash_name=${hash_name}`

    } else { // Unknown type
        error = `Error getData: Unknown 'type' argument ("${type}")`
        if (logErr)
            console.log(error)

        return { "success": false, "error": error }
    }

    var TMRerrInRow = 0   // Too many requests err count
    var body
    var options = { ...req_data, url: site }
    let response
    while (true) { // getSite loop
        try {
            await gs.getSite(options).then((res, err) => {
                if (err) {
                    return { "success": false, "error": [err] }
                }

                response = res

            })
        } catch (error) {
            if (logErr)
                console.log(error)
            return { "success": false, "error": error }
        }

        try {
            var body = JSON.parse(response.body)
            //console.log(response)

        } catch (error) // || response.headers.htmlcode TODO
        {
            TMRerrInRow++
            if (TMRerrInRow <= maxTMRerrInRow)
                cd_time = cd_tooManyRequest_error
            else    // Too many tmr err, after
                return { "success": false, "error": ["Cannot fetch proper JSON data in time"] }

            if (logInfo) {
                if (useRetryAfter) {
                    let retryafter = response.headers["retry-after"]
                    if (retryafter && typeof (retryafter) == Number) {
                        cd_time = retryafter
                        console.log("(using retry-after header for cd time)")
                    }
                }

                console.log(`Activating cooldown time for too many requests (${cd_time / 1000}s), attempt nr ${TMRerrInRow}`)
                console.log(`Reason: ${error}`)
                console.log(`Status code: ${response.statusCode}`)
            }

            await wait(cd_time)
            console.log("[RETRYING]")
            continue
        }

        return { "success": true, "response": body }
    }
}


module.exports =
{
    //getHistogram : getHistogram,    // Replaced by getData
    //getPriceHistory : getPriceHistory,    // Replaced by getData
    //getPriceOverview : getPriceOverview,    // Replaced by getData
    getNameid: getNameid,
    getMarketSearch: getMarketSearch,
    getChunkOfSteamMarket: getChunkOfSteamMarket,
    getData: getData,
}

//TODO: odczytywanie danych z response.header, kodu 429 i osobno blad z json parse (?) oraz ewentualny naglowek try after czy cos


/* 
const getHistogram = async function({nameid,req_data={}})    // Replaced by getData
{   // i.e https://steamcommunity.com/market/itemordershistogram?country=pl&language=polish&currency=6&item_nameid=176077601&two_factor=0&norender=1
    let err=undefined
    let resp=undefined
    options = {...req_data, url : `https://steamcommunity.com/market/itemordershistogram?country=pl&language=polish&currency=6&item_nameid=${nameid}&two_factor=0&norender=1`}

    await gs.getSite(options).then( 
        (response,error)=>{
            err=error
            resp=JSON.parse(response.body)
        }
    )

    return new Promise((resolve,reject)=> 
    {
        if(err)
            reject(err+' histogram')
        resolve(resp)
    }
    )
}

const getPriceHistory = async function({appid,hash_name,req_data={}})    // Replaced by getData
{
    let err=undefined
    let resp=undefined

    options = {...req_data, url : `https://steamcommunity.com/market/pricehistory/?appid=${appid}&market_hash_name=${hash_name}`}

    await gs.getSite(options).then(
        (response,error)=>{
            err=error
            resp=JSON.parse(response.body)
        }
    )

    return new Promise((resolve,reject)=> 
    {
        if(err)
            reject(err+' priceHistory')
        resolve(resp)
    }
)
}

const getPriceOverview = async function({appid,hash_name,req_data={}})    // Replaced by getData
{
    let err=undefined
    let resp=undefined
    options = {...req_data, url : `https://steamcommunity.com/market/priceoverview/?appid=${appid}&market_hash_name=${hash_name}`}

    await gs.getSite(options).then(
        (response,error)=>{
            err=error
            resp=JSON.parse(response.body)
        }
    )

    return new Promise((resolve,reject)=> 
    {
        if(err)
            reject(err+' priceOverview')
        resolve(resp)
    }
    )
}
*/