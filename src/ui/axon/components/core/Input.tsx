import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type InputProps = ({ multiline?: false } & InputHTMLAttributes<HTMLInputElement>) | ({ multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>);

export function Input(props: InputProps) {
  const base = { color: "var(--ax-ink)", background: "var(--ax-bg)", border: "var(--ax-border)", borderRadius: "var(--ax-r-md)", padding: "12px 14px", width: "100%" } as const;
  if (props.multiline) {
    const { multiline, style, ...rest } = props;
    void multiline;
    return <textarea style={{ ...base, minHeight: 76, resize: "vertical", ...style }} {...rest} />;
  }
  const { multiline, style, ...rest } = props;
  void multiline;
  return <input style={{ ...base, minHeight: "var(--ax-hit)", ...style }} {...rest} />;
}
