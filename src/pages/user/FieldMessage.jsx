// The red validation message shown below an input of the "create user" forms.

export default function FieldMessage({ text, fontSize }) {
  if (!text) return null;
  return <span style={{ color: '#fc5f5f', fontSize: fontSize }}>{text}</span>;
}
