const fs=require('fs')    //file stream
//const prompt = require('prompt')
const rb = require('./lib/sitereq_rb.js')
const sm = require('./lib/sitereq_sm')

const PATH_RB_ITEMS="./src/testsrc.txt"
const PATH_SM_ITEMDB="./src/itemdb.txt"

const isNotRedundant = function(item,arr){
    for(const arr_item of arr)
    {
        if (item.name===arr_item.name)
            return false
    }
    return true
}

;// Main:
(async()=>{

var data=[]
var rb_items=[]

{//preparing rb_iems

/*while(1)    // fetch rb items
{
    let chunk = []
    chunk = await rb.getItemsChunk()
    console.log(chunk)

    chunk.forEach(element => {
        if(!(element in rb_items))
            rb_items.push(element)
    })

    console.log("XXX: "+rb_items)
    if(1)   // TODO
        break
}*/

let tmp = JSON.parse(fs.readFileSync(PATH_RB_ITEMS,{encoding:'utf8', flag:'r'}))

for (const item of tmp)
{
   // console.log("item in tmp: "+item)
    if(isNotRedundant(item,rb_items))
            rb_items.push(item)
}
}//end preparing rb_iems

//console.log(rb_items)
console.log(rb_items.length)

let sm_itemsdb = JSON.parse(fs.readFileSync(PATH_SM_ITEMDB,{encoding:'utf8', flag:'r'}))

// pobierz dane ze strony bez kopii 
//gotowa tablica z itemami (obiekty?)
//pobranie danych ze steama 
//analiza



})();//end main IFEE func


// https://rustbet.com/api/steamInventory   jesli zalogowany
// https://rustbet.com/api/upgrader/stock?order=1&max=20
// https://rustbet.com/api/upgrader/stock?order=-1&max=9999&count=28000