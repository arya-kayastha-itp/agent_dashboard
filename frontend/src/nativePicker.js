// Native date / datetime inputs only open their calendar from the small icon
// at the field's right edge. Wire this to the input's onClick so a click
// anywhere on the field opens it. showPicker() throws outside a user gesture
// and is missing in older browsers — in both cases the native icon and
// keyboard entry keep working, so the error is deliberately swallowed.
export function openNativePicker(event) {
  const input = event.currentTarget;
  if (typeof input.showPicker !== 'function') return;
  try {
    input.showPicker();
  } catch {
    // fall back to the browser's own icon / keyboard picker
  }
}
