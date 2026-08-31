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
// ~50-field Beverly Law form is only rendered in one place.
export default function IntakeFormFields({ defaultValues }: { defaultValues?: BeverlyLawAnswers }) {
  return (
    <>
      {BEVERLY_LAW_SECTIONS.map((section) => (
        <fieldset
          key={section.title}
          style={{
            border: "1px solid var(--glass-border)",
            borderRadius: 8,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <legend style={{ padding: "0 8px", fontSize: 14, fontWeight: 600 }}>{section.title}</legend>

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
      ))}
    </>
  );
}
