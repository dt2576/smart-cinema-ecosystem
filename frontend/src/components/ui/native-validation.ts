import type { FormEvent } from "react";

function formControl(target: EventTarget) {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement ? target : null;
}

// Keep native constraints/focus behavior; only replace browser-language messages.
export function localizeInvalidField(event: FormEvent<HTMLElement>) {
  const field = formControl(event.target);
  if (!field) return;
  field.setCustomValidity("");
  const validity = field.validity;
  if (validity.valid) return;
  field.setCustomValidity(validity.valueMissing ? "Không được để trống."
    : validity.typeMismatch ? "Thông tin không đúng định dạng."
    : validity.rangeUnderflow ? `Giá trị phải từ ${field.getAttribute("min")} trở lên.`
    : validity.rangeOverflow ? `Giá trị không được vượt quá ${field.getAttribute("max")}.`
    : validity.tooLong ? `Thông tin không được quá ${field.getAttribute("maxlength")} ký tự.`
    : "Thông tin không hợp lệ. Vui lòng kiểm tra lại.");
}

export function clearFieldValidation(event: FormEvent<HTMLElement>) {
  formControl(event.target)?.setCustomValidity("");
}
