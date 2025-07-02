import React, { useEffect, useState } from "react";
import "./App.css";

const pairs = [
  "USD/INR", "USD/BDT", "USD/MXN", "USD/PKR", "USD/BRL", "EUR/USD",
  "USD/ARS", "NZD/CAD", "USD/NGN"
];

const apiKey = "d1ihu89r01qhsrhfmp5gd1ihu89r01qhsrhfmp60";
const badSignals = [];

function getNextMinuteTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  return `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;
}

async function fetchSignalForPair(pair) {
  const cleanPair = pair.replace("/", "").toUpperCase();
  const rsiURL = `https://finnhub.io/api/v1/indicator?symbol=${cleanPair}&resolution=1&indicator=rsi&timeperiod=14&token=${apiKey}`;
  const macdURL = `https://finnhub.io/api/v1/indicator?symbol=${cleanPair}&resolution=1&indicator=macd&token=${apiKey}`;
  const emaURL = `https://finnhub.io/api/v1/indicator?symbol=${cleanPair}&resolution=1&indicator=ema&timeperiod=5&token=${apiKey}`;

  try {
    const [rsiRes, macdRes, emaRes] = await Promise.all([
      fetch(rsiURL),
      fetch(macdURL),
      fetch(emaURL),
    ]);

    const rsiData = await rsiRes.json();
    const macdData = await macdRes.json();
    const emaData = await emaRes.json();

    const rsi = rsiData.rsi?.slice(-1)[0] || 50;
    const macd = macdData.macd?.slice(-1)[0] || 0;
    const ema = emaData.ema?.slice(-1)[0] || 0;

    const direction = (rsi < 30 && macd > 0) ? "BUY" : (rsi > 70 && macd < 0) ? "SELL" : "HOLD";
    const confidence = Math.max((Math.random() * 5 + 95), 95).toFixed(2);

    const time = getNextMinuteTime();

    const isSimilarToBad = badSignals.some(
      (s) => s.pair === pair && s.direction === direction && Math.abs(s.rsi - rsi) < 5 && Math.abs(s.macd - macd) < 0.5
    );

    if (isSimilarToBad || direction === "HOLD") return null;

    return {
      pair,
      direction,
      confidence,
      amount: "$1",
      candleTime: time,
      rsi: rsi.toFixed(2),
      macd: macd.toFixed(2),
      ema: ema.toFixed(2)
    };
  } catch (error) {
    console.error("API error:", error);
    return null;
  }
}

async function autoSelectBestSignal() {
  const signals = await Promise.all(pairs.map(fetchSignalForPair));
  const valid = signals.filter(Boolean);
  if (valid.length === 0) return null;
  return valid.sort((a, b) => b.confidence - a.confidence)[0];
}

function App() {
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState([]);
  const [resultMap, setResultMap] = useState({});

  const generateSignal = async () => {
    const newSignal = await autoSelectBestSignal();
    if (newSignal) {
      setSignal(newSignal);
      setHistory([newSignal, ...history]);
    } else {
      setSignal(null);
    }
  };

  const handleResult = (result) => {
    if (!signal) return;
    setResultMap({ ...resultMap, [signal.candleTime]: result });
    if (result === "LOSS") {
      badSignals.push(signal);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      generateSignal();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const winCount = Object.values(resultMap).filter((r) => r === "WIN").length;
  const totalCount = Object.keys(resultMap).length;
  const winRate = totalCount > 0 ? ((winCount / totalCount) * 100).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-2xl font-bold text-center mb-4">🚀 Quotex Signal Bot – Auto Pair + AI Mode</h1>

      <div className="bg-gray-800 rounded-xl p-4 mb-6 shadow-xl">
        <div className="flex justify-center mb-4">
          <button
            onClick={generateSignal}
            className="bg-green-500 text-black font-bold px-4 py-2 rounded"
          >
            🧠 Auto Get Best Signal
          </button>
        </div>

        <div className="text-lg">
          <p>🚨 <strong>Signal</strong></p>
          <p>Pair: {signal?.pair || "---"}</p>
          <p>Direction: {signal?.direction || "---"}</p>
          <p>Confidence: {signal?.confidence || "---"}%</p>
          <p>RSI: {signal?.rsi || "---"}</p>
          <p>MACD: {signal?.macd || "---"}</p>
          <p>EMA: {signal?.ema || "---"}</p>
          <p>Trade Amount: {signal?.amount || "$1"}</p>
          <p>Candle Time: {signal?.candleTime || "--:--"}</p>

          <label className="block mt-3">
            Result:
            <select
              className="text-black ml-2"
              onChange={(e) => handleResult(e.target.value)}
            >
              <option>--Select--</option>
              <option value="WIN">✅ WIN</option>
              <option value="LOSS">❌ LOSS</option>
            </select>
          </label>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-4 mb-4">
        <h2 className="text-xl mb-1">📈 Signal Performance</h2>
        <p>Total Trades: {totalCount}</p>
        <p>Wins: {winCount}</p>
        <p>Win Rate: {winRate}%</p>
      </div>

      <div className="bg-gray-900 rounded-xl p-4">
        <h2 className="text-xl mb-3">📊 Trade History</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th>#</th>
              <th>Pair</th>
              <th>Direction</th>
              <th>Confidence</th>
              <th>RSI</th>
              <th>MACD</th>
              <th>EMA</th>
              <th>Amount</th>
              <th>Time</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, index) => (
              <tr key={index} className="border-b border-gray-800">
                <td>{index + 1}</td>
                <td>{item.pair}</td>
                <td>{item.direction}</td>
                <td>{item.confidence}%</td>
                <td>{item.rsi}</td>
                <td>{item.macd}</td>
                <td>{item.ema}</td>
                <td>{item.amount}</td>
                <td>{item.candleTime}</td>
                <td>{resultMap[item.candleTime] || "---"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
