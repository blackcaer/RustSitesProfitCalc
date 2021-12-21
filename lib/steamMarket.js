const site = require("./sitereq_sm.js")
const analyzer = require("./analyzer_sm.js")
/*
async function getItemData(item_nameid)
{  


;
}*/
//the function has same output as getHistogram for now, maybe in the future there'll be more data to get through getItemData
//input: item_nameid (number)
//output: JSON parsed resp.body from request to 'https://steamcommunity.com/market/itemordershistogram?country=pl&language=polish&currency=6&item_nameid=${item_nameid}&two_factor=0&norender=1'
async function getItemData(item_nameid)
{  
    let err=false
    let reason
    var return_item_data = {}                       //TODO zrob zeby do tego obiektu bylo przypisywane konkretne odpowiedzi, return_item_data.histogram / .priceeoverview]
    await site.getHistogram(item_nameid).then 
    (
        (item_data)=>
         {
            return_item_data=item_data
         }, 
        (error_msg)=>
        {
            reason=error_msg
            err=true
        }
    )

    // TODO volume

    return new Promise((resolve,reject)=>
    {
        if(err)
            reject(reason)
        resolve(return_item_data)
    }
    )
}

//==================================================================================================================================================================================
//==================================================================================================================================================================================

//input: [
//    sh_name: "" , nameid: <number>}]
//output: ay with objects with getHistogram output + attributes .hash_name .nameid (assigned from input array)
const prepareAllData = async(items,toPrepare=50)=>
{
/* It does getItemData on every item.nameid, assigns .hash_name and .nameid to the item if resolved, shows status after every iteration on the items array and shows summary after 
all items have been processed. Executing the isLowOffer if resolved*/

    /*=========================================================GETTING ITEMS DATA:
    */
    let cod_status={total: 0,successCount:0,failureCount:0,getItemError_tab:[]}  //cod_status - collectingDataStatus 

    let data=[];

    if(toPrepare>items.length)
        toPrepare=items.length

    for(let i=0;i<toPrepare;i++)//items.length;i++)
    {
        const item_name=items[i].hash_name;
        const item_nameid=items[i].nameid;
        await getItemData(items[i].nameid).then
        (
            (item_data)=>{
                item_data.hash_name=item_name;
                item_data.nameid=item_nameid;
                let status;
                if(item_data.success == 1)  
                    { cod_status.successCount=cod_status.successCount+1; status = "SUCCESS" }     //counter and status
                else
                    { cod_status.failureCount=cod_status.failureCount+1; status = "FAILURE" }     //counter and status

                console.log(`${i+1}.${status}  item_name: ${item_name} (${item_nameid})`)
                data.push(item_data);
                
            },
            (reason)=>{ cod_status.failureCount=cod_status.failureCount+1, cod_status.getItemError_tab.push({item_name: item_name, item_nameid: item_nameid,errorReason: reason})}       //counter
        )
        cod_status.total=cod_status.total+1           //counter
    }

    //=========================================================showing summary after getting data:
    console.log(`\nCollecting data ended, ${cod_status.successCount} succeeded of ${cod_status.total} processed, ${cod_status.failureCount} item failed including ${cod_status.getItemError_tab.length} getItemErrors \n`)
    
    console.log(cod_status.getItemError_tab)
return data;    
}
;

//=====================================================================================================================================================================================
//=====================================================================================================================================================================================

module.exports = {
    //price : price,
    histogram : site,
    analyzer : analyzer,
    prepareAllData : prepareAllData,
    getItemData : getItemData
}