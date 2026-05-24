"use client";

import { useState } from "react";
import { DEFAULT_CONFIG, FlowerGrid, FlowerGridConfig } from "./FlowerGrid";

interface SliderRowProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function SliderRow({ label, description, value, min, max, step, onChange }: SliderRowProps) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-semibold text-stone-700">{label}</span>
        <span className="text-xs tabular-nums font-mono text-stone-500 w-10 text-right">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-amber-700 cursor-pointer"
      />
      <p className="text-[10px] text-stone-400 leading-tight">{description}</p>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start gap-2.5">
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`mt-0.5 flex-none relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
          value ? "bg-amber-700" : "bg-stone-300"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-[14px]" : "translate-x-[2px]"
          }`}
        />
      </button>
      <div>
        <p className="text-xs font-semibold text-stone-700">{label}</p>
        <p className="text-[10px] text-stone-400 leading-tight">{description}</p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pt-1">{children}</p>
  );
}

export interface FlowerGridPlaygroundProps {
  centerLetter: string;
  outerLetters: string[];
  onLetterClick: (letter: string) => void;
}

export function FlowerGridPlayground({ centerLetter, outerLetters, onLetterClick }: FlowerGridPlaygroundProps) {
  const [cfg, setCfg] = useState<FlowerGridConfig>(DEFAULT_CONFIG);
  const set = <K extends keyof FlowerGridConfig>(key: K, val: FlowerGridConfig[K]) =>
    setCfg((prev) => ({ ...prev, [key]: val }));

  return (
    <>
      {/* Grid renders in normal flow, identical to plain FlowerGrid */}
      <FlowerGrid
        centerLetter={centerLetter}
        outerLetters={outerLetters}
        onLetterClick={onLetterClick}
        config={cfg}
      />

      {/* Fixed panel — desktop only, does not affect game layout */}
      <div className="fixed top-0 right-0 h-screen w-72 bg-white border-l border-stone-200 overflow-y-auto z-50 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-stone-100">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Design Panel</p>
          <p className="text-[10px] text-stone-400 mt-0.5">Temporary — desktop only</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <SectionLabel>Shape</SectionLabel>
          <SliderRow
            label="Inner Radius"
            description="Gap between center button and petal inner edge"
            value={cfg.rInner} min={20} max={80} step={1}
            onChange={(v) => set("rInner", v)}
          />
          <SliderRow
            label="Outer Radius"
            description="Outer edge of petals — overall flower size"
            value={cfg.rOuter} min={80} max={160} step={1}
            onChange={(v) => set("rOuter", v)}
          />
          <SliderRow
            label="Center Size"
            description="Radius of the required-letter circle"
            value={cfg.rCenter} min={20} max={70} step={1}
            onChange={(v) => set("rCenter", v)}
          />

          <SectionLabel>Gaps</SectionLabel>
          <SliderRow
            label="Gap (degrees)"
            description="Angular gap between adjacent petals"
            value={cfg.gapDeg} min={0} max={12} step={0.5}
            onChange={(v) => set("gapDeg", v)}
          />
          <SliderRow
            label="Inner Flare"
            description="Extra narrowing at inner arc — widens gap near center"
            value={cfg.innerExtra} min={0} max={12} step={0.5}
            onChange={(v) => set("innerExtra", v)}
          />

          <SectionLabel>Sides</SectionLabel>
          <SliderRow
            label="Side Curvature"
            description="0 = straight radial sides; higher = petal sides bow outward"
            value={cfg.sideCurvature} min={0} max={15} step={0.5}
            onChange={(v) => set("sideCurvature", v)}
          />

          <SectionLabel>Text</SectionLabel>
          <SliderRow
            label="Petal Letter Size"
            description="Font size on outer petals"
            value={cfg.segFontSize} min={12} max={36} step={1}
            onChange={(v) => set("segFontSize", v)}
          />
          <SliderRow
            label="Center Letter Size"
            description="Font size on the center button"
            value={cfg.centerFontSize} min={12} max={40} step={1}
            onChange={(v) => set("centerFontSize", v)}
          />

          <SectionLabel>Style</SectionLabel>
          <SliderRow
            label="Stroke Width"
            description="Border thickness around each petal"
            value={cfg.strokeWidth} min={0} max={5} step={0.25}
            onChange={(v) => set("strokeWidth", v)}
          />
          <ToggleRow
            label="Gradient"
            description="Radial gradient on petals (off = flat sand color)"
            value={cfg.showGradient}
            onChange={(v) => set("showGradient", v)}
          />
        </div>

        <div className="px-4 py-3 border-t border-stone-100 space-y-2">
          <button
            onClick={() => setCfg(DEFAULT_CONFIG)}
            className="text-[10px] text-stone-400 hover:text-stone-600 underline underline-offset-2"
          >
            Reset to defaults
          </button>
          <pre className="text-[9px] font-mono text-stone-400 bg-stone-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(cfg, null, 2)}
          </pre>
        </div>
      </div>
    </>
  );
}
