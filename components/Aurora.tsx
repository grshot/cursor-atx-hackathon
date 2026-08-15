// Static ambient backdrop: aurora ribbons in the fox palette drifting over
// deep navy, plus a film-grain overlay. Pure CSS animation, no client JS.
export function Aurora({ dim = false }: { dim?: boolean }) {
  return (
    <div className={`aurora${dim ? " dim" : ""}`} aria-hidden>
      <div className="aurora-blob blob-green" />
      <div className="aurora-blob blob-sky" />
      <div className="aurora-blob blob-orange" />
      <div className="aurora-blob blob-olive" />
      <div className="grain" />
    </div>
  );
}
