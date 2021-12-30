const site = require('./getSite.js')

const getItemsChunk = async function({max=0,order=-1,req_data={}}={}){

    let err=undefined
    let resp=undefined
    options = {...req_data,url:`https://rustbet.com/api/upgrader/stock?order=${order}&max=${max}`}

    await site.getSite(options).then(
        (response,error)=>{
            err=error
            resp=JSON.parse(response)
        }
    )
    return new Promise((resolve,reject)=>{
        
        if(err)
            reject(err +' histogram')
        resolve(resp)
    })
}

module.exports={
    getItemsChunk : getItemsChunk,
}