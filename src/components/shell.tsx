"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ShoppingBag,
  Minus,
  Plus,
  X,
  ArrowUpRight,
  Phone,
  MapPin,
} from "lucide-react";
import { isOpen, money, restaurant } from "@/lib/domain";
import { useStore } from "./store";
export function Quantity({
  id,
  name,
  quantity,
}: {
  id: string;
  name: string;
  quantity: number;
}) {
  const { setQuantity } = useStore();
  return (
    <div className="stepper">
      <button
        type="button"
        aria-label={`Remove one ${name}`}
        onClick={() => setQuantity(id, quantity - 1)}
      >
        <Minus size={15} />
      </button>
      <span aria-live="polite">{quantity}</span>
      <button
        type="button"
        disabled={quantity >= 20}
        aria-label={`Add one ${name}`}
        onClick={() => setQuantity(id, quantity + 1)}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
export function Header() {
  const { cart, setBagOpen } = useStore();
  const count = cart.reduce((n, i) => n + i.quantity, 0);
  return (
    <header className="header">
      <Link href="/" className="wordmark" aria-label="Shawarmao Na home">
        shawarmao <em>na.</em>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/menu">The menu</Link>
        <Link className="location-link" href="/#visit">
          Find us <ArrowUpRight size={14} />
        </Link>
      </nav>
      <button
        className="bag-button"
        aria-label={`Open bag, ${count} items`}
        onClick={() => setBagOpen(true)}
      >
        <ShoppingBag size={18} />
        <span>Bag</span>
        <b>{count}</b>
      </button>
    </header>
  );
}
export function OpenStatus() {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const update = () => setOpen(isOpen());
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="hours-status">
      <i className={open ? "open" : ""} />
      {open === null
        ? "12 PM–5 AM"
        : open
          ? "Open until 5 AM"
          : "Opens at 12 PM"}
    </span>
  );
}
export function Footer() {
  return (
    <footer id="visit">
      <div className="footer-top">
        <div>
          <span className="eyebrow">COME BY. STAY A LITTLE.</span>
          <h2>
            Your corner of
            <br />
            Sector 51.
          </h2>
        </div>
        <div className="visit">
          <p>
            <MapPin size={18} />
            {restaurant.address}
          </p>
          <p>
            <Phone size={18} />
            <a href={`tel:${restaurant.phone}`}>{restaurant.displayPhone}</a>
          </p>
          <p>{restaurant.hours}</p>
          <small>Business details are awaiting final confirmation.</small>
        </div>
      </div>
      <div className="footer-bottom">
        <Link href="/" className="wordmark">
          shawarmao <em>na.</em>
        </Link>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/refunds">Cancellations</Link>
          <Link href="/admin">Staff</Link>
        </div>
        <span>Sector 51, Gurugram</span>
      </div>
    </footer>
  );
}
export function Bag() {
  const { bagOpen, setBagOpen, cart, catalog, setQuantity } = useStore();
  const dialog = useRef<HTMLDialogElement>(null);
  const subtotal = cart.reduce(
    (sum, line) =>
      sum +
      (catalog.items.find((i) => i.id === line.id)?.pricePaise || 0) *
        line.quantity,
    0,
  );
  const invalid = cart.some(
    (line) => !catalog.items.find((i) => i.id === line.id)?.available,
  );
  useEffect(() => {
    if (bagOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [bagOpen]);
  useEffect(() => {
    if (bagOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [bagOpen]);
  return (
    <dialog
      ref={dialog}
      className="bag-dialog"
      onCancel={() => setBagOpen(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) setBagOpen(false);
      }}
      aria-labelledby="bag-title"
    >
      <div className="bag-inner">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GOOD CHOICES</span>
            <h2 id="bag-title">Your bag</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close bag"
            onClick={() => setBagOpen(false)}
          >
            <X />
          </button>
        </div>
        {cart.length === 0 ? (
          <div className="empty">
            <ShoppingBag size={36} strokeWidth={1} />
            <h3>Something good goes here.</h3>
            <p>Take a look at the menu and find your order.</p>
            <button className="button" onClick={() => setBagOpen(false)}>
              Back to the menu
            </button>
          </div>
        ) : (
          <>
            <div className="bag-lines">
              {cart.map((line) => {
                const item = catalog.items.find((i) => i.id === line.id);
                return (
                  <div className="bag-line" key={line.id}>
                    <div>
                      <h3>{item?.name || "Item no longer on the menu"}</h3>
                      <p>
                        {item
                          ? money(item.pricePaise * line.quantity)
                          : "Unavailable"}
                      </p>
                      {!item?.available && (
                        <p className="error-text">
                          Please remove this unavailable item.
                        </p>
                      )}
                      <button
                        className="text-button"
                        onClick={() => setQuantity(line.id, 0)}
                      >
                        Remove
                      </button>
                    </div>
                    <Quantity
                      id={line.id}
                      name={item?.name || "item"}
                      quantity={line.quantity}
                    />
                  </div>
                );
              })}
            </div>
            <div className="bag-bottom">
              <p className="total">
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </p>
              <p className="muted">Pickup or delivery options at checkout.</p>
              {invalid ? (
                <p role="alert" className="error-text">
                  Review unavailable items before checkout.
                </p>
              ) : (
                <Link
                  className="button full"
                  href="/checkout"
                  onClick={() => setBagOpen(false)}
                >
                  Continue to checkout <ArrowUpRight size={18} />
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
export function FloatingBag() {
  const { cart, catalog, setBagOpen } = useStore();
  if (!cart.length) return null;
  const subtotal = cart.reduce(
    (sum, line) =>
      sum +
      (catalog.items.find((i) => i.id === line.id)?.pricePaise || 0) *
        line.quantity,
    0,
  );
  return (
    <button className="floating-bag" onClick={() => setBagOpen(true)}>
      <ShoppingBag size={18} />
      <span>View bag · {cart.reduce((s, i) => s + i.quantity, 0)} items</span>
      <strong>{money(subtotal)}</strong>
    </button>
  );
}
