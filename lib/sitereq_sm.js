const site = require("./getSite.js")


const getHistogram = async function(nameid)
{
    let err=undefined
    let resp=undefined
    await site.getSite(`https://steamcommunity.com/market/itemordershistogram?country=pl&language=polish&currency=6&item_nameid=${nameid}&two_factor=0&norender=1`).then(
        (response,error)=>{
            err=error
            resp=response
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
            resp=response
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
            resp=response
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

module.exports = 
{
    getHistogram : getHistogram,
    getPriceHistory : getPriceHistory,
    getPriceOverview : getPriceOverview
}