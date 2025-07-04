import axios from 'axios';
import { Parser } from 'json2csv' ;
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const TOKEN_ADDRESS = '3bgvTBLGuJLVQSENZm4pzFooW1JK1C7eCqZNHB8ipump';
// HELIUS_API_KEY=50fb6d78-d59a-4bda-a9e1-14a972862a9d
const DEXSCREENER_API_URL = `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`;
const SOLSCAN_API_BASE_URL = `https://api.solscan.io/token`;
interface TokenData {
    date: string;
    priceUsd: number;
    dailyReturnPercent: number | undefined;
    volume24h: number | undefined;
    liquidity: number | undefined;
    marketCap: number | undefined;
    holderCount: number | undefined;
    chold: number | undefined;
    top10HoldPercent: number | undefined;
    tokenName: string | undefined;
    tokenSymbol: string | undefined;
    tokenDecimals: number | undefined;
    walletsInProfit: number | undefined;
    percentInProfit: number | undefined;
}
interface HistoricalPriceData {
    timestamp: number;
    price: number;
    volume: number;
    marketCap: number;
}
interface HistoricalHolderData {
    date: string;
    holderCount: number;
    top10HoldPercent: number | undefined;
}
async function getTotalHolderCount(apiKey: string): Promise<number | undefined> {
    console.log('Fetching total holder count from Helius...');
    try {
        const heliusResponse = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
            jsonrpc: '2.0',
            id: 'helius-test',
            method: 'getTokenAccounts',
            params: {
                mint: TOKEN_ADDRESS,
                page: 1,
                limit: 1,
            },
        });
        console.log('Total holder count fetched successfully.');
        return heliusResponse.data.result?.total;
    } catch (error: any) {
        console.error('An error occurred while fetching total holder count from Helius:', error.response?.data || error.message);
        return undefined;
    }
}
async function getRealtimeTokenData(): Promise<Partial<TokenData> | null> {
    console.log('Fetching real-time token data from DexScreener...');
    try {
        const dexResponse = await axios.get(DEXSCREENER_API_URL);
        const pair = dexResponse.data.pairs?.[0];
        if (!pair) {
            console.warn('Could not find a trading pair for this token on DexScreener. Some real-time data might be missing.');
        }
        console.log('Real-time data fetched successfully.');
        return {
            priceUsd: pair ? parseFloat(pair.priceUsd) : undefined,
            volume24h: pair?.volume?.h24,
            liquidity: pair?.liquidity?.usd,
            marketCap: pair?.marketCap,
        };
    } catch (error: any) {
        console.error('An error occurred while fetching real-time token data:', error.response?.data || error.message);
        return null;
    }
}
async function getHistoricalMarketData(days: number): Promise<{ prices: HistoricalPriceData[], volumes: HistoricalPriceData[], marketCaps: HistoricalPriceData[] }> {
    console.log(`Generating simulated historical market data for the last ${days} days...`);
    const prices: HistoricalPriceData[] = [];
    const volumes: HistoricalPriceData[] = [];
    const marketCaps: HistoricalPriceData[] = [];
    const basePrice = 0.000125;
    const baseVolume = 10000;
    const baseMarketCap = 1000000;
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const timestamp = date.getTime();
        const price = basePrice + (Math.random() * 0.000010 - 0.000005);
        const volume = baseVolume + (Math.random() * 5000 - 2500);
        const marketCap = baseMarketCap + (Math.random() * 500000 - 250000);
        prices.push({ timestamp, price, volume: 0, marketCap: 0 });
        volumes.push({ timestamp, price: 0, volume, marketCap: 0 });
        marketCaps.push({ timestamp, price: 0, volume: 0, marketCap });
    }
    console.log('Simulated historical market data generated.');
    return { prices, volumes, marketCaps };
}
async function getHistoricalHolderData(days: number, totalHolders: number | undefined): Promise<HistoricalHolderData[]> {
    console.log(`Generating simulated historical holder data for the last ${days} days...`);
    const historicalData: HistoricalHolderData[] = [];
    const baseHolderCount = totalHolders || 100000;
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        historicalData.push({
            date: date.toISOString().split('T')[0],
            holderCount: baseHolderCount + Math.floor(Math.random() * 50000 * (i / days)),
            top10HoldPercent: parseFloat((Math.random() * (0.6 - 0.3) + 0.3).toFixed(2)) * 100,
        });
    }
    console.log('Simulated historical holder data generated.');
    return historicalData.reverse();
}
interface ProfitabilityData {
    date: string;
    walletsInProfit: number;
    percentInProfit: number;
}
async function getProfitabilityAnalysis(
    historicalPrices: (HistoricalPriceData & { dailyReturnPercent?: number })[],
    historicalHolders: HistoricalHolderData[],
    currentPrice: number | undefined
): Promise<ProfitabilityData[]> {
    console.log('Calculating profitability analysis...');
    const profitabilityData: ProfitabilityData[] = [];
    historicalHolders.forEach((holderEntry, index) => {
        const date = holderEntry.date;
        const totalWallets = holderEntry.holderCount;
        const priceForDate = historicalPrices.find(p => new Date(p.timestamp).toISOString().split('T')[0] === date)?.price || currentPrice;
        const dailyReturnForDate = historicalPrices.find(p => new Date(p.timestamp).toISOString().split('T')[0] === date)?.dailyReturnPercent;
        if (totalWallets && priceForDate !== undefined) {
            let simulatedPercentInProfit: number;
            if (index > 0 && profitabilityData[index - 1] && dailyReturnForDate !== undefined) {
                const adjustment = dailyReturnForDate * 0.5;
                simulatedPercentInProfit = Math.min(95, Math.max(5, (profitabilityData[index - 1].percentInProfit || 50) + adjustment));
            } else {
                simulatedPercentInProfit = 53.4 + Math.random() * 5 - 2.5;
            }
            const walletsInProfit = Math.round(totalWallets * (simulatedPercentInProfit / 100));
            profitabilityData.push({
                date: date,
                walletsInProfit: walletsInProfit,
                percentInProfit: parseFloat(simulatedPercentInProfit.toFixed(1)),
            });
        }
    });
    console.log('Profitability analysis simulated.');
    return profitabilityData;
}
async function getCoinMetadata(): Promise<Partial<TokenData> | null> {
    console.log('Generating simulated token metadata...');
    return {
        tokenName: 'ENDLESS COIN',
        tokenSymbol: 'ENDLESS',
        tokenDecimals: undefined,
    };
}
async function main() {
    const apiKey = process.env.HELIUS_API_KEY;
    const historicalDays = 7;
    if (!apiKey || apiKey === 'YOUR_HELIUS_API_KEY_HERE') {
        console.error('Please provide a valid Helius API key in the .env file.');
        return;
    }
    console.log('Starting data collection...');
    const totalHolderCount = await getTotalHolderCount(apiKey);
    const [realtimeData, historicalMarketData, historicalHolders, metadata] = await Promise.all([
        getRealtimeTokenData(),
        getHistoricalMarketData(historicalDays),
        getHistoricalHolderData(historicalDays, totalHolderCount),
        getCoinMetadata(),
    ]);
    const { prices: historicalPrices, volumes: historicalVolumes, marketCaps: historicalMarketCaps } = historicalMarketData;
    if (!realtimeData && historicalPrices.length === 0 && historicalHolders.length === 0 && !metadata) {
        console.error('Failed to fetch any data. Exiting.');
        return;
    }
    const pricesWithDailyReturn: (HistoricalPriceData & { dailyReturnPercent?: number })[] = historicalPrices.map((p, index, arr) => {
        if (index > 0) {
            const previousPrice = arr[index - 1].price;
            if (previousPrice !== 0) {
                return { ...p, dailyReturnPercent: ((p.price - previousPrice) / previousPrice) * 100 };
            }
        }
        return p;
    });
    const profitabilityAnalysis = await getProfitabilityAnalysis(
        pricesWithDailyReturn,
        historicalHolders,
        realtimeData?.priceUsd
    );
    console.log('Combining and processing data...');
    const combinedData: TokenData[] = [];
    const priceMap = new Map<string, HistoricalPriceData & { dailyReturnPercent?: number }>();
    pricesWithDailyReturn.forEach(p => {
        const date = new Date(p.timestamp).toISOString().split('T')[0];
        priceMap.set(date, p);
    });
    const volumeMap = new Map<string, number>();
    historicalVolumes.forEach(v => {
        const date = new Date(v.timestamp).toISOString().split('T')[0];
        volumeMap.set(date, v.volume);
    });
    const marketCapMap = new Map<string, number>();
    historicalMarketCaps.forEach(m => {
        const date = new Date(m.timestamp).toISOString().split('T')[0];
        marketCapMap.set(date, m.marketCap);
    });
    const holderMap = new Map<string, HistoricalHolderData>();
    historicalHolders.forEach(h => {
        holderMap.set(h.date, h);
    });
    for (let i = historicalDays - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const formattedDate = date.toISOString().split('T')[0];
        const currentPriceData = priceMap.get(formattedDate);
        const currentPrice = currentPriceData?.price || 0;
        const currentVolume = volumeMap.get(formattedDate);
        const currentMarketCap = marketCapMap.get(formattedDate);
        const currentHolderData = holderMap.get(formattedDate);
        let chold: number | undefined;
        if (currentHolderData && i < historicalDays - 1) {
            const previousDate = new Date();
            previousDate.setDate(previousDate.getDate() - (i + 1));
            const previousFormattedDate = previousDate.toISOString().split('T')[0];
            const previousHolderData = holderMap.get(previousFormattedDate);
            if (previousHolderData) {
                chold = currentHolderData.holderCount - previousHolderData.holderCount;
            }
        }
        const profitabilityForDate = profitabilityAnalysis.find(p => p.date === formattedDate);
        combinedData.push({
            date: formattedDate,
            priceUsd: currentPrice,
            dailyReturnPercent: currentPriceData?.dailyReturnPercent,
            volume24h: currentVolume || realtimeData?.volume24h,
            liquidity: realtimeData?.liquidity,
            marketCap: currentMarketCap || realtimeData?.marketCap,
            holderCount: currentHolderData?.holderCount || totalHolderCount,
            chold: chold,
            top10HoldPercent: currentHolderData?.top10HoldPercent,
            tokenName: metadata?.tokenName,
            tokenSymbol: metadata?.tokenSymbol,
            tokenDecimals: metadata?.tokenDecimals,
            walletsInProfit: profitabilityForDate?.walletsInProfit,
            percentInProfit: profitabilityForDate?.percentInProfit,
        });
    }
    if (combinedData.length > 0) {
        console.log('Processing data for CSV and console output...');
        const fields = [
            'date',
            'priceUsd',
            'dailyReturnPercent',
            'volume24h',
            'liquidity',
            'marketCap',
            'holderCount',
            'chold',
            'top10HoldPercent',
            'tokenName',
            'tokenSymbol',
            'tokenDecimals',
            'walletsInProfit',
            'totalWallets',
            'percentInProfit'
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(combinedData);
        fs.writeFileSync('solana_token_data.csv', csv);
        console.log('Successfully wrote token data to solana_token_data.csv');
        console.log('--- CSV Content ---');
        console.log(csv);
        console.log('--- Combined Token Data (Last Entry) ---');
        console.log(combinedData[combinedData.length - 1]);
        if (profitabilityAnalysis.length > 0) {
            console.log('\n--- Token Profitability Analysis Results ---');
            console.log(`Token: ${TOKEN_ADDRESS}`);
            console.log(`Analysis Period: Last ${historicalDays} days`);
            console.log(`Total Holders Analyzed: ${totalHolderCount || 'N/A'}`);
            console.log('Note: Wallets in profit and percentage in profit are simulated based on historical price data.');
            console.log('\ndate        price       walletsInProfit totalWallets percentInProfit');
            profitabilityAnalysis.forEach(data => {
                const price = pricesWithDailyReturn.find(p => new Date(p.timestamp).toISOString().split('T')[0] === data.date)?.price;
                const displayedPrice = price !== undefined ? price.toFixed(6) : 'N/A'.padEnd(9);
                console.log(
                    `${data.date}  ${displayedPrice} ${data.walletsInProfit.toString().padEnd(15)}  ${data.percentInProfit.toFixed(1)}`
                );
            });
            const avgPercentInProfit = profitabilityAnalysis.reduce((sum, data) => sum + data.percentInProfit, 0) / profitabilityAnalysis.length;
            const highestPercentInProfit = Math.max(...profitabilityAnalysis.map(data => data.percentInProfit));
            const lowestPercentInProfit = Math.min(...profitabilityAnalysis.map(data => data.percentInProfit));
            console.log(`\nSUMMARY:`);
            console.log(`Average % of holders in profit: ${avgPercentInProfit.toFixed(1)}%`);
            console.log(`Highest % in profit: ${highestPercentInProfit.toFixed(1)}%`);
            console.log(`Lowest % in profit: ${lowestPercentInProfit.toFixed(1)}%`);
            console.log('\nAnalysis completed successfully!');
        }
    } else {
        console.warn('No data to write to CSV or log.');
    }
}
main();
