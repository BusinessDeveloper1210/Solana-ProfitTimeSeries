import { Connection, PublicKey } from "@solana/web3.js";
require('dotenv').config();

const RPC_ENDPOINT = "https://fragrant-maximum-snowflake.solana-mainnet.quiknode.pro/f99e0423a2334f9723ba030f4d1a8f237770fd8e";
const connection = new Connection(RPC_ENDPOINT);

console.log("Connected to Solana RPC");

async function getTokenHolders(mintAddress: string) {
  const mintPubkey = new PublicKey(mintAddress);

  const accounts = await connection.getProgramAccounts(
    new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // SPL Token program
    {
      filters: [
        {
          dataSize: 165,
        },
        {
          memcmp: {
            offset: 0,
            bytes: mintPubkey.toBase58(),
          },
        },
      ],
    }
  );

  const holders = accounts
    .map((acc) => ({
      pubkey: acc.pubkey.toBase58(),
      amount: acc.account.data.slice(64, 72).readBigUInt64LE(0),
    }))
    .filter((h) => h.amount > 0n);

  console.log(`Found ${holders.length} holders`);
  return holders;
}

getTokenHolders("7RqzfurZPe4KA16J1RJo2KmMvFs8pVxA5njDhgogJowY").then(console.log);



async function getHistoricalPricesCoingecko(days: number) {
  const coingeckoId = "solana";

  const url = `https://api.coingecko.com/api/v3/coins/${"coingeckoId"}/market_chart?vs_currency=usd&days=${days}`;

  const res = await fetch(url);
  const data = await res.json();

  // Prices format: [ [timestamp, price], ... ]
  const prices = data.prices.map((p: any) => ({
    timestamp: p[0],
    price: p[1],
  }));

  console.log(prices.slice(0, 5)); // Preview first 5 entries
  return prices;
}

getHistoricalPricesCoingecko(7);
