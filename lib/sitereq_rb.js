const site = require('./getSite.js')

const getItemsChunk = async function(max=0,order=-1){

    let err=undefined
    let resp=undefined
    await site.getSite(`https://rustbet.com/api/upgrader/stock?order=${order}&max=${max}`).then(
        (response,error)=>{
            err=error
            resp=response
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