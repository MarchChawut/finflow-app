"use client";

import { useActionState, useState, type ReactNode } from "react";

// Every "create/edit" action in this app (createCategory, createGoal,
// createTransaction, createRecurringBill, and their update/* counterparts)
// returns this exact shape — a concrete type here (rather than a generic
// parameter) sidesteps a useActionState overload-inference issue with
// generics while still type-checking each caller's own *FormState type
// structurally, since they're all identical to this.
type ModalFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

// Tailwind scans source for literal class strings — can't build these from a
// template string, so every accent used by a caller needs its own entry
// here. Purple is this app's default accent; GoalModal.tsx is the one
// exception that keeps its existing pink theme.
const SUBMIT_BUTTON_CLASSES = {
  purple: "bg-purple-600 hover:bg-purple-700",
  pink: "bg-pink-500 hover:bg-pink-600",
} as const;

// Shared shell for every "create/edit a thing in a modal" flow in this app
// (categories, goals, transactions, recurring bills) — overlay, header,
// close button, and the pending->not-pending-with-no-errors trick that
// auto-closes the modal on a successful submit. A *successful* action call
// falls through to an implicit `undefined` return (same shape as the form's
// initial state), so comparing `state` to its previous value can't detect
// success — watching the pending flag's true->false transition instead is
// unambiguous regardless of what the action returns.
export function FormModal({
  trigger,
  heading,
  submitLabel,
  action,
  initialState,
  children,
  accent = "purple",
}: {
  trigger: (open: () => void) => ReactNode;
  heading: string;
  submitLabel: string;
  action: (prevState: ModalFormState, formData: FormData) => Promise<ModalFormState> | ModalFormState;
  initialState: ModalFormState;
  /** Renders this modal's own fields — receives the latest action state so
   * field-level errors (`state?.errors?.foo`) can be shown inline. */
  children: (state: ModalFormState) => ReactNode;
  /** Submit button color — defaults to this app's usual purple accent. */
  accent?: keyof typeof SUBMIT_BUTTON_CLASSES;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, initialState);

  const [wasPending, setWasPending] = useState(false);
  if (wasPending !== pending) {
    setWasPending(pending);
    if (wasPending && !pending && !state?.errors) {
      setOpen(false);
    }
  }

  return (
    <>
      {trigger(() => setOpen(true))}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-soft-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-base">{heading}</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form action={formAction} className="space-y-4 text-sm">
              {children(state)}

              <button
                type="submit"
                disabled={pending}
                className={`w-full py-2.5 rounded-2xl ${SUBMIT_BUTTON_CLASSES[accent]} disabled:opacity-60 text-white font-medium transition-all`}
              >
                {pending ? "กำลังบันทึก..." : submitLabel}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
