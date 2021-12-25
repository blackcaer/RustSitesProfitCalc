/* V3 version changes:
Input is not needed because it will fetch it through the api

DATABASE_FILE example:          (last output from getnameid)
{       "hash_name": "High Quality Crate",
        "appid": "252490",
        "link": "https://steamcommunity.com/market/listings/252490/High%20Quality%20Crate"
},{},{}...
*/

const sm = require("./sitereq_sm")
var fs = require('fs');
//const request=require("request")

const INPUT_ITEMS_FILE = "inputfrombrowser.js"  //INPUT: file with array with objects: {"hash_name": ,"appid": ,"link":<linkToSteammarketSite>}
const DATABASE_FILE="Items252490.js"

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
        return JSON.parse('['+fs.readFileSync(databaseFile,"utf8")+']')       //loading database file
    else
        return false
}

function saveItem(items,i){
    if(i>0)
            stream.write(','+JSON.stringify(items[i]))        
        else
            stream.write(JSON.stringify(items[i]))
}

//===============================================================MAIN:

;(async()=>
{
    let alreadyWasInDatabase=0
    var database=loadDatabase(DATABASE_FILE)
    
    if(!database)
    {
        console.log(`Database file ${DATABASE_FILE} doesn't exist`); 
        return false
    }

    //var items=JSON.parse(fs.readFileSync(INPUT_ITEMS_FILE, "utf8"))                      //load items
    var items=[]
    // Fetching steam market:
    {
        const count=100
        let total_count=0
        let hash=''
        await sm.getMarketSearch(1,0).then((resp,err)=>{(err || resp.success!=true) ? console.log(err+" error: wrong conditions?") : total_count = resp.total_count})  //TODO delete additional string from console log

        for (let start = 0; i<total_count; start+count)
        {
            sm.getMarketSearch(count,start).then((res,err)=>{
                if(err || resp.success!=true)
                    console.log(err+" error getnameid loop")                // TODO delete
                else
                {
                    for(let j = 0; j<res.results.length; j++)
                    {
                        hash = res.results[j].hash_name
                        items.push({"hash_name" : hash, "link" : `https://steamcommunity.com/market/listings/${res.results[j].asset_description.appid}/${hash}` })
                    }
                }
            })
        }

        await Promise.allSettled([sm.getMarketSearch()]).then(res=>console.log("dziala promise all? moze jakos to wykorzystac zamaist przypisywac za kazdym razem w petli"+res+"ZOBA NA GORE"))       //TODO delete
    }


    let output_file_tmp="Items"+items[0].appid+".js"            //making a name for output file that'll be containing data of already done items
    let count=0
    while(fs.existsSync(output_file_tmp))                       //making unical name
    {
        count++
        output_file_tmp="Items"+items[0].appid+"_"+count+".js"
    }
    const output_file = output_file_tmp
    
    var stream = fs.createWriteStream(output_file, {flags:'a',encoding: 'utf8'});    //making an append stream to output file
    stream.on('error', function(e) { console.error(e); });
    {           //setting i iterator

    const itemsLength=items.length
    let position
    for(let i=0;i<itemsLength;i++)  // Main loop
    {
        position = isHashInDatabase(items[i].hash_name,database)
        if(position || position===0)
            {
                alreadyWasInDatabase++
                items[i].nameid=database[position].nameid
                database.splice(position, 1)
               
                saveItem(items,i)           // saving items that have already been in database

                console.log(`${i+1}/${itemsLength}, Record found on position: ${position} (${items[i].hash_name})`)
                continue;
            }
        
        let start=Date.now()    //time for progress message
        items[i].nameid = await sm.getNameid(items[i].link,true,true)      // getting nameid for the item
        let end=Date.now()      //time for progress message
        
        saveItem(items,i)       // saving new items
            
        console.log(`${i+1}/${itemsLength} ${items[i].hash_name}: ${items[i].nameid}, took ${end-start}ms`)   //showing progress message [curr_item/total  hash_name: nameid, took ...ms]
    }
    }
    console.log(alreadyWasInDatabase," records already was in database")
    console.log(database.length," items from previous database was ommited (probably by a browser script): ")
    console.log(database)
})()    //main IFEE

