'use strict';
// Claude V2 (市場ブレンド版) の計算ロジックを、Claudeアプリ(artifact 2d0d0f2e...)の
// 関数と同じ式で書き起こした参照実装。ChatGPT側の移植・一致確認用。
// 注意: アプリの marketOdds / predictScore は使わず、入力（生の期待得点・公式投票率）を直接受け取る。

const MARKET_WEIGHT = 0.7; // 公式投票率の重み（残り0.3が自前モデル）
const MARKET_EDGE_SCALE = 1.6; // 勝敗確率差 → 得点差の目安への換算係数
const MIN_GOALS = 0.15;
const MAX_GOALS = 8; // 0..8 点まで積み上げ
const DC_RHO = -0.10; // Dixon-Coles ρ

// 1. 公式投票率（1/0/2 の百分率）を使い、生の期待得点をブレンドする
//    rawHome/rawAway: 自前モデルの期待得点（シュリンケージ・ブースト・クランプ適用後）
//    marketHome/marketDraw/marketAway: 公式投票率（0〜1の小数）
function blendGoalExpectancyWithMarket(rawHomeGoals, rawAwayGoals, marketHome, marketAway) {
  const marketEdge = (marketHome - marketAway) * MARKET_EDGE_SCALE;
  const rawEdge = rawHomeGoals - rawAwayGoals;
  const blendedEdge = marketEdge * MARKET_WEIGHT + rawEdge * (1 - MARKET_WEIGHT);
  const totalGoals = rawHomeGoals + rawAwayGoals; // 合計得点は自前モデルの水準を維持
  const homeGoals = Math.max(MIN_GOALS, (totalGoals + blendedEdge) / 2);
  const awayGoals = Math.max(MIN_GOALS, (totalGoals - blendedEdge) / 2);
  return { homeGoals, awayGoals, marketEdge, rawEdge, blendedEdge, totalGoals };
}

function poissonProbability(lambda, k) {
  const e = Math.exp(-lambda);
  let result = e;
  for (let i = 1; i <= k; i++) result *= lambda / i;
  return result;
}

// Dixon-Coles 補正係数 τ（V2のみ）。0-0,0-1,1-0,1-1 の4セルだけに掛ける。
function dcTau(h, a, homeExp, awayExp, useDixonColes) {
  if (!useDixonColes) return 1;
  if (h === 0 && a === 0) return 1 - homeExp * awayExp * DC_RHO;
  if (h === 0 && a === 1) return 1 + homeExp * DC_RHO;
  if (h === 1 && a === 0) return 1 + awayExp * DC_RHO;
  if (h === 1 && a === 1) return 1 - DC_RHO;
  return 1;
}

// 2. 期待得点 → 勝・分・負の確率（独立ポアソン × DC補正 → 正規化 → 引き分け上乗せ）
//    useV2=true が現行V2、false がV1（DC補正なし、しきい値8%/上乗せ10%）
function calculateOutcomeProbabilities(homeExp, awayExp, useV2 = true) {
  // ステップA: 独立ポアソン＋DC補正で 0..8 点の同時確率を積み上げる
  let H = 0, D = 0, A = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    const pH = poissonProbability(homeExp, h);
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = pH * poissonProbability(awayExp, a) * dcTau(h, a, homeExp, awayExp, useV2);
      if (h > a) H += p; else if (h === a) D += p; else A += p;
    }
  }
  // ステップB: 打ち切り誤差を吸収するための正規化（補正前）
  const total = H + D + A;
  const preH = H / total, preD = D / total, preA = A / total;

  // ステップC: 引き分け上乗せ（ホーム勝率とアウェイ勝率の差が小さいほど大きく上乗せ）
  const threshold = useV2 ? 0.30 : 0.08;
  const amount = useV2 ? 0.20 : 0.10;
  let hw = preH, dw = preD, aw = preA;
  const gap = Math.abs(hw - aw);
  if (gap < threshold && hw + aw > 0) {
    const strength = 1 - gap / threshold;
    const boost = amount * strength;
    const homeShare = hw / (hw + aw);
    const awayShare = aw / (hw + aw);
    dw += boost;
    hw -= boost * homeShare;
    aw -= boost * awayShare;
  }
  // 上乗せ後は合計が1のまま（上乗せ分を勝ち側から按分で減らすため）
  return {
    preBoost: { home: preH, draw: preD, away: preA },
    final: { home: hw, draw: dw, away: aw },
    boost: { threshold, amount, gap },
  };
}

// 13試合分をまとめて計算するヘルパー（fixtures生成・テスト用）
function computeMatch({ rawHomeGoals, rawAwayGoals, marketHome, marketDraw, marketAway }) {
  const blend = blendGoalExpectancyWithMarket(rawHomeGoals, rawAwayGoals, marketHome, marketAway);
  const v2 = calculateOutcomeProbabilities(blend.homeGoals, blend.awayGoals, true);
  const v1 = calculateOutcomeProbabilities(blend.homeGoals, blend.awayGoals, false);
  return { blend, v2, v1 };
}

module.exports = {
  MARKET_WEIGHT, MARKET_EDGE_SCALE, MIN_GOALS, MAX_GOALS, DC_RHO,
  blendGoalExpectancyWithMarket, poissonProbability, dcTau,
  calculateOutcomeProbabilities, computeMatch,
};
