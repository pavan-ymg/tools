"use client";

import { useState } from "react";
import { BEVERLY_LAW_SECTIONS, type BeverlyLawAnswers } from "@/lib/forms/beverly-law";

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--glass-border)",
  background: "rgba(0,0,0,0.2)",
  color: "var(--text-primary)",
  width: "100%",
  boxSizing: "border-box",
};

// Shared by /intake/new (blank) and /intake/[id] (pre-filled) so the
// ~50-field Beverly Law form is only rendered in one place. Rendered as
// an accordion — 9 sections is too much to scan at once, but a strict
// single-open accordion risks someone submitting with a required field
// left blank in a section they never opened, so any number of sections
// can be open at once; only the first starts open.
export default function IntakeFormFields({ defaultValues }: { defaultValues?: BeverlyLawAnswers }) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set([BEVERLY_LAW_SECTIONS[0]?.title]));

  function toggle(title: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  return (
    <>
      {BEVERLY_LAW_SECTIONS.map((section) => {
        const isOpen = openSections.has(section.title);
        // A section with any pre-filled value is flagged so an editor
        // can tell what's already answered before opening it.
        const filledCount = section.fields.filter((f) => {
          const v = defaultValues?.[f.name];
          return v !== undefined && v !== null && v !== "" && v !== false;
        }).length;

        return (
          <div
            key={section.title}
            style={{
              border: "1px solid var(--glass-border)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => toggle(section.title)}
              aria-expanded={isOpen}
              className="chip"
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                background: "transparent",
                border: "none",
                borderRadius: 0,
                cursor: "pointer",
                textAlign: "left",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              <span>{section.title}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {defaultValues && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-secondary)" }}>
                    {filledCount}/{section.fields.length} filled
                  </span>
                )}
                <span
                  style={{
                    display: "inline-block",
                    transition: "transform 0.15s ease",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    color: "var(--accent)",
                  }}
                >
                  ▾
                </span>
              </span>
            </button>

            {
              // Kept mounted (never unmounted) and just hidden via
              // display:none when collapsed — these are uncontrolled
              // inputs, so unmounting the fieldset on collapse would
              // silently discard anything already typed into it.
            }
            <fieldset
              style={{
                border: "none",
                borderTop: isOpen ? "1px solid var(--glass-border)" : "none",
                padding: isOpen ? 16 : 0,
                display: isOpen ? "flex" : "none",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {section.fields.map((field) => {
                  const existing = defaultValues?.[field.name];

                  return (
                    <label key={field.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{field.label}</span>

                      {field.type === "text" || field.type === "email" || field.type === "date" || field.type === "time" ? (
                        <input name={field.name} type={field.type} defaultValue={(existing as string) ?? ""} style={inputStyle} />
                      ) : field.type === "textarea" ? (
                        <textarea name={field.name} rows={3} defaultValue={(existing as string) ?? ""} style={inputStyle} />
                      ) : field.type === "select" ? (
                        <select name={field.name} style={inputStyle} defaultValue={(existing as string) ?? ""}>
                          <option value="" disabled>
                            Select…
                          </option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name={field.name}
                          type="checkbox"
                          defaultChecked={Boolean(existing)}
                          style={{ width: 18, height: 18 }}
                        />
                      )}
                    </label>
                  );
                })}
            </fieldset>
          </div>
        );
      })}
    </>
  );
}
