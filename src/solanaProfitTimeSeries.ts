import { Connection, PublicKey, ParsedConfirmedTransaction, ParsedInstruction } from '@solana/web3.js';
import fetch from 'node-fetch';

// CONFIGURABLE PARAMETERS
const SOL_MINT = '3bgvTBLGuJLvQSEnZm4pzFooW1jK1C7eCqZNHB8ipump'; // Official SOL mint address
const RPC_URL = "https://fragrant-maximum-snowflake.solana-mainnet.quiknode.pro/f99e0423a2334f9723ba030f4d1a8f237770fd8e"
const START_DATE = '2025-06-20'; // YYYY-MM-DD
const END_DATE = '2025-06-25';   // YYYY-MM-DD
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const MAX_HOLDERS = 100; // For demo, limit to 100 holders (API limits, can be increased)

// Helper: Get all days between two dates
function getDateRange(start: string, end: string): string[] {
  const dates = [];
  let current = new Date(start);
  const last = new Date(end);
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// 1. Get list of token accounts (holders)
async function getSolHolders(connection: Connection, max: number): Promise<string[]> {
  // For native SOL, holders are all accounts with >0 SOL. We'll use getLargestAccounts for demo.
  const resp = await connection.getLargestAccounts();
  // Only take the top 'max' accounts
  return resp.value.slice(0, max).map(acc => acc.address.toBase58());
}

// 2. Get acquisition transfers and timestamps for each holder
async function getFirstAcquisitionDate(connection: Connection, holder: string): Promise<{ date: string, amount: number } | null> {
  // For demo, just get the first transaction involving the holder
  const sigs = await connection.getSignaturesForAddress(new PublicKey(holder), { limit: 100 });
  for (const sig of sigs.reverse()) { // oldest first
    const tx = await connection.getParsedTransaction(sig.signature);
    if (!tx) continue;
    for (const instr of tx.transaction.message.instructions as ParsedInstruction[]) {
      if (instr.program === 'system' && instr.parsed?.info?.destination === holder) {
        // Found a transfer to this holder
        return {
          date: new Date(tx.blockTime! * 1000).toISOString().slice(0, 10),
          amount: Number(instr.parsed.info.lamports) / 1e9,
        };
      }
    }
  }
  return null;
}

// 3. Get price history for date range (CoinGecko API)
async function getSolPriceHistory(start: string, end: string): Promise<Record<string, number>> {
  // CoinGecko API: https://api.coingecko.com/api/v3/coins/solana/market_chart/range
  const from = Math.floor(new Date(start).getTime() / 1000);
  const to = Math.floor(new Date(end).getTime() / 1000) + 86400;
  const url = `https://api.coingecko.com/api/v3/coins/solana/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;
  const resp = await fetch(url);
  const data = await resp.json() as { prices: [number, number][] };
  // data.prices: [ [timestamp, price], ... ]
  const prices: Record<string, number> = {};
  for (const [ts, price] of data.prices) {
    const date = new Date(ts).toISOString().slice(0, 10);
    prices[date] = price;
  }
  return prices;
}

// 4. Estimate acquisition price per holder
// For demo, assume acquisition price is price on acquisition date
async function getAcquisitionPrice(acqDate: string, priceHistory: Record<string, number>): Promise<number | null> {
  return priceHistory[acqDate] || null;
}

// 5. Compare daily price to acquisition price
// 6. Count % of holders in profit per day
async function main() {
  const connection = new Connection(RPC_URL);
  const dates = getDateRange(START_DATE, END_DATE);
  console.log('Fetching holders...');
  const holders = await getSolHolders(connection, MAX_HOLDERS);
  console.log(`Found ${holders.length} holders.`);

  console.log('Fetching price history...');
  const priceHistory = await getSolPriceHistory(START_DATE, END_DATE);

  // For each holder, get acquisition date and price
  const holderAcq: { holder: string, acqDate: string, acqPrice: number }[] = [];
  for (const holder of holders) {
    const acq = await getFirstAcquisitionDate(connection, holder);
    if (!acq) continue;
    const acqPrice = await getAcquisitionPrice(acq.date, priceHistory);
    if (!acqPrice) continue;
    holderAcq.push({ holder, acqDate: acq.date, acqPrice });
  }

  // For each day, count % in profit
  console.log('Date        % of holders in profit');
  for (const date of dates) {
    const price = priceHistory[date];
    if (!price) continue;
    const inProfit = holderAcq.filter(h => price > h.acqPrice).length;
    const percent = holderAcq.length ? (inProfit / holderAcq.length) * 100 : 0;
    console.log(`${date}    ${percent.toFixed(2)}%`);
  }
}

main().catch(console.error); 