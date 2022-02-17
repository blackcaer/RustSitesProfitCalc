// paste on https://rustchance.com/shop to get all items from shop

results = []
const getShop = function (resulttab){
for (let item of document.querySelectorAll(".withdraw__item"))
{
    let r = {}
    r.name = item.getElementsByClassName("withdraw__item_title")[0].innerText
    r.price = parseFloat(item.getElementsByClassName("withdraw__item_meta")[0].getElementsByClassName("withdraw__item_price")[0].innerText)
    
    let tmp = (item.getElementsByClassName("withdraw__item_meta")[0].getElementsByClassName("withdraw__item_stock")[0].innerText)
    r.quantity = parseInt(tmp.slice(0,tmp.length-1))
    resulttab.push(r)
}}

getShop(results)
results