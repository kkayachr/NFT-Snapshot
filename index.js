const Moralis = require("moralis").default;
const { EvmChain } = require("@moralisweb3/evm-utils");
const fs = require("fs");
require("dotenv").config();

const MORALIS_API_KEY = process.env.MORALIS_API;
const address = "0x8E74eC33406FCA20c1be7b2A6c4135FC7CfAc9E8";
const chain = EvmChain.ETHEREUM;

const snapshot = require("./MINING_APES_REWARDS_221025T12.json");

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

// Should change this by adding a date from which the latest transfer is based on
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

  //   Finds all current holders of the mining apes contract
  //   returns a list of all tokens individually with their owners stated - not a list of owners directly
  var allTokens = await getAllNFTOwners(address);
  var allOwners = {};

  for (let i = 0; i < allTokens.length; i++) {
    if (i % 100 == 0) {
      console.log(i + " done");
    }
    if (i % 12 == 0) {
      await new Promise((r) => setTimeout(r, 2200));
    }
    if (allTokens[i].owner_of in allOwners === false) {
      allOwners[allTokens[i].owner_of] = [];
    }
    getLatestTransferToken(address, allTokens[i].token_id).then((res) => {
      allOwners[allTokens[i].owner_of].push({
        token_id: allTokens[i].token_id,
        hold_period: diff_days(res.block_timestamp),
      });
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
// getDemoData();

function diff_days(date) {
  var d1 = new Date(); //"now"
  var d2 = new Date(date); // some date
  var diffTime = Math.abs(d1 - d2); // difference in milliseconds
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function add_rewards_json() {
  var new_snapshot = {};
  Object.keys(snapshot).forEach((address, i) => {
    var tokens = snapshot[address];
    if (address in new_snapshot === false) {
      new_snapshot[address] = [];
    }
    tokens.forEach((token) => {
      var new_token = token;
      new_token["hold_period"] = new_token["hold_period"] - 1;
      new_token["reward"] = airdrop_reward(new_token.hold_period);
      new_snapshot[address].push(new_token);
    });
  });

  var data = JSON.stringify(new_snapshot);
  fs.writeFile("Snapshot_with_rewards.json", data, (err) => {
    if (err) {
      throw err;
    }
    console.log("JSON data is saved.");
  });
}

function calc_rewards_sum() {
  sum = 0;
  tokens_count = 0;
  Object.keys(snapshot).forEach((address, i) => {
    var tokens = snapshot[address];
    tokens.forEach((token) => {
      sum += token.reward;
      tokens_count += 1;
    });
  });
  console.log(sum);
  console.log(tokens_count);
}

calc_rewards_sum();
function airdrop_reward(days) {
  max_reward = 200;
  const intervals = [59, 119, 179, 239, 299, 359, 1000000];
  const values = [100, 125, 175, 250, 325, 400, 500];
  if (days < intervals[0]) {
    return values[0];
  }
  var holding_class = intervals.findIndex(function (number) {
    return number > days;
  });
  return values[holding_class];
}
