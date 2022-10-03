const Moralis = require("moralis").default;
const { EvmChain } = require("@moralisweb3/evm-utils");
const fs = require("fs");
require("dotenv").config();

const MORALIS_API_KEY = process.env.MORALIS_API; // Get a moralis key and put it in .env
const address = "<NFT CONTRACT ADDRESS>"; // NFT address
const chain = EvmChain.ETHEREUM;

// Moralis pagination, finds all results
async function getRecursive(func, params) {
  if (params.cursor != null) {
    let response = await func(params);
    params.cursor = response.data.cursor;
    return response.data.result.concat(await getRecursive(func, params));
  } else {
    return [];
  }
}
// Get all owners of NFT contract address
async function getAllNFTOwners(address) {
  return await getRecursive(Moralis.EvmApi.nft.getNFTOwners, {
    address,
    chain,
    cursor: "",
  });
}
// Get transfer history of specific token
async function getAllTransfersToken(address, tokenId) {
  return await getRecursive(Moralis.EvmApi.nft.getNFTTransfers, {
    address,
    chain,
    tokenId,
    cursor: "",
  });
}

// Gets the latest transfer of token
async function getLatestTransferToken(address, tokenId) {
  const response = await Moralis.EvmApi.nft.getNFTTransfers({
    address,
    chain,
    tokenId,
    limit: 1,
  });
  return response.data.result[0];
}

async function getDemoData() {
  await Moralis.start({
    apiKey: MORALIS_API_KEY,
  });

  //   Finds all current holders of the contract
  //   returns a list of all tokens individually with their owners stated - not a list of owners directly
  var allTokens = await getAllNFTOwners(address);

  var allOwners = {};
  for (let i = 0; i < allTokens.length; i++) {
    if (allTokens[i].owner_of in allOwners === false) {
      allOwners[allTokens[i].owner_of] = [];
    }

    // Find latest transfer and push it onto allOwners which will later be written to a file
    let latest_transfer = await getLatestTransferToken(
      address,
      allTokens[i].token_id
    );

    allOwners[allTokens[i].owner_of].push({
      token_id: allTokens[i].token_id,
      hold_period: diff_days(latest_transfer.block_timestamp),
    });
  }

  const data = JSON.stringify(allOwners);
  fs.writeFile("Snapshot.json", data, (err) => {
    if (err) {
      throw err;
    }
    console.log("JSON data is saved.");
  });
}
getDemoData();

function diff_days(date) {
  var d1 = new Date(); //"now"
  var d2 = new Date(date); // some date
  var diffTime = Math.abs(d1 - d2); // difference in milliseconds
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function count_snapshot() {
  fs.readFile("Snapshot.json", "utf-8", (err, data) => {
    if (err) {
      throw err;
    }

    // parse JSON object
    const allOwners = JSON.parse(data.toString());
    var count = Object.keys(allOwners).length;

    console.log(count);
  });
}
