/* V3 version changes:
Input is not needed because it will fetch it through the api
*/

const sm = require("./sitereq_sm")
const fs = require('fs');

const PATH_DATABASE="./getnameid_dbs/Items252490.js"
const PATH_NEWDB="./getnameid_dbs/"


function isHashInDatabase(hashName,currentDatabase) 
{
for(let iter=0;iter<currentDatabase.length;iter++)
{
    if(currentDatabase[iter].hash_name===hashName)
            return iter
}
return false
}


function loadDatabase(databaseFile)
{
    if(fs.existsSync(databaseFile))
        return JSON.parse(fs.readFileSync(databaseFile,"utf8"))       //loading database file
    else
        return false
}


function wait(ms) { 
    return new Promise(resolve => {setTimeout(()=>{resolve()}, ms)}) 
}


async function getChunkOfSteamMarket(start,count){
    /* returning {"success" : false, "error" : Array} if error
    returning {"success" : true, "result" : Array ,"error" : []} if good */
    
    const cd_tooManyRequest_error=301000
    let TMRerrInRow=0
    let items=[]
    let hash=''
    let response
    while(true){
        console.log(start)
        await sm.getMarketSearch(count,start).then((res,err)=>{

            if(err)
            {
                console.log(err+" error getnameid loop")                // TODO delete
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
        let result = {"success" : true, "error" : [], "result_data" :{ "total_count": response.total_count, "start" : response.start, "pagesize" : response.pagesize}, "result" : []}
        
        for(let j = 0; j<response.results.length; j++)
        {
            hash = response.results[j].hash_name
            items.push({
            "name" : response.results[j].asset_description.name,
            "hash_name" : hash, 
            "market_name" : response.results[j].asset_description.market_name,
            "classid" : response.results[j].asset_description.classid,
            "appid" : response.results[j].asset_description.appid,
            "link" : `https://steamcommunity.com/market/listings/${response.results[j].asset_description.appid}/${hash}`,
            "icon_url" : "https://community.akamai.steamstatic.com/economy/image/" + response.results[j].asset_description.icon_url,
            "icon_url_large" : "https://community.akamai.steamstatic.com/economy/image/" + response.results[j].asset_description.icon_url_large,
            "background_color" : response.results[j].asset_description.background_color,
            "name_color" : response.results[j].asset_description.name_color,
            "market_tradable_restriction" : response.results[j].asset_description.market_tradable_restriction,
            "market_marketable_restriction" : response.results[j].asset_description.market_marketable_restriction,
            "marketable" : response.results[j].asset_description.marketable
        })
        }
        result.result = items
        return result
    }
    else
        {
            return {"success" : false, "error" : ["Error: getMarketSearch returned failure"]}
        }
}


//===============================================================MAIN:
;(async()=>
{
    var database=loadDatabase(PATH_DATABASE)
    var items=[]

    if(database===false)
    {
        console.log(`Database file ${PATH_DATABASE} doesn't exist`); 
        return false
    }
    
    {   // Fetching steam market
        let start=Date.now()    //time for progress message
        const count=100
        let total_count=0

        let precursor = await getChunkOfSteamMarket(0,1)
        if(precursor.success==false)
        {
            console.log(precursor.error)
            return false
        }
        total_count = precursor.result_data.total_count

        console.log("Total_count: " + total_count)

        TMRerrInRow=0

        for (let start = 0; start<total_count; start+=count)
        {
            let chunk = await getChunkOfSteamMarket(start,count)

            if (chunk.success==false)
            {
                console.log(chunk.error)
                continue
            }
            
            items.push(...chunk.result)
        }

        let end=Date.now() 
        console.log(`End of fetching items' market data, items fetched: ${items.length}, took: ${end-start}ms`)
    }

    {   // Making a filename for new db
        let output_file_tmp=PATH_NEWDB+"Items"+items[0].appid+".js"            //making a name for output file that'll be containing data of already done items
        let file_count=0
        while(fs.existsSync(output_file_tmp))                       // making an unical name
        {
            file_count++
            output_file_tmp=PATH_NEWDB+"Items"+items[0].appid+"_"+file_count+".js"
        }
        var output_filename = output_file_tmp
    }
    var stream_newdb = fs.createWriteStream(output_filename, {flags:'a',encoding: 'utf8'})    //making an append stream to new database
    stream_newdb.on('error', function(err) { console.error(err + "ERROR: stream_newdb") })

    stream_newdb.write('[')   // opening Array for JSON
    {   // Getting nameid (from db or by fetching) and saving it to new db
        
        const itemsLength=items.length
        let alreadyWasInDatabase=0
        let position,pref

        for(let i=0;i<itemsLength;i++)  // Main loop
        {
            position = isHashInDatabase(items[i].hash_name,database)
            if(position || position===0)
                {
                    alreadyWasInDatabase++
                    items[i].nameid = database.splice(position, 1)[0].nameid

                    if(i)
                        stream_newdb.write(',')            // saving items that have already been in database
                    stream_newdb.write(JSON.stringify(items[i]))

                    console.log(`${i+1}/${itemsLength}, Record found on position: ${position} (${items[i].hash_name})`)
                    continue;
                }
            
            let start=Date.now()    //time for progress message
            items[i].nameid = await sm.getNameid(items[i].link,true,true)      // getting nameid for the item
            let end=Date.now()      //time for progress message
            
            if(i)
                stream_newdb.write(',')              // saving new items
            stream_newdb.write(JSON.stringify(items[i]))
            
            console.log(`${i+1}/${itemsLength} ${items[i].hash_name}: ${items[i].nameid}, took ${end-start}ms`)   //showing progress message [curr_item/total  hash_name: nameid, took ...ms]
        }
        console.log(alreadyWasInDatabase+" records already was in database")
    }

    {   // Handling ommited files
        if(database.length!=0){
            console.log(database.length+" items from previous database was ommited: ")
            
            for (let i of database)
            {
                console.log(`Hash name: ${i.hash_name}`)
                console.log(`Nameid: ${i.nameid} \n`)
            }
            for (ommited of database)
                stream_newdb.write(','+JSON.stringify(ommited))
            console.log(database.length + " Ommited files saved")
        }       // TODO
    }
    stream_newdb.write(']')   // closing Array for JSON


})()    //main IFEE

