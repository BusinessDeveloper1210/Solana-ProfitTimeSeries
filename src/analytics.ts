import express from "express";
import axios from "axios";
import dayjs from "dayjs";

const app = express();
const PORT = process.env.PORT || 3000;

interface HolderProfitEntry {
    timestamp: string;
    price: number;
    percentBenefited: number;
}

interface ActiveAddressesEntry {
    timestamp: string;
    activeAddresses: number;
}

// Fetch SOL price history from CoinGecko
async function fetchSolPriceHistory(days: number): Promise<{ timestamp: string; price: number }[]> {
    const url = `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    const res = await axios.get(url);
    return res.data.prices.map((p: [number, number]) => ({
        timestamp: dayjs(p[0]).format("YYYY-MM-DD"),
        price: parseFloat(p[1].toFixed(2)),
    }));
}

// Fetch current % holders in profit from RugCheck
async function fetchCurrentProfitPercent(): Promise<number> {
    const SOL_TOKEN = "7RqzfurZPe4KA16J1RJo2KmMvFs8pVxA5njDhgogJowY";
    const url = `https://api.rugcheck.xyz/api/token/${SOL_TOKEN}`;
    const res = await axios.get(url);
    const pct = res.data?.analysis?.profitPercentage;
    console.log(pct)
    return typeof pct === "number" ? parseFloat(pct.toFixed(2)) : 0;
}

// Simulate daily percent in profit
function simulateProfitSeries(
    prices: { timestamp: string; price: number }[],
    currentPercent: number
): HolderProfitEntry[] {
    const latestPrice = prices[prices.length - 1].price;
    return prices.map(({ timestamp, price }) => {
        const delta = (price - latestPrice) / latestPrice;
        const estimatedPct = Math.min(100, Math.max(0, currentPercent + delta * 100));
        return { timestamp, price, percentBenefited: parseFloat(estimatedPct.toFixed(2)) };
    });
}

// Simulate active addresses (placeholder)
function simulateActiveAddresses(
    prices: { timestamp: string; price: number }[]
): ActiveAddressesEntry[] {
    return prices.map(({ timestamp }, idx) => ({
        timestamp,
        activeAddresses: 300000 + idx * 2000 + Math.round(Math.random() * 5000),
    }));
}

// Endpoint: % holders in profit
app.get("/api/holders-in-profit", async (req, res) => {
    const days = parseInt((req.query.days as string) || "30", 10);
    try {
        const prices = await fetchSolPriceHistory(days);
        console.log("prices", prices)

        const currentPercent = await fetchCurrentProfitPercent();
        console.log("current", currentPercent)
        const series = simulateProfitSeries(prices, currentPercent);
        console.log("series", series)
        res.json(series);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch holders in profit data." });
    }
});

// Endpoint: active addresses
app.get("/api/active-addresses", async (req, res) => {
    const days = parseInt((req.query.days as string) || "30", 10);
    try {
        const prices = await fetchSolPriceHistory(days);
        const series = simulateActiveAddresses(prices);
        res.json(series);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch active addresses data." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
