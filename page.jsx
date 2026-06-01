"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, RotateCcw, Shield, Target, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const PAYOUT_BY_TIE_TOTAL = {
  2: 88,
  3: 25,
  4: 10,
  5: 6,
  6: 4,
  7: 4,
  8: 4,
  9: 6,
  10: 10,
  11: 25,
  12: 88,
};

const THEORETICAL_TIE_RATE = 146 / 1296;
const THEORETICAL_TIE_EV = -0.044753;

function currentGap(rounds) {
  let gap = 0;
  for (let i = rounds.length - 1; i >= 0; i--) {
    if (rounds[i].result === "TIE") break;
    gap += 1;
  }
  return gap;
}

function statsFrom(rounds) {
  const total = rounds.length;
  const safeTotal = total || 1;
  const ties = rounds.filter((r) => r.result === "TIE").length;
  const players = rounds.filter((r) => r.result === "PLAYER").length;
  const bankers = rounds.filter((r) => r.result === "BANKER").length;
  const profit = rounds.reduce((sum, r) => sum + r.profit, 0);

  return {
    total,
    ties,
    players,
    bankers,
    profit,
    tieRate: ties / safeTotal,
    playerRate: players / safeTotal,
    bankerRate: bankers / safeTotal,
    currentGap: currentGap(rounds),
  };
}

function getDecision(stats, config, bankroll) {
  if (bankroll <= config.stopLossBalance) {
    return {
      action: "STOP",
      title: "Parar sessão",
      text: "Stop-loss atingido. Não registrar nova entrada até resetar ou ajustar a banca.",
    };
  }

  if (bankroll >= config.stopGainBalance) {
    return {
      action: "STOP",
      title: "Meta batida",
      text: "Stop-gain atingido. Estratégia recomenda encerrar a sessão.",
    };
  }

  if (config.strategy === "FLAT_ALL") {
    return {
      action: "BET_TIE",
      title: `Apostar Tie: ${config.baseStake}u`,
      text: "Flat mínimo em todas as mãos para maximizar cobertura e evitar progressão agressiva.",
    };
  }

  if (stats.currentGap >= config.gapTrigger) {
    return {
      action: "BET_TIE",
      title: `Apostar Tie: ${config.baseStake}u`,
      text: `Gatilho ativo: ${stats.currentGap} mãos sem empate.`,
    };
  }

  return {
    action: "SKIP",
    title: "Aguardar",
    text: `Gap atual ${stats.currentGap}. Entrada somente após ${config.gapTrigger} mãos sem empate.`,
  };
}

