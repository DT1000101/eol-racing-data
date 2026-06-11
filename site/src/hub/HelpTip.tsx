interface Props {
  text: string;
  label?: string;
}

/** Small ? bubble with accessible help text. */
export function HelpTip({ text, label = "Help" }: Props) {
  return (
    <span className="help-tip" tabIndex={0} role="note" aria-label={text}>
      <span className="help-tip__icon" aria-hidden>
        ?
      </span>
      <span className="help-tip__bubble">{text}</span>
      <span className="sr-only">{label}: {text}</span>
    </span>
  );
}
