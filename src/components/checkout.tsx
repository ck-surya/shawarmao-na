"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { money, orderSchema, calculateTotals } from "@/lib/domain";
import { request, useStore } from "./store";
export function Checkout() {
  const {
    cart,
    catalog,
    loading,
    error: menuError,
    clear,
    refresh,
  } = useStore();
  const router = useRouter();
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(
      "pickup",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = useRef("");
  const attempted = useRef(false);
  const pending = useRef(false);
  const payloadFingerprint = useRef("");
  const subtotal = cart.reduce(
    (s, line) =>
      s +
      (catalog.items.find((i) => i.id === line.id)?.pricePaise || 0) *
        line.quantity,
    0,
  );
  const fee = fulfillment === "delivery" ? catalog.deliveryFee || 0 : 0;
  const totals = calculateTotals(subtotal, fee, catalog.taxRateBps);
  const unavailable = cart.some(
    (line) => !catalog.items.find((i) => i.id === line.id)?.available,
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current) return;
    setError("");
    const form = new FormData(e.currentTarget);
    const raw = {
      items: cart,
      fulfillment,
      name: String(form.get("name")),
      phone: String(form.get("phone")).replace(/[\s-]/g, ""),
      address: String(form.get("address") || ""),
      notes: String(form.get("notes") || ""),
    };
    const fingerprint = JSON.stringify(raw);
    if (!key.current || payloadFingerprint.current !== fingerprint) {
      key.current = crypto.randomUUID();
      payloadFingerprint.current = fingerprint;
    }
    const parsed = orderSchema.safeParse({
      ...raw,
      idempotencyKey: key.current,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    pending.current = true;
    setBusy(true);
    attempted.current = true;
    try {
      const result = await request<{ token: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      clear();
      router.push(`/order/${result.token}`);
    } catch (e) {
      setError((e as Error).message);
      void refresh();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="page narrow" role="status">
        Loading your bag…
      </div>
    );
  if (menuError)
    return (
      <div className="page narrow">
        <h1>Menu unavailable.</h1>
        <p role="alert">{menuError}</p>
        <button className="button" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  if (!cart.length)
    return (
      <div className="page narrow">
        <h1>Your bag is empty.</h1>
        <p>Add something from the menu to get started.</p>
        <Link className="button" href="/menu">
          Explore the menu
        </Link>
      </div>
    );
  return (
    <div className="page">
      <Link className="back-link" href="/menu">
        <ArrowLeft size={15} /> Back to menu
      </Link>
      <span className="eyebrow" style={{ display: "block" }}>
        JUST A FEW DETAILS
      </span>
      <h1>Make it yours.</h1>
      <div className="checkout-grid">
        <form className="form" onSubmit={submit}>
          <fieldset className="toggle">
            <legend>How would you like your order?</legend>
            <label>
              <input
                name="fulfillment"
                type="radio"
                value="pickup"
                checked={fulfillment === "pickup"}
                onChange={() => setFulfillment("pickup")}
              />{" "}
              Pickup
            </label>
            <label>
              <input
                name="fulfillment"
                type="radio"
                value="delivery"
                checked={fulfillment === "delivery"}
                disabled={!catalog.deliveryEnabled}
                onChange={() => setFulfillment("delivery")}
              />{" "}
              Delivery
              {!catalog.deliveryEnabled && <small> · unavailable</small>}
            </label>
          </fieldset>
          <label className="field">
            Your name
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label className="field">
            Mobile number
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="10-digit mobile number"
              required
              maxLength={20}
            />
          </label>
          {fulfillment === "delivery" && (
            <label className="field">
              Complete delivery address
              <textarea
                name="address"
                autoComplete="street-address"
                required
                minLength={10}
                maxLength={500}
              />
            </label>
          )}
          <label className="field">
            Order notes{" "}
            <small>
              Optional. For allergies, please call the restaurant before
              ordering.
            </small>
            <textarea
              name="notes"
              maxLength={500}
              placeholder="Anything the team should know?"
            />
          </label>
          <div className="notice">
            Pay {fulfillment === "pickup" ? "at pickup" : "on delivery"}. Your
            order is subject to restaurant confirmation.
          </div>
          {!catalog.orderingEnabled && (
            <p className="error-text">Online ordering is not available yet.</p>
          )}
          {unavailable && (
            <p className="error-text">
              An item in your bag is unavailable. Remove it before placing your
              order.
            </p>
          )}
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <small>
            By placing an order, you agree to the{" "}
            <Link href="/terms">terms</Link>,{" "}
            <Link href="/privacy">privacy policy</Link> and{" "}
            <Link href="/refunds">cancellation policy</Link>.
          </small>
          <button
            className="button full"
            disabled={busy || unavailable || !catalog.orderingEnabled}
          >
            {busy
              ? "Sending your order…"
              : attempted.current
                ? "Retry order"
                : "Place order"}{" "}
            <ArrowUpRight size={18} />
          </button>
        </form>
        <aside className="summary-panel">
          <h2>Your order</h2>
          {cart.map((line) => {
            const item = catalog.items.find((i) => i.id === line.id);
            return (
              <div className="summary-line" key={line.id}>
                <span>
                  {line.quantity} × {item?.name || "Unavailable item"}
                </span>
                <strong>
                  {money((item?.pricePaise || 0) * line.quantity)}
                </strong>
              </div>
            );
          })}
          <div className="summary-line">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="summary-line">
            <span>{fulfillment === "delivery" ? "Delivery" : "Pickup"}</span>
            <span>{money(fee)}</span>
          </div>
          <div className="summary-line">
            <span>GST ({catalog.taxRateBps / 100}%)</span>
            <span>{money(totals.tax)}</span>
          </div>
          <div className="total">
            <span>Total</span>
            <strong>{money(totals.total)}</strong>
          </div>
          <p className="muted">
            Prices and availability are checked again when you place your order.
            No payment is collected online.
          </p>
        </aside>
      </div>
    </div>
  );
}