export default function HomePage() {
  const [initialBankroll, setInitialBankroll] = useState(500);
  const [bankroll, setBankroll] = useState(500);
  const [rounds, setRounds] = useState([]);
  const [config, setConfig] = useState({
    strategy: "FLAT_ALL",
    baseStake: 1,
    gapTrigger: 6,
    stopLossBalance: 450,
    stopGainBalance: 550,
  });

  const stats = useMemo(() => statsFrom(rounds), [rounds]);
  const decision = useMemo(() => getDecision(stats, config, bankroll), [stats, config, bankroll]);

  function setNumberConfig(key, value) {
    setConfig((old) => ({ ...old, [key]: Number(value) }));
  }

  function registerRound(result, tieTotal = null) {
    let profit = 0;
    const placedBet = decision.action === "BET_TIE";

    if (placedBet) {
      if (result === "TIE") {
        profit = config.baseStake * (PAYOUT_BY_TIE_TOTAL[tieTotal] || 4);
      } else {
        profit = -config.baseStake;
      }
      setBankroll((old) => Number((old + profit).toFixed(2)));
    }

    setRounds((old) => [
      ...old,
      {
        id: Date.now() + Math.random(),
        result,
        tieTotal,
        bet: placedBet ? "TIE" : "SKIP",
        stake: placedBet ? config.baseStake : 0,
        profit,
        time: new Date().toLocaleTimeString("pt-PT"),
      },
    ]);
  }

  function resetSession() {
    setRounds([]);
    setBankroll(Number(initialBankroll));
  }

  const decisionClass =
    decision.action === "STOP"
      ? "border-red-200 bg-red-50"
      : decision.action === "BET_TIE"
      ? "border-emerald-200 bg-emerald-50"
      : "border-slate-200 bg-slate-50";

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="secondary">Bac Bo Tie Bot</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Painel principal do bot</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Ferramenta manual para seguir estratégia de empate com stake fixa, controle de banca e registro das mãos.
            </p>
          </div>
          <Button variant="outline" onClick={resetSession} className="gap-2 rounded-2xl">
            <RotateCcw size={18} /> Resetar sessão
          </Button>
        </header>

        <Card className={`border ${decisionClass}`}>
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                {decision.action === "STOP" ? <AlertTriangle /> : decision.action === "BET_TIE" ? <CheckCircle2 /> : <TrendingDown />}
              </div>
              <div>
                <h2 className="text-xl font-bold">{decision.title}</h2>
                <p className="text-sm text-slate-700">{decision.text}</p>
              </div>
            </div>
            <Badge variant={decision.action === "BET_TIE" ? "default" : "secondary"}>
              Tie EV teórico: {(THEORETICAL_TIE_EV * 100).toFixed(2)}%
            </Badge>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric title="Banca atual" value={`${bankroll.toFixed(2)}u`} icon={<Shield />} />
          <Metric title="Lucro da sessão" value={`${stats.profit.toFixed(2)}u`} icon={<Target />} />
          <Metric title="Mãos registradas" value={stats.total} icon={<BarChart3 />} />
          <Metric title="Gap sem Tie" value={stats.currentGap} icon={<TrendingDown />} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h3 className="text-lg font-bold">Configuração</h3>

              <label className="block text-sm font-medium text-slate-600">Estratégia</label>
              <select
                className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                value={config.strategy}
                onChange={(e) => setConfig((old) => ({ ...old, strategy: e.target.value }))}
              >
                <option value="FLAT_ALL">Flat mínimo em todas as mãos</option>
                <option value="GAP">Flat após X mãos sem empate</option>
              </select>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Banca inicial" value={initialBankroll} onChange={(v) => setInitialBankroll(Number(v))} />
                <Field label="Stake base" value={config.baseStake} onChange={(v) => setNumberConfig("baseStake", v)} />
                <Field label="Gatilho Gap" value={config.gapTrigger} onChange={(v) => setNumberConfig("gapTrigger", v)} />
                <Field label="Stop-loss" value={config.stopLossBalance} onChange={(v) => setNumberConfig("stopLossBalance", v)} />
                <Field label="Stop-gain" value={config.stopGainBalance} onChange={(v) => setNumberConfig("stopGainBalance", v)} />
              </div>

              <p className="rounded-2xl bg-slate-100 p-3 text-xs text-slate-600">
                Observação: este bot não prevê resultado e não clica em casas de aposta. Ele serve para simulação, disciplina e registro manual.
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="space-y-4 p-5">
              <h3 className="text-lg font-bold">Registrar resultado da mão</h3>
              <div className="flex flex-wrap gap-2">
                <Button disabled={decision.action === "STOP"} onClick={() => registerRound("PLAYER")}>Player</Button>
                <Button disabled={decision.action === "STOP"} onClick={() => registerRound("BANKER")}>Banker</Button>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((total) => (
                  <Button key={total} disabled={decision.action === "STOP"} variant="secondary" onClick={() => registerRound("TIE", total)}>
                    Tie {total}
                  </Button>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <MiniStat title="Tie observado" value={`${(stats.tieRate * 100).toFixed(2)}%`} hint={`Teórico: ${(THEORETICAL_TIE_RATE * 100).toFixed(2)}%`} />
                <MiniStat title="Player" value={`${(stats.playerRate * 100).toFixed(2)}%`} />
                <MiniStat title="Banker" value={`${(stats.bankerRate * 100).toFixed(2)}%`} />
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="p-3">Hora</th>
                      <th className="p-3">Resultado</th>
                      <th className="p-3">Ação</th>
                      <th className="p-3">Stake</th>
                      <th className="p-3">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.slice(-10).reverse().map((round) => (
                      <tr key={round.id} className="border-t bg-white">
                        <td className="p-3 text-slate-500">{round.time}</td>
                        <td className="p-3 font-semibold">{round.result}{round.tieTotal ? ` ${round.tieTotal}` : ""}</td>
                        <td className="p-3">{round.bet}</td>
                        <td className="p-3">{round.stake}u</td>
                        <td className={round.profit >= 0 ? "p-3 font-bold text-emerald-700" : "p-3 font-bold text-red-700"}>{round.profit.toFixed(2)}u</td>
                      </tr>
                    ))}
                    {rounds.length === 0 && (
                      <tr>
                        <td className="p-8 text-center text-slate-500" colSpan="5">Nenhum resultado registrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Metric({ title, value, icon }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-600">{label}</label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function MiniStat({ title, value, hint }) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-xl font-bold">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
