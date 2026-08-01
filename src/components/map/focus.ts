/**
 * Event untuk menyorot satu blok di peta. Dipancarkan komponen lain (mis. baris
 * tabel blok), didengar BlockMap. Dipisah ke modul kecil supaya tabel tidak
 * perlu tahu detail peta — cukup memancarkan id blok.
 */
export const FOCUS_BLOCK_EVENT = "agrovision:focus-block";

export function focusBlock(blockId: string) {
  window.dispatchEvent(new CustomEvent(FOCUS_BLOCK_EVENT, { detail: blockId }));
}
