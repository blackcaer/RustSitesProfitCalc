const request = require("request");

//input: site url
//output: JSON parsed resp.body from request to site

const getSite = async function(options={})
{

    return new Promise((resolve,reject)=> 
    {
       request.get(options,(error,response)=>      // changed from request() to request.get()
       {
            if(error)
                {reject("In getSite: "+error)}
            else
                resolve(response)
        })
    }
    )
}

module.exports={
    getSite : getSite,
}
