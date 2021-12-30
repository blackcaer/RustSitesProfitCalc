const site = require("./getSite.js")


const getHistogram = async function({nameid,req_data={}})
{
    let err=undefined
    let resp=undefined
    options = {...req_data, url : `https://steamcommunity.com/market/itemordershistogram?country=pl&language=polish&currency=6&item_nameid=${nameid}&two_factor=0&norender=1`}

    await site.getSite(options).then( 
        (response,error)=>{
            err=error
            resp=JSON.parse(response)
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

const getPriceHistory = async function({appid,hash_name,req_data={}})
{
    let err=undefined
    let resp=undefined

    options = {...req_data, url : `https://steamcommunity.com/market/pricehistory/?appid=${appid}&market_hash_name=${hash_name}`}

    await site.getSite(options).then(
        (response,error)=>{
            err=error
            resp=JSON.parse(response)
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

const getPriceOverview = async function({appid,hash_name,req_data={}})
{
    let err=undefined
    let resp=undefined
    options = {...req_data, url : `https://steamcommunity.com/market/priceoverview/?appid=${appid}&market_hash_name=${hash_name}`}

    await site.getSite(options).then(
        (response,error)=>{
            err=error
            resp=JSON.parse(response)
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

function wait(ms) { 
    return new Promise(resolve => {setTimeout(()=>{resolve()}, ms)}) 
}

const getNameid = async({item_site,logErr=false,logInfo=false,req_data={}}={})=>
{
    const cd_html_error=60000
    const cd_tooManyRequest_error=301000
    var cd_time=0
    var errInRow=0
    var htmlDocument
    options = {...req_data, url : item_site}
    while(true)
    {
        if(errInRow>0)
        {
            if(logInfo)
                    console.log(`Cooldown activated, cooldown time: ${cd_time/1000}s `),
            await wait(cd_time).then(()=>{
                if(logInfo)
                    console.log(`Additional attempt nr ${errInRow} started`)
                })
        }
        console.log(options)
        
        await site.getSite(options).then(
            (response,error)=>{
                if(error){
                    if(logErr)
                        console.log("HTML ERROR:",error)
                    errInRow++
                    cd_time=cd_html_error
                }
                htmlDocument=response
            })

        var pos=htmlDocument.search('rSpread')
        if(pos==-1)                                //if too much requests
        {
            errInRow++;
            cd_time=cd_tooManyRequest_error
            continue;
        }
        break;
    }

    let nameid=""
    for(let i=9;i<20;i++)
    {
        let character=htmlDocument[pos+i]
        if(character!=" ")
            nameid=nameid+character
    }

    return parseInt(nameid)
}

const getMarketSearch = async({count=100,start=0,search_descriptions=0,sort_column='popular',sort_dir='desc',appid=252490,req_data={}}={})=>
{   // Fetching https://steamcommunity.com/market/search/render/?query=&start=${start}&norender=1&count=${count}&search_descriptions=${search_descriptions}&sort_column=${sort_column}&sort_dir=${sort_dir}&appid=${appid}
    // https://steamcommunity.com/market/search/render/?query=&start=0&norender=1&count=100&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=252490
    
    return new Promise((resolve,reject)=>{
        options = {...req_data, url : `https://steamcommunity.com/market/search/render/?query=&start=${start}&norender=1&count=${count}&search_descriptions=${search_descriptions}&sort_column=${sort_column}&sort_dir=${sort_dir}&appid=${appid}`}

        site.getSite(options).then(    
            (response,error)=>{
                if(error)
                    reject(error+' getMarketSearch')
                resolve(response)

            }
        )
    })
}

async function getChunkOfSteamMarket({start=0,count=100,req_data={}}={}){
    /* returning {"success" : false, "error" : Array} if error
    returning {"success" : true, "result" : Array ,"error" : []} if good */
    const cd_tooManyRequest_error=301000
    let TMRerrInRow=0
    let response
    while(true){
        console.log(start)
        await getMarketSearch({count,start,req_data}).then((res,err)=>{
            if(err)
            {
                return {"success" : false, "error" : [err]}
            }
            response = res
        })
        try{
            response = JSON.parse(response)
        }catch(error)
        {
            TMRerrInRow++
            if(TMRerrInRow<3)
                cd_time = cd_tooManyRequest_error
            else
                {
                    return {"success" : false, "error" : ["Cannot fetch proper JSON data in time"]}
                }
            console.log(`Activating cooldown time for too many requests (${cd_time/1000}s), attempt nr ${TMRerrInRow}`)
            await wait(cd_time)
            continue
        }
        break
    }
    
    if (response.success==true)
    {
        return {"success" : true, "error" : [], "data" : [...response.results], "info" :{ "total_count": response.total_count, "start" : response.start, "pagesize" : response.pagesize}}
    }
    else
        {
            return {"success" : false, "error" : ["Error: getMarketSearch returned failure"]}
        }
}

module.exports = 
{
    getHistogram : getHistogram,
    getPriceHistory : getPriceHistory,
    getPriceOverview : getPriceOverview,
    getNameid : getNameid,
    getMarketSearch : getMarketSearch,
    getChunkOfSteamMarket : getChunkOfSteamMarket,

}

