/* V3 version changes:
Input is not needed because it will fetch it through the api
*/

const sm = require("./sitereq_sm")
const fs = require('fs');

const PATH_DATABASE="./getnameid_dbs/Items252490.js"
const PATH_NEWDB="./getnameid_dbs/"
const PATH_COOKIES="../src/cookies/steam_cookies.txt" // req_data={headers:{Cookie:fs.readFileSync(PATH_COOKIES,"utf8")}}
const PATH_HEADER="../src/cookies/steam_header.txt"
function wait(ms) { // Helper func for getData
    return new Promise(resolve => { setTimeout(() => { resolve() }, ms) })
}


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

const isNotRedundant = function(itemhash,arr){
    for(const arr_item of arr)
    {
        if (itemhash===arr_item.hash_name)
            return false
    }
    return true
}

//===============================================================MAIN:
;(async()=>
{
    var database=loadDatabase(PATH_DATABASE)
    var items=[]
    //var req_data={headers:{Cookie:fs.readFileSync(PATH_COOKIES,"utf8")}}    
    var req_data=JSON.parse('{' + fs.readFileSync(PATH_HEADER, "utf8") + '}') 

    if(database===false)
    {
        console.log(`Database file ${PATH_DATABASE} doesn't exist`); 
        return false
    }
    
    {   // Fetching steam market

        let start=Date.now()    //time for progress message
        const count=100
        let total_count=0

        let precursor = await sm.getChunkOfSteamMarket({start:0,count:1,req_data})
        if(precursor.success==false)
        {
            console.log(precursor.error)
            return false
        }
        total_count = precursor.info.total_count

        console.log("Total_count: " + total_count)

        TMRerrInRow=0

        let promisetab=[]

        for (let start = 0; start<total_count; start+=count)
        {
            
            promisetab.push(sm.getChunkOfSteamMarket({start:start,count:count,req_data:req_data,cd_tooManyRequest_error:31000,maxErrInRow:2}).then((chunk,err)=>{
                //console.log(chunk.info)
                if(err){
                    console.log(`Error while getting market data: (start=${start})`);
                    console.log(err)
                }
                else if (chunk.success!=true)
                {
                    console.log(`Error: response success is false (start=${start})`)
                    console.log(chunk.error)
                }else{
                //console.log(`chunk start: ${chunk.info.start}`)
                let hash
                for(let j = 0; j<chunk.data.length; j++)
                {
                    hash = chunk.data[j].hash_name
                    if (isNotRedundant(hash,items)){
                        items.push({
                            "name" : chunk.data[j].asset_description.name,
                            "hash_name" : hash, 
                            "market_name" : chunk.data[j].asset_description.market_name,
                            "classid" : chunk.data[j].asset_description.classid,
                            "appid" : chunk.data[j].asset_description.appid,
                            "link" : `https://steamcommunity.com/market/listings/${chunk.data[j].asset_description.appid}/${hash}`,
                            "icon_url" : "https://community.akamai.steamstatic.com/economy/image/" + chunk.data[j].asset_description.icon_url,
                            "icon_url_large" : "https://community.akamai.steamstatic.com/economy/image/" + chunk.data[j].asset_description.icon_url_large,
                            "background_color" : chunk.data[j].asset_description.background_color,
                            "name_color" : chunk.data[j].asset_description.name_color,
                            "market_tradable_restriction" : chunk.data[j].asset_description.market_tradable_restriction,
                            "market_marketable_restriction" : chunk.data[j].asset_description.market_marketable_restriction,
                            "marketable" : chunk.data[j].asset_description.marketable
                        })
                        
                    }else// if is duplicate:
                    {console.log(`Found duplicated item from market search: ${hash}`)}
                }}

            }))
            await wait(180)
        }
        
        await Promise.all(promisetab)
        
        let end=Date.now() 
        console.log(`\nEnd of fetching items' market data, items fetched: ${items.length}, took: ${end-start}ms\n`)
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
        let position

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
            items[i].nameid = await sm.getNameid({item_site:items[i].link,logErr:true,logInfo:true,req_data})      // getting nameid for the item
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
            console.log(database.length+" items from previous database was ommited: \n")
            
            for (let i of database)
            {
                console.log(`Hash name: ${i.hash_name}`)
                console.log(`Nameid: ${i.nameid} \n`)
            }
            for (ommited of database)
                stream_newdb.write(','+JSON.stringify(ommited))
            console.log(database.length + " Ommited files saved directly from old database")
        }       // TODO
    }
    stream_newdb.write(']')   // closing Array for JSON


})()    //main IFEE

