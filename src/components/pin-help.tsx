"use client";

import { useId, useRef, useState } from "react";

import { pinRules, type PinRuleState } from "@/lib/pin-rules";

const rules = [
  ["length", "6 números."],
  ["repeat", "Sin tres iguales seguidos, como 111."],
  ["sequence", "Sin tres en fila, subiendo o bajando, como 123 o 321."],
] as const;

const tone: Record<PinRuleState, string> = {
  wait: "text-muted",
  ok: "text-accent",
  bad: "font-bold text-red-700",
};

export function PinField({
  label,
  value,
  onChange,
  showRules = true,
  onFocus,
}: {
  label: string;
  value: string;
  onChange: (pin: string) => void;
  showRules?: boolean;
  onFocus?: () => void;
}) {
  const fieldId = useId();
  const labelId = useId();
  const rulesId = useId();
  const state = pinRules(value);
  const broken = showRules && (state.repeat === "bad" || state.sequence === "bad");

  return (
    <div className="text-sm">
      <label id={labelId} htmlFor={fieldId}>
        {label}
      </label>
      <PinBoxes
        id={fieldId}
        labelId={labelId}
        rulesId={showRules ? rulesId : undefined}
        value={value}
        broken={broken}
        onChange={onChange}
        onFocus={onFocus}
      />
      {showRules ? (
        <ul id={rulesId} className="mt-2 grid gap-1 text-sm">
          {rules.map(([id, text]) => (
            <li key={id} className={tone[state[id]]}>
              {text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PinBoxes({
  id,
  labelId,
  rulesId,
  value,
  broken,
  onChange,
  onFocus,
}: {
  id: string;
  labelId: string;
  rulesId?: string;
  value: string;
  broken: boolean;
  onChange: (pin: string) => void;
  onFocus?: () => void;
}) {
  const field = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const cursor = value.length >= 6 ? 5 : value.length;

  function focusField() {
    const input = field.current;
    if (!input) return;
    input.focus();
    const end = input.value.length;
    try {
      input.setSelectionRange(end, end);
    } catch {
      /* algunos teclados móviles no permiten selección */
    }
  }

  return (
    <div
      className="relative mt-2 max-w-sm touch-manipulation"
      onPointerDown={(event) => {
        // En móvil el overlay a veces no enfoca solo: forzamos el teclado.
        if (event.target !== field.current) {
          event.preventDefault();
          focusField();
        }
      }}
    >
      <div className="pointer-events-none grid grid-cols-6 gap-2" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            className={`flex aspect-square items-center justify-center rounded-2xl border bg-white text-2xl font-bold tabular-nums sm:text-3xl ${
              active && index === cursor
                ? broken
                  ? "border-red-700 ring-2 ring-red-700/25"
                  : "border-accent ring-2 ring-accent/25"
                : broken
                  ? "border-red-700"
                  : "border-line"
            }`}
          >
            {value[index] ?? ""}
          </span>
        ))}
      </div>
      <input
        ref={field}
        id={id}
        type="text"
        value={value}
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={6}
        aria-labelledby={labelId}
        aria-describedby={rulesId}
        aria-invalid={broken}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        onFocus={() => {
          setActive(true);
          onFocus?.();
        }}
        onBlur={() => setActive(false)}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-[0.01] outline-none"
        style={{ fontSize: "16px" }}
      />
    </div>
  );
}
