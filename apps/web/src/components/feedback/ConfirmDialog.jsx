import {
  useEffect,
  useRef,
} from "react";
import {
  Loader2,
  X,
} from "lucide-react";

import "./ConfirmDialog.css";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousActiveElement =
      document.activeElement;

    document.body.style.overflow =
      "hidden";

    const focusTimer =
      window.setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 0);

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (!loading) {
          onCancel();
        }

        return;
      }

      if (
        event.key !== "Tab" ||
        !dialogRef.current
      ) {
        return;
      }

      const focusableElements =
        dialogRef.current.querySelectorAll(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        );

      if (!focusableElements.length) {
        event.preventDefault();
        return;
      }

      const first =
        focusableElements[0];

      const last =
        focusableElements[
          focusableElements.length - 1
        ];

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = "";

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      previousActiveElement?.focus?.();
    };
  }, [
    loading,
    onCancel,
    open,
  ]);

  if (!open) return null;

  return (
    <div
      className="svx-confirm-layer"
      role="presentation"
    >
      <button
        type="button"
        className="svx-confirm-backdrop"
        aria-label="Close confirmation"
        disabled={loading}
        onClick={onCancel}
      />

      <section
        ref={dialogRef}
        className="svx-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="svx-confirm-title"
        aria-describedby="svx-confirm-description"
      >
        <header className="svx-confirm-header">
          <div>
            <h2 id="svx-confirm-title">
              {title}
            </h2>

            <p id="svx-confirm-description">
              {description}
            </p>
          </div>

          <button
            type="button"
            className="svx-confirm-close"
            aria-label="Close confirmation"
            disabled={loading}
            onClick={onCancel}
          >
            <X
              size={19}
              strokeWidth={2.2}
            />
          </button>
        </header>

        <footer className="svx-confirm-actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="svx-confirm-button is-cancel"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={`svx-confirm-button is-confirm is-${tone}`}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (
              <Loader2
                size={16}
                className="svx-confirm-spinner"
              />
            ) : null}

            <span>{confirmLabel}</span>
          </button>
        </footer>
      </section>
    </div>
  );
}
