const request = require("request");

//input: site url
//output: JSON parsed resp.body from request to site

const getSite = async function(site)
{

    return new Promise((resolve,reject)=> 
    {
       request.get(site,(error,response)=>      // changed from request() to request.get()
       {
            if(error)
                reject("ERROR getSite: "+error)
            else
                resolve(JSON.parse(response.body))
        })
    }
    )
}

module.exports={
    getSite : getSite,
}
