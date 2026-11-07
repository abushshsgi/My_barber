import { checkoutSubscription } from "../api/subscriptions";

/** Payme «Вернуться в приложение» — callback yo'q bo'lsa payme.uz bosh sahifasi. */
export function isPaymeAppReturnUrl(url: string): boolean {
  const raw = (url || "").trim();
  if (!raw || raw === "about:blank") return false;
  if (raw.toLowerCase().startsWith("mysaloon:")) return true;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "payme.uz") return true;
    const path = parsed.pathname || "";
    return path === "/subscriptions/payme" || path.startsWith("/subscriptions/payme/");
  } catch {
    return false;
  }
}

/** Payme sahifasidagi qaytish tugmasi ilovaga xabar yuboradi, payme.uz ochilmaydi. */
export const PAYME_RETURN_INTERCEPT = `
(function () {
  function returning(url) {
    try {
      var abs = new URL(String(url || ""), location.href);
      var host = abs.hostname.toLowerCase().replace(/^www\\./, "");
      if (abs.protocol === "mysaloon:") return true;
      if (host === "payme.uz") return true;
      var path = abs.pathname || "";
      return path === "/subscriptions/payme" || path.indexOf("/subscriptions/payme/") === 0;
    } catch (e) {
      return false;
    }
  }
  function back(url) {
    if (!window.ReactNativeWebView) return;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "payme-return", url: String(url || "") }));
  }
  document.addEventListener("click", function (ev) {
    var node = ev.target;
    var href = "";
    while (node && node !== document) {
      if (node.tagName === "A" && node.href) { href = node.href; break; }
      node = node.parentNode;
    }
    if (!href || !returning(href)) return;
    ev.preventDefault();
    ev.stopPropagation();
    back(href);
  }, true);
})();
true;
`;

/**
 * Payme Subscribe — faqat rasmiy qadam:
 * receipts.create (backend) → checkout URL: https://checkout.test.paycom.uz/{receipt_id}
 */
export async function createPaymeReceipt(planCode: string): Promise<{
  checkoutUrl: string;
  orderId: string;
}> {
  const res = await checkoutSubscription({
    plan_code: planCode,
    method: "payme",
  });
  const checkoutUrl = res.checkout_url;
  const orderId = res.order_id;
  if (!checkoutUrl || !orderId) {
    throw new Error(res.message || res.detail || "Payme cheki yaratilmadi.");
  }
  return { checkoutUrl, orderId };
}
