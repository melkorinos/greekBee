"use client";

import { useState, useSyncExternalStore } from "react";
import { DEFAULT_FLOWER_CONFIG, DEFAULT_PIE_CONFIG, FlowerGrid, FlowerGridConfig } from "./FlowerGrid";

// ── Primitive controls ────────────────────────────────────────────────────────

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
        className="w-full h-1.5 cursor-pointer accent-amber-700"
      />
      <p className="text-[10px] text-stone-400 leading-tight">{description}</p>
    </div>
  );
}

interface ColorRowProps {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorRow({ label, description, value, onChange }: ColorRowProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 flex-none cursor-pointer rounded border border-stone-200 p-0.5 bg-white"
      />
      <div className="min-w-0">
        <span className="text-xs font-semibold text-stone-700">{label}</span>
        <p className="text-[10px] text-stone-400 leading-tight truncate">{description}</p>
      </div>
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
    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pt-1 border-t border-stone-100">
      {children}
    </p>
  );
}

function VariantToggle({ value, onChange }: { value: "pie" | "flower"; onChange: (v: "pie" | "flower") => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-stone-200 text-xs font-semibold">
      <button
        onClick={() => onChange("pie")}
        className={`flex-1 py-2 transition-colors ${
          value === "pie" ? "bg-amber-700 text-white" : "bg-white text-stone-500 hover:bg-stone-50"
        }`}
      >
        Pie Slice
      </button>
      <button
        onClick={() => onChange("flower")}
        className={`flex-1 py-2 transition-colors ${
          value === "flower" ? "bg-emerald-700 text-white" : "bg-white text-stone-500 hover:bg-stone-50"
        }`}
      >
        Flower
      </button>
    </div>
  );
}

// ── Playground ────────────────────────────────────────────────────────────────

export interface FlowerGridPlaygroundProps {
  centerLetter: string;
  outerLetters: string[];
  onLetterClick: (letter: string) => void;
  variant?: "pie" | "flower";
}

