const { Console } = require('console')
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

const prepareRbItems = async function(path){
    
    if(!fs.existsSync(path))
    {    
        let tmp = JSON.parse(fs.readFileSync(path,{encoding:'utf8', flag:'r'}))

        for (const item of tmp)
        {
            if(isNotRedundant(item,rb_items))
                    rb_items.push(item)
        }
        storeData(rb_items,path)
    }
    else
    {
        rb_items=JSON.parse(fs.readFileSync(path,{encoding:'utf8',flad:'r'}))
        console.log("Rb items short loaded")
    }

    console.log("rb_items.length: ")
    console.log(rb_items.length)
}

// glowny plik do zbierania danych z wielu stron, wszak analiza wszędzie jest taka sama, od razu dane wszystkich stron mialbym posegregowane w jednym miejscu

;// Main:
(async()=>{
    var data=[]
    var rb_items=[]

    { //Preparing all items:
        //preparing rb_iems
        rb_items = await prepareRbItems(PATH_RB_ITEMSSHORT)
        var sm_itemsdb = JSON.parse(fs.readFileSync(PATH_SM_ITEMDB,{encoding:'utf8', flag:'r'}))
    }

    { // Analyzing

        //for (const i in rb_items)
        //{
        //    console.log(rb_items[i].name)
        //}

        //console.log(rb_items)
        let foundcount=0
        for (let i=0; i<rb_items.length; i++)
        {
            let currname = rb_items[i].name
            let found = sm_itemsdb.find(el=>el.name===currname)
            if(found===undefined)
                {
                    console.log(`Not found: ${currname}`);
                    continue
                }
            foundcount++
            console.log(`Item found: ${found.name}`)
            

            //X znajdz w sm
            // dopsiz do niego obiekt sm (nie lepiej dolaczyc samo nameid? bo chyba starczy tyle)
            // wyszukaj jego cene
            // analiza
        }
        console.log(`found: ${foundcount}/${rb_items.length}`);
        // pobierz dane ze strony bez kopii 
        // pobranie danych ze steama 
        //do rbitems dodac kolejną property sm_data : {price: , realprice: , } etc.
        //analiza
    } 

    
})();//end main IFEE func


// https://rustbet.com/api/steamInventory   jesli zalogowany
// https://rustbet.com/api/upgrader/stock?order=1&max=20
// https://rustbet.com/api/upgrader/stock?order=-1&max=9999&count=28000
// https://steamcommunity.com/market/search/render/?query=&start=0&norender=1&count=100&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=252490

/* rbitem:
 {
    _id: '61c34cfffe30de4d5795e396',
    name: 'Blackout Gloves',
    image: '6TMcQ7eX6E0EZl2byXi7vaVKyDk_zQLX05x6eLCFM9neAckxGDf7qU2e2gu64OnAeQ7835BZ4mLEfCk4nReh8DEiv5dYPaA9q7U0R_G_MCMIAFY',
    origin: 'steam',
    color: 'a7ec2e',
    locked: false,
    price: 7.2
  }
   */


