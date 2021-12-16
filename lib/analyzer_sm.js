//[important] IF YOU ARE ADDING PROPERTY TO ITEM.ANALYZER ADD IT TO isAnalizable !!!

const isAnalizable = function (item)
{
    if(item.analyzer==undefined)
        {item.analyzer={}}
    
    if(item.success!=1)
    {
        item.analyzerStatus = false
        item.analyzer.realSell={price: undefined, offer_nr : undefined, per_offer : undefined }
        item.analyzer.realBuy={price: undefined, offer_nr : undefined, per_offer : undefined }
        item.analyzer.analyzerStatus = undefined;
        item.analyzer.profit = undefined;
        item.analyzer.realSell = undefined;   
        item.analyzer.realBuy = undefined;
        item.analyzer.profitPercent = undefined;     
        item.analyzer.percentOnPrice = undefined; 
        item.analyzer.lowRealGap = undefined;
        item.analyzer.buyBorder = undefined;
        return false
    }
    item.analyzerStatus = true
    return true
}

//=====================================================================================================================================================================================
//=====================================================================================================================================================================================


/*have in mind, that highest_buy_order and lowest_sell_order are multipled by 100, 0,01 -> 1
input: 
    item - item from getSite (json parsed resp.body from gethistogram steam site)
    what - ("sellPrice"/"buyPrice")
    percentOffersToCheck - percent of sell/buy offers to check
    minOffersToCheck - minimum sell/buy offers to check, if the percentOffersToCheck times total offers is lower than minOffersToCheck
    (number of checked offers is equal to totla offers if there is less offers than minOffersToCheck)
output: real sell/buy offer object:
    {price:, offer_nr : , per_offer : }
        price - best sell/buy price 
        offer_nr - offer before which our offer will be, 0th offer - (lowest sell)/(highest buy) offer
        per_offer - per_offer factor, price_diff_tmp/offer_nr_tmp
    adding .analyzer.realSell object (AND/OR, depends which we're using)  .analyzer.realBuy object to an item
If item is not analizable, returning undefined
    */
const real=function(item,what="sellPrice",percentOffersToCheck=10,minOffersToCheck=20)
{
//if(item.analyzer==undefined)
//    item.analyzer={}
  
if(!isAnalizable(item))
    {return undefined}
    
if(what=="sellPrice")
{

    let lowest=item.lowest_sell_order/100    //lowest_sell_order is multipled by 100 by default
    let totalOffersInHistogram = item.sell_order_graph[item.sell_order_graph.length-1][1];
    if(totalOffersInHistogram<2)
        {
            item.analyzer.realSell=lowest
            return lowest   //TODO object!!
        }

    let offersToCheck
    (totalOffersInHistogram*percentOffersToCheck/100<minOffersToCheck)? offersToCheck=minOffersToCheck : offersToCheck=totalOffersInHistogram*percentOffersToCheck/100 ;
        
    let offers_tab=[];

    for(let i=1 ; i<item.sell_order_graph.length ; i++)    //i=1 cause on index 0 i lowest_sell_order  item.sell_order_graph[i][1]<offersToCheck
    {
        let offer_nr_tmp=item.sell_order_graph[i-1][1]      //there might be multiple offers like [1: 3 offers, 2: 8 offers ], so the second price level is placed after three offers, not eight
        if(offer_nr_tmp>offersToCheck)
            break;
        let price_tmp=item.sell_order_graph[i][0]
        let price_diff_tmp=price_tmp-lowest                //we calculate profitability in relation to the lowest order
        
        offers_tab.push({price: price_tmp, offer_nr : offer_nr_tmp, per_offer : price_diff_tmp/offer_nr_tmp })
    }
    //let first_el=offers_tab.shift()                              //removing first element from the table, it could generate not the most optimal result, because 

    //now we have to choose from offers_tab the best price
    let maxOffer=offers_tab[0]
    for(let x of offers_tab)
    {
        if(x.per_offer>maxOffer.per_offer)
            maxOffer=x
    }
    
    item.analyzer.realSell=maxOffer
    return maxOffer //object
}
else if(what=="buyPrice")
{

    let highest=item.highest_buy_order/100    //highest_buy_order is multipled by 100 by default
    let totalOffersInHistogram = item.buy_order_graph[item.buy_order_graph.length-1][1];
    if(totalOffersInHistogram<2)
    {
        item.analyzer.realBuy=highest
        return highest
    }

    let offersToCheck
    (totalOffersInHistogram*percentOffersToCheck/100<minOffersToCheck)? offersToCheck=minOffersToCheck : offersToCheck=totalOffersInHistogram*percentOffersToCheck/100 ;
        
    let offers_tab=[];

    for(let i=1 ; i<item.buy_order_graph.length ; i++)    //i=1 cause on index 0 i highest_buy_order  item.buy_order_graph[i][1]<offersToCheck
    {
        let offer_nr_tmp=item.buy_order_graph[i-1][1]      //there might be multiple offers like [1: 3 offers, 2: 8 offers ], so the second price level is placed after three offers, not eight
        if(offer_nr_tmp>offersToCheck)
            break;
        let price_tmp=item.buy_order_graph[i][0]
        let price_diff_tmp=highest-price_tmp                //we calculate profitability in relation to the lowest order
        
        offers_tab.push({price: price_tmp, offer_nr : offer_nr_tmp, per_offer : price_diff_tmp/offer_nr_tmp })
    }
    //let first_el=offers_tab.shift()                              //removing first element from the table, it could generate not the most optimal result, because 

    //now we have to choose from offers_tab the best price
    let max=offers_tab[0]
    for(let x of offers_tab)
    {
        if(x.per_offer>max.per_offer)
            max=x
    }

    item.analyzer.realBuy=max
    return max
}
else
{
    throw new Error(`Argument ${what} is not valid`);}
}

