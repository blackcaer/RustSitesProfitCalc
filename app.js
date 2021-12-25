const fs=require('fs')    //file stream
//const prompt = require('prompt')
const rb = require('./lib/sitereq_rb.js')
const sm = require('./lib/sitereq_sm')

const NAME_RB_ITEMS="testsrc.txt"
const NAME_RB_ITEMSSHORT="testsrc_short.txt"

const PATH_RB_ITEMS="./src/"+NAME_RB_ITEMS//testsrc.txt"
const PATH_RB_ITEMSSHORT="./src/"+NAME_RB_ITEMSSHORT
const PATH_SM_ITEMDB="./src/itemdb.js"


const storeData = (data, path) => {
    try {
        fs.writeFileSync(path, JSON.stringify(data))
    } catch (err) {
        console.error(err)
    }
}

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
    if(!fs.existsSync(PATH_RB_ITEMSSHORT))
    {    
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
            if(isNotRedundant(item,rb_items))
                    rb_items.push(item)
        }
        storeData(rb_items,PATH_RB_ITEMSSHORT)
    }
    else
    {
        rb_items=JSON.parse(fs.readFileSync(PATH_RB_ITEMSSHORT,{encoding:'utf8',flad:'r'}))
        console.log("Rb items short loaded")
    }

    console.log("rb_items.length: ")
    console.log(rb_items.length)
    }//end preparing rb_iems

    var sm_itemsdb = JSON.parse(fs.readFileSync(PATH_SM_ITEMDB,{encoding:'utf8', flag:'r'}))
    
    //for (const i in rb_items)
    //{
    //    console.log(rb_items[i].name)
    //}

    for (let i=0; i<rb_items.length; i++)
    {
        sm_itemsdb.find(el=>el.name===rb_items[i].name)

        //znajdz w sm
        //dopsiz do niego obiekt sm
        //wyszukaj jego cene
        //analiza
    }

    // pobierz dane ze strony bez kopii 
    // pobranie danych ze steama 
    //do rbitems dodac kolejną property sm_data : {price: , realprice: , } etc.
    //analiza

})();//end main IFEE func


// https://rustbet.com/api/steamInventory   jesli zalogowany
// https://rustbet.com/api/upgrader/stock?order=1&max=20
// https://rustbet.com/api/upgrader/stock?order=-1&max=9999&count=28000
// https://steamcommunity.com/market/search/render/?query=&start=0&norender=1&count=100&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=252490



