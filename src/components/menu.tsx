"use client";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Search,
  Plus,
  UtensilsCrossed,
} from "lucide-react";
import { money, restaurant } from "@/lib/domain";
import { useStore } from "./store";
import { OpenStatus, Quantity } from "./shell";
export function Storefront({ menuOnly = false }: { menuOnly?: boolean }) {
  const { catalog, cart, setQuantity, loading, error, refresh } = useStore();
  const [category, setCategory] = useState("All"),
    [search, setSearch] = useState("");
  const categories = ["All", ...new Set(catalog.items.map((i) => i.category))];
  const items = catalog.items.filter(
    (i) =>
      (category === "All" || i.category === category) &&
      `${i.name} ${i.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      {!menuOnly && (
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="eyebrow">SECTOR 51 · GURUGRAM</span>
              <OpenStatus />
            </div>
            <h1>
              A little late.
              <br />A lot of <em>flavour.</em>
            </h1>
            <p>
              Shawarmao Na, straight from our place to your plans. Your next
              order starts here.
            </p>
            <a href="#menu" className="button">
              Explore the menu <ArrowDown size={18} />
            </a>
            <div className="hero-caption">
              <span>FROM NOON</span>
              <span className="rule" />
              <span>TO 5 IN THE MORNING</span>
            </div>
          </div>
          <div
            className="brand-panel"
            aria-label="Shawarmao Na, open noon to five"
          >
            <span className="brand-panel-top">SHAWARMAO NA · GURUGRAM</span>
            <div className="brand-circle">
              <span>
                GOOD FOOD.
                <br />
                LATE HOURS.
              </span>
              <strong>na.</strong>
              <span>NOON TO FIVE</span>
            </div>
            <div className="brand-panel-bottom">
              <span>
                SECTOR
                <br />
                FIFTY ONE
              </span>
              <span>
                12 PM
                <br />
                05 AM
              </span>
            </div>
          </div>
        </section>
      )}
      <div className="service-strip">
        <span>Order direct from Shawarmao Na</span>
        <span>Guest checkout</span>
        <span>
          Pickup{" "}
          {catalog.deliveryEnabled ? "& restaurant delivery" : "at Sector 51"}
        </span>
      </div>
      <section className="menu-section" id="menu">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR ORDER</span>
            <h1 className="section-title">
              The menu<span>.</span>
            </h1>
          </div>
          <p>
            Made for your lunch break.
            <br />
            And your late nights.
          </p>
        </div>
        {!catalog.orderingEnabled && (
          <div className="notice">
            Online ordering is getting ready. For current availability,{" "}
            <a href={`tel:${restaurant.phone}`}>
              call the restaurant <ArrowUpRight size={14} />
            </a>
            .
          </div>
        )}
        <div className="menu-tools">
          <nav className="categories" aria-label="Menu categories">
            {categories.map((c) => (
              <button
                className={category === c ? "active" : ""}
                aria-pressed={category === c}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c === "All" ? "Full menu" : c}
              </button>
            ))}
          </nav>
          <label className="search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Find something good"
              aria-label="Search menu"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {loading ? (
          <p className="empty" role="status">
            Loading the menu…
          </p>
        ) : error ? (
          <div className="empty" role="alert">
            <h3>We couldn’t load the menu.</h3>
            <p>{error}</p>
            <button className="button" onClick={() => void refresh()}>
              Try again
            </button>
          </div>
        ) : items.length ? (
          <div className="menu-grid">
            {items.map((item) => {
              const quantity =
                cart.find((i) => i.id === item.id)?.quantity || 0;
              return (
                <article className="menu-card" key={item.id}>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      width={480}
                      height={360}
                      loading="lazy"
                    />
                  )}
                  <div className="item-meta">
                    <span>{item.category}</span>
                    {item.dietary !== "unspecified" && (
                      <span className={`dietary ${item.dietary}`}>
                        {item.dietary === "veg"
                          ? "Vegetarian"
                          : "Non-vegetarian"}
                      </span>
                    )}
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="item-bottom">
                    <strong>{money(item.pricePaise)}</strong>
                    {!item.available ? (
                      <span className="muted">Unavailable</span>
                    ) : quantity ? (
                      <Quantity
                        id={item.id}
                        name={item.name}
                        quantity={quantity}
                      />
                    ) : (
                      <button
                        className="add-button"
                        aria-label={`Add ${item.name}`}
                        onClick={() => setQuantity(item.id, 1)}
                      >
                        Add <Plus size={16} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty menu-empty">
            <UtensilsCrossed size={32} strokeWidth={1} />
            <h3>
              {catalog.items.length
                ? "No matches this time."
                : "Our menu is on its way."}
            </h3>
            <p>
              {catalog.items.length
                ? "Try another search or category."
                : "We’re getting the details ready. Call us for the current menu and availability."}
            </p>
            {catalog.items.length ? (
              <button
                className="text-button"
                onClick={() => {
                  setCategory("All");
                  setSearch("");
                }}
              >
                Clear filters
              </button>
            ) : (
              <a href={`tel:${restaurant.phone}`} className="outline-button">
                Call Shawarmao Na <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        )}
      </section>
      <section className="direct-note">
        <span className="eyebrow">FROM OUR KITCHEN. TO YOUR EVENING.</span>
        <h2>
          Your order.
          <br />
          <em>A direct connection.</em>
        </h2>
        <p>
          Choose your food, leave your details, and follow your order here. No
          account needed.
        </p>
      </section>
    </>
  );
}
