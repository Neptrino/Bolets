"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SpeciesProfile } from "@/src/lib/types";

export function ModelProfile({ species }: { species: SpeciesProfile }) {
  const data = species.modelConfig.factors.map((factor) => ({ name: factor.label.replace("Compatibilitat ", ""), weight: Math.round(factor.weight * 100), detail: factor.explanation }));
  return (
    <div className="model-profile">
      <div><p className="eyebrow">Model {species.modelConfig.version}</p><h3>Què observa la predicció</h3><p>Els pesos són part de la configuració de l’espècie, no una descripció escrita a la interfície.</p></div>
      <ResponsiveContainer width="100%" height={210}><BarChart data={data} layout="vertical" margin={{ left: 0, right: 14 }}><XAxis type="number" hide domain={[0, 25]} /><YAxis dataKey="name" type="category" width={116} tick={{ fill: "#3b3b3b", fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#fbf7e9", border: "1px solid #d1c5aa", borderRadius: 8 }} formatter={(value) => [`${value}%`, "Pes"]} labelFormatter={(label, payload) => payload[0]?.payload.detail ?? label} /><Bar dataKey="weight" fill="#bd592a" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
    </div>
  );
}
