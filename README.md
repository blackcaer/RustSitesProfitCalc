# Rust Sites Profit Calculator

A project that analyzes Rust gambling sites, including inventory and shop data, to identify the best profit opportunities. It evaluates where specific items are best to bet or trade based on market conditions.

**This is an older project, so the code may be messy and lacks full documentation—but it was a valuable learning experience in data scraping and market analysis.**


## How it works:
1. **Item Preparation** – Collects and organizes all items.  
2. **Adding `nameid`** – Assigns Steam’s unique identifier (`nameid`) to each item.  
3. **Market Popularity Check** – Evaluates item popularity on the Steam Market.  
4. **Data Fetching** – Retrieves and filters Steam Market data for each item.  
5. **Data Analysis** – Computes item metrics (e.g., liquidity, value) to assess real worth.  
6. **Displaying Results** – Shows where and how to optimize profits on gambling sites.  

## Main Files:
- **`sitereq_sm.js`** – Functions for interacting with the Steam Market (e.g., searching, retrieving data).  
- **`analyzer_sm.js`** – Calculates the real value of items based on liquidity and popularity.  
- **`getNameidV3.js`** – Fetches the `nameid` for a given item `hashName`.  
- **`sitereq_rb.js`** – Collects available items from Rust gambling site.
- **`RCH browser scrapper.js`** - Scrapes shop from browser console

