const site = require("./getSite.js")


const getHistogram = async function(nameid)
{
    let err=undefined
    let resp=undefined
    await site.getSite(`https://steamcommunity.com/market/itemordershistogram?country=pl&language=polish&currency=6&item_nameid=${nameid}&two_factor=0&norender=1`).then(
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

const getPriceHistory = async function(appid,hash_name)
{
    let err=undefined
    let resp=undefined
    await site.getSite(`https://steamcommunity.com/market/pricehistory/?appid=${appid}&market_hash_name=${hash_name}`).then(
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

const getPriceOverview = async function(appid,hash_name)
{
    let err=undefined
    let resp=undefined
    await site.getSite(`https://steamcommunity.com/market/priceoverview/?appid=${appid}&market_hash_name=${hash_name}`).then(
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

const getNameid = async(site,consoleErr=false,consoleInfo=false)=>
{
    const cd_html_error=60000
    const cd_tooManyRequest_error=301000
    let err=false
    let cd_time=0
    let errInRow=0
    while(true)
    {
        if(errInRow>0)
        {
            if(consoleInfo)
                consoleInfo.log(`Cooldown activated, cooldown time: ${cd_time/1000}s `),
            await wait(cd_time).then(()=>{
                if(consoleInfo)
                    consoleInfo.log(`Additional attempt nr ${errInRow} started`)
                })
        }

        await s.getSite(site).then(
            (response)=>{
                htmlDocument=response
            },
            (error)=>{
                if(consoleErr)
                    consoleInfo.log("HTML ERROR:",error)
                //err=true
                errInRow++
                cd_time=cd_html_error
            })

        //if(err)
        //{
        //    errInRow++
        //    cd_time=cd_html_error
        //}

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

const getMarketSearch = async(count=100,start=0,search_descriptions=0,sort_column='popular',sort_dir='desc',appid=252490)=>
{
    return new Promise((resolve,reject)=>{
        site.getSite(`https://steamcommunity.com/market/search/render/?query=&start=${start}&norender=1&count=${count}&search_descriptions=${search_descriptions}&sort_column=${sort_column}&sort_dir=${sort_dir}&appid=${appid}`).then(
            (response,error)=>{
                if(error)
                    reject(error+' getMarketSearch')
                resolve(JSON.parse(response.body))
            }
        )
    })
}


module.exports = 
{
    getHistogram : getHistogram,
    getPriceHistory : getPriceHistory,
    getPriceOverview : getPriceOverview,
    getNameid : getNameid,
    getMarketSearch : getMarketSearch,

}