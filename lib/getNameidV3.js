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
const request=require("request")

const INPUT_ITEMS_FILE = "inputfrombrowser.js"  //INPUT: file with array with objects: {"hash_name": ,"appid": ,"link":<linkToSteammarketSite>}
const DATABASE_FILE="Items252490.js"
//const STRICT_MODE=false                //Non-strict mode is much faster, because it deletes a record from database variable whenever it finds a pair to it //EDIT:non strict mode may cause lack of items from prev db




function isHashInDatabase(hashName,currentDatabase) 
{
for(let iter=0;iter<currentDatabase.length;iter++)
{
    if(currentDatabase[iter].hash_name==hashName)
            return iter
}
return false
}

function loadDatabase(databaseFile)
{
    if(fs.existsSync(databaseFile))
        return JSON.parse('['+fs.readFileSync(databaseFile,"utf8")+']')       //loading items file
    else
        return false
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

    var items=JSON.parse(fs.readFileSync(INPUT_ITEMS_FILE, "utf8"))                      //load items

    /*{   // Remove duplicate items (so the STRICT MODE is not needed now)
        let deleted_count=0
        let deleted_items=[]
        for (let i=0; i<items.length; i++)
        {
            for (let j=i+1; j<items.length; j++)
            {    
                if (items[i].hash_name===items[j].hash_name)
                    {
                        deleted_items.push(items[j])
                        items.splice(j,1)
                        deleted_count++
                    }
            }
        }
        console.log(`Detected ${deleted_count} duplicate items: `)
        console.log(deleted_items)
    }*/

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
    for(let i=0;i<itemsLength;i++)
    {
        position = isHashInDatabase(items[i].hash_name,database)
        if(position || position===0)
            {
                alreadyWasInDatabase++
                items[i].nameid=database[position].nameid
                //if(!STRICT_MODE)
                    database.splice(position, 1)
                if(i>0)
                    stream.write(','+JSON.stringify(items[i]))        //saving ready items
                else
                    stream.write(JSON.stringify(items[i]))

                console.log(`${i+1}/${itemsLength}, Record found on position: ${position} (${items[i].hash_name})`)
                continue;
            }
        
        let start=Date.now()    //time for progress message
        items[i].nameid = await sm.getNameid(items[i].link,true,true)      //main process, getting nameid for the item
        let end=Date.now()      //time for progress message
        
        if(i>0)
            stream.write(','+JSON.stringify(items[i]))        //saving ready items
        else
            stream.write(JSON.stringify(items[i]))
            
        console.log(`${i+1}/${itemsLength} ${items[i].hash_name}: ${items[i].nameid}, took ${end-start}ms`)   //showing progress message [curr_item/total  hash_name: nameid, took ...ms]
    }
    }
    console.log(alreadyWasInDatabase," records already was in database")
    console.log(database.length," items from previous database was ommited (probably by a browser script): ")
    console.log(database)
})()    //main IFEE


/*
E:
cd programowanie/node-js/steammarket/app
color 0a
cls
node tmp.js
*/