export function FlowerGridPlayground({ centerLetter, outerLetters, onLetterClick, variant }: FlowerGridPlaygroundProps) {
  // useSyncExternalStore reads the URL on the client; server always returns false.
  // Avoids the setState-in-effect pattern while correctly detecting ?design on mount.
  const isDesignMode = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).has("design"),
    () => false,
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [cfg, setCfg] = useState<FlowerGridConfig>(DEFAULT_PIE_CONFIG);
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof FlowerGridConfig>(key: K, val: FlowerGridConfig[K]) =>
    setCfg((prev) => ({ ...prev, [key]: val }));

  function handleCopy() {
    const text = JSON.stringify(cfg, null, 2);
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Not in design mode — render with the prod variant config
  if (!isDesignMode) {
    const prodConfig = variant === "flower" ? DEFAULT_FLOWER_CONFIG : DEFAULT_PIE_CONFIG;
    return (
      <FlowerGrid
        centerLetter={centerLetter}
        outerLetters={outerLetters}
        onLetterClick={onLetterClick}
        config={prodConfig}
      />
    );
  }

  return (
    <>
      <FlowerGrid
        centerLetter={centerLetter}
        outerLetters={outerLetters}
        onLetterClick={onLetterClick}
        config={cfg}
      />

      {/* Mobile open button — only visible when panel is closed */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          aria-label="Open design panel"
          className="md:hidden fixed bottom-5 right-4 z-40 w-12 h-12 rounded-full bg-amber-700 text-white shadow-lg flex items-center justify-center text-xl"
        >
          ⚙
        </button>
      )}

      {/* Panel — bottom sheet on mobile, fixed sidebar on desktop */}
      <div
        className={[
          // base
          "fixed z-50 bg-white border-stone-200 flex flex-col transition-transform duration-300",
          // mobile: slides up from bottom
          "bottom-0 left-0 right-0 border-t rounded-t-2xl max-h-[82vh]",
          panelOpen ? "translate-y-0" : "translate-y-full",
          // desktop: always-visible right sidebar, override all mobile styles
          "md:top-0 md:right-0 md:left-auto md:bottom-auto md:w-72 md:h-screen",
          "md:max-h-none md:rounded-none md:border-t-0 md:border-l md:translate-y-0",
        ].join(" ")}
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-3 border-b border-stone-100 space-y-2 flex-none">
          {/* Mobile drag handle */}
          <div className="md:hidden w-10 h-1 bg-stone-200 rounded-full mx-auto" />
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Design Panel</p>
            <button
              onClick={() => setPanelOpen(false)}
              aria-label="Close design panel"
              className="md:hidden text-stone-400 hover:text-stone-600 text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
          <VariantToggle
            value={cfg.variant}
            onChange={(v) => setCfg(v === "flower" ? DEFAULT_FLOWER_CONFIG : DEFAULT_PIE_CONFIG)}
          />
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {cfg.variant === "pie" && (
            <>
              <SectionLabel>Shape</SectionLabel>
              <SliderRow label="Inner Radius" description="Gap from center button to inner arc"
                value={cfg.rInner} min={20} max={80} step={1} onChange={(v) => set("rInner", v)} />
              <SliderRow label="Outer Radius" description="Outer arc edge — overall flower size"
                value={cfg.rOuter} min={80} max={160} step={1} onChange={(v) => set("rOuter", v)} />
              <SectionLabel>Gaps</SectionLabel>
              <SliderRow label="Gap (degrees)" description="Angular gap between adjacent petals"
                value={cfg.gapDeg} min={0} max={14} step={0.5} onChange={(v) => set("gapDeg", v)} />
              <SliderRow label="Inner Flare" description="Extra narrowing at inner arc — widens gap near center"
                value={cfg.innerExtra} min={0} max={14} step={0.5} onChange={(v) => set("innerExtra", v)} />
              <SectionLabel>Sides</SectionLabel>
              <SliderRow label="Side Curvature" description="0 = straight sides; higher = sides bow outward"
                value={cfg.sideCurvature} min={0} max={20} step={0.5} onChange={(v) => set("sideCurvature", v)} />
              <SectionLabel>Pie Colors</SectionLabel>
              <ColorRow label="Fill (flat)" description="Petal color when gradient is off"
                value={cfg.segFillColor} onChange={(v) => set("segFillColor", v)} />
              <ColorRow label="Stroke" description="Petal border color"
                value={cfg.segStrokeColor} onChange={(v) => set("segStrokeColor", v)} />
              <ColorRow label="Letter" description="Letter color on petals"
                value={cfg.segTextColor} onChange={(v) => set("segTextColor", v)} />
              <ColorRow label="Gradient inner" description="Gradient color near center"
                value={cfg.segGradStart} onChange={(v) => set("segGradStart", v)} />
              <ColorRow label="Gradient outer" description="Gradient color at outer edge"
                value={cfg.segGradEnd} onChange={(v) => set("segGradEnd", v)} />
            </>
          )}

          {cfg.variant === "flower" && (
            <>
              <SectionLabel>Petal Shape</SectionLabel>
              <SliderRow label="Petal Length" description="Radial semi-axis — how far the petal extends outward"
                value={cfg.petalLength} min={20} max={90} step={1} onChange={(v) => set("petalLength", v)} />
              <SliderRow label="Petal Width" description="Tangential semi-axis — how wide the petal is"
                value={cfg.petalWidth} min={10} max={70} step={1} onChange={(v) => set("petalWidth", v)} />
              <SectionLabel>Petal Position</SectionLabel>
              <SliderRow label="Petal Distance" description="Center-to-center distance from origin to each petal"
                value={cfg.petalDist} min={30} max={130} step={1} onChange={(v) => set("petalDist", v)} />
              <SliderRow label="Petal Rotation" description="Extra angle offset — 0 = radial, non-zero = pinwheel tilt"
                value={cfg.petalRotation} min={-45} max={45} step={1} onChange={(v) => set("petalRotation", v)} />
              <SectionLabel>Flower Colors</SectionLabel>
              <ColorRow label="Fill (flat)" description="Petal color when gradient is off"
                value={cfg.petalFillColor} onChange={(v) => set("petalFillColor", v)} />
              <ColorRow label="Stroke" description="Petal border color"
                value={cfg.petalStrokeColor} onChange={(v) => set("petalStrokeColor", v)} />
              <ColorRow label="Letter" description="Letter color on petals"
                value={cfg.petalTextColor} onChange={(v) => set("petalTextColor", v)} />
              <ColorRow label="Gradient center" description="Gradient color near SVG center"
                value={cfg.petalGradStart} onChange={(v) => set("petalGradStart", v)} />
              <ColorRow label="Gradient outer" description="Gradient color at petal tips"
                value={cfg.petalGradEnd} onChange={(v) => set("petalGradEnd", v)} />
            </>
          )}

          <SectionLabel>Center Button</SectionLabel>
          <SliderRow label="Center Size" description="Radius of the required-letter circle"
            value={cfg.rCenter} min={20} max={70} step={1} onChange={(v) => set("rCenter", v)} />
          <ColorRow label="Fill (flat)" description="Center color when gradient is off"
            value={cfg.centerFillColor} onChange={(v) => set("centerFillColor", v)} />
          <ColorRow label="Stroke" description="Center border color"
            value={cfg.centerStrokeColor} onChange={(v) => set("centerStrokeColor", v)} />
          <ColorRow label="Letter" description="Letter color on center button"
            value={cfg.centerTextColor} onChange={(v) => set("centerTextColor", v)} />
          <ColorRow label="Gradient inner" description="Gradient color at circle center"
            value={cfg.centerGradStart} onChange={(v) => set("centerGradStart", v)} />
          <ColorRow label="Gradient outer" description="Gradient color at circle edge"
            value={cfg.centerGradEnd} onChange={(v) => set("centerGradEnd", v)} />

          <SectionLabel>Text</SectionLabel>
          <SliderRow label="Petal Letter Size" description="Font size on outer petals"
            value={cfg.segFontSize} min={12} max={36} step={1} onChange={(v) => set("segFontSize", v)} />
          <SliderRow label="Center Letter Size" description="Font size on the center button"
            value={cfg.centerFontSize} min={12} max={40} step={1} onChange={(v) => set("centerFontSize", v)} />

          <SectionLabel>Style</SectionLabel>
          <SliderRow label="Stroke Width" description="Border thickness around all elements"
            value={cfg.strokeWidth} min={0} max={5} step={0.25} onChange={(v) => set("strokeWidth", v)} />
          <ToggleRow label="Gradient" description="Radial gradient on petals and center (off = flat fill)"
            value={cfg.showGradient} onChange={(v) => set("showGradient", v)} />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-stone-100 flex gap-2 flex-none">
          <button
            onClick={handleCopy}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors ${
              copied
                ? "bg-green-100 text-green-700"
                : "bg-stone-100 hover:bg-stone-200 text-stone-600"
            }`}
          >
            {copied ? "✓ Copied!" : "Copy config"}
          </button>
          <button
            onClick={() => setCfg(cfg.variant === "flower" ? DEFAULT_FLOWER_CONFIG : DEFAULT_PIE_CONFIG)}
            className="flex-none text-xs font-semibold py-2 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </>
  );
}
