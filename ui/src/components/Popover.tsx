import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface PopoverProps {
  /** Renders the trigger; spread `props` onto a <button>. */
  trigger: (props: {
    onClick: () => void;
    "aria-expanded": boolean;
    "aria-controls": string;
    "aria-haspopup": "dialog";
  }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  label: string;
  className?: string;
}

/** A click-to-open panel that closes on outside click and Escape. */
export function Popover({ trigger, children, align = "end", label, className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        (rootRef.current?.querySelector("button") as HTMLButtonElement | null)?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    // Move focus into the panel for keyboard users.
    const first = panelRef.current?.querySelector<HTMLElement>("button, input, select, [tabindex]");
    first?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className={`popover-root ${className ?? ""}`} ref={rootRef}>
      {trigger({
        onClick: () => setOpen((o) => !o),
        "aria-expanded": open,
        "aria-controls": id,
        "aria-haspopup": "dialog",
      })}
      {open && (
        <div
          id={id}
          ref={panelRef}
          role="dialog"
          aria-label={label}
          className={`popover-panel popover-panel--${align}`}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
