export function Field({
  name,
  label,
  error,
  hint,
  children,
}: {
  name: string;
  label: string;
  error?: string[];
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      {hint && <p className="field-hint">{hint}</p>}
      {children}
      {error && (
        <p id={`${name}-error`} className="field-error">
          {error.join(" ")}
        </p>
      )}
    </div>
  );
}

export function SelectOptions({ values }: { values: Record<string, string> }) {
  return Object.entries(values).map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));
}