//=====================================================================================================================================================================================
//=====================================================================================================================================================================================


/*
input: {hash_name: "" , nameid: <number>}
output: estimated profit after buying an item on lowest sell offer and selling it at real sell price and adding .analyzer.lowRealGap
If failed, returning undefined
*/
/*
const lowRealGap = function(item,steamFeeFactor=1.15)   //checking if there is offer as low, that it could be sold immediately with profit
{
if(!isAnalizable(item))
    return undefined

let result=real(item,"sellPrice").price/steamFeeFactor-item.lowest_sell_order/100
item.analyzer.lowRealGap=result
return result
};
*/
//=====================================================================================================================================================================================
//=====================================================================================================================================================================================


/*
input: array with objects with getSite output(json parsed resp.body with histogram)  + attributes .hash_name .nameid (assigned from input array)
output: adding attributes to the input object: .analyzer.profitStatus ; .analyzer.profit 

.analyzer.analyzerStatus true - success ; false - failed  ; if failed, the .analyzer.profit attribute will be setr to undefined
.analyzer.profit
.analyzer.realSell   
.analyzer.realBuy
.analyzer.profitPercent     - profit/price
.analyzer.percentOnPrice    - percent/price
.analyzer.buyBorder         - the highest profitable price related to realSell price
Rejects only if not analizable
*/
const analyze = async function(item,steamFeeFactor=1.15) {
return new Promise((resolve,reject)=>
{ 
    if(!isAnalizable(item))
        {console.log(`nieanalizable: ${item}`);reject(`Item ${item.hash_name} (${item.nameid}) is not analizable`)}
                                
    //count profit:
    item.analyzer.profit=real(item,"sellPrice",10,20).price/steamFeeFactor-real(item,"buyPrice",1,7).price;   //real() is creating item.analyzer.realSell/Buy
    item.analyzer.profitPercent=(item.analyzer.profit/item.analyzer.realSell.price)*100;
    item.analyzer.percentOnPrice=item.analyzer.profitPercent/item.analyzer.realSell.price
    item.analyzer.buyBorder=item.analyzer.realSell.price/steamFeeFactor
    item.analyzer.lowRealGap = item.analyzer.realSell.price/steamFeeFactor-item.lowest_sell_order/100
    //lowRealGap(item,steamFeeFactor)
    resolve()
    //console.log(item.analyzer)
})
}


module.exports={
    analyze : analyze,
    real : real,
    //lowRealGap : lowRealGap
}