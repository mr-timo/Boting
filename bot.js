const ccxt = require('ccxt');
const fs = require('fs');

const exchange = new ccxt.mexc({
  enableRateLimit: true,
  rateLimit: 1000
});

const symbol = 'XRP/USDT';  // Spot trading symbol
const capital = 10;
const gridPercentage = 0.0009;  // Grid percentage for buy/sell levels
const stopLossPercentage = 1;  // Stop loss percentage
let bought = false;
let buyPrice = 0;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function start() {
  await main(); // start in demo mode
}

async function main() {
  console.log('Starting demo mode...');
  await exchange.loadMarkets();

  while (true) {
    const ticker = await exchange.fetchTicker(symbol);
    const currentPrice = ticker.last;
    const gridLevels = calculateGridLevels(currentPrice, gridPercentage);
    const initialBuyLevel = gridLevels.buy;
    let sellLevel = gridLevels.sell;

    console.log(`Buy Level: ${initialBuyLevel}, Sell Level: ${sellLevel}`);

    while (true) {
      const ticker = await exchange.fetchTicker(symbol);
      const currentPrice = ticker.last;
      const percentageOfBuyLevel = (((currentPrice - initialBuyLevel) / initialBuyLevel) * 100).toFixed(4);

      console.clear();
      console.log('---------------------*********************---------------');
      console.log(`Current Price: ${currentPrice} (${percentageOfBuyLevel}% 
       Buy ${initialBuyLevel}, Sell ${sellLevel}, isBought: ${bought}`);
      console.log('-----------------------####################---------------');

      if (!bought && currentPrice > (initialBuyLevel - 30) && currentPrice <= initialBuyLevel) {
        console.log(`Placing a demo buy order as current price is between ${initialBuyLevel - 30} and ${initialBuyLevel}`);
        await placeBuyOrder(currentPrice);

        const newGridLevels = calculateGridLevels(buyPrice, gridPercentage);
        sellLevel = newGridLevels.sell;
        console.log(`New Sell Level after recalculating based on buy price: ${sellLevel}`);
      } else if (bought && currentPrice <= calculateStopLossPrice()) {
        console.log('Stop loss condition met. Selling at a loss in demo.');
        await placeSellOrder(currentPrice, 'loss');
        break;  // Exit inner loop to restart the cycle and look for a new buy opportunity
      } else if (bought && currentPrice >= sellLevel) {
        console.log('Target sell level reached in demo. Placing a sell order.');
        await placeSellOrder(currentPrice, 'profit');
        break;  // Exit inner loop to restart the cycle and look for a new buy opportunity
      }

      await sleep(3000); // Wait for 3 seconds before checking again
    }
  }
}

function calculateStopLossPrice() {
  return buyPrice * (1 - stopLossPercentage / 100);
}

async function placeBuyOrder(buyLevel) {
  console.log(`Placing demo buy order at ${buyLevel}. Balance: ${await calculatePositionSize(buyLevel)}`);
  bought = true;
  buyPrice = buyLevel;
  
  // Increment and update Buy Count in buy.js
  const buyCount = readCountFromFile('buy.js');
  const updatedBuyCount = buyCount + 1;
  writeCountToFile('buy.js', updatedBuyCount);
  console.log(`Buy Count updated to: ${updatedBuyCount}`);
}

async function placeSellOrder(sellLevel, condition) {
  if (condition === 'loss') {
    console.log('Placing sell demo order at market price due to stop loss.');
    bought = false;
    
    // Increment and update Sell Count in sell.js
    const sellCount = readCountFromFile('sell.js');
    const updatedSellCount = sellCount + 1;
    writeCountToFile('sell.js', updatedSellCount);
    console.log(`Sell Count updated to: ${updatedSellCount}`);
  } else if (condition === 'profit') {
    let value = ((await calculatePositionSize(buyPrice)) * sellLevel);
    console.log(`Placing sell demo order at ${sellLevel}. You have ${value}`);
    bought = false;

    // Increment and update Sell Count in sell.js
    const sellCount = readCountFromFile('sell.js');
    const updatedSellCount = sellCount + 1;
    writeCountToFile('sell.js', updatedSellCount);
    console.log(`Sell Count updated to: ${updatedSellCount}`);
  }
}

function calculateGridLevels(currentPrice, gridPercentage) {
  const buyLevel = currentPrice * (1 - gridPercentage);
  const sellLevel = currentPrice * (1 + gridPercentage);
  return { buy: buyLevel, sell: sellLevel };
}

async function calculatePositionSize(buyLevel) {
  const usdBalance = capital;  
  const positionSize = usdBalance / buyLevel;  
  return positionSize;
}

// Helper functions to read and write the counts to files
function readCountFromFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return parseInt(data.trim(), 10);  // Return the number in the file
  } catch (err) {
    console.log(`Error reading count from ${filePath}:`, err);
    return 0;  // If file doesn't exist or error occurs, assume 0
  }
}

function writeCountToFile(filePath, count) {
  try {
    fs.writeFileSync(filePath, count.toString(), 'utf-8');
  } catch (err) {
    console.log(`Error writing count to ${filePath}:`, err);
  }
}

start();
  
