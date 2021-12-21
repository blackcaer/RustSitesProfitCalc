//const fs=require('fs')    //file stream
//const prompt = require('prompt')
const rb = require('./lib/sitereq_rb.js')
const sm = require('./lib/sitereq_sm')


// Main:
;
(async()=>{
    var data=[]
    var rb_items=[]

while(1)    // fetch rb items
{
    let chunk = [1,2,3,4]
    //chunk = rb.getItemsChunk()
    
    chunk.forEach(element => {
        if(!(element in rb_items))
            rb_items.push(element)
    })
    console.log(chunk)

    console.log("XXX: ",rb_items)
    if(1)   // TODO
        break
}
console.log("1")

// pobierz dane ze strony bez kopii 
//gotowa tablica z itemami (obiekty?)
//pobranie danych ze steama 
//analiza



})();//end main IFEE func


// https://rustbet.com/api/steamInventory   jesli zalogowany
// https://rustbet.com/api/upgrader/stock?order=1&max=20