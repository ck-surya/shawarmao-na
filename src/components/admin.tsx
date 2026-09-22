"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  money,
  nextStates,
  statusLabel,
  type MenuItem,
  type Order,
  type Status,
} from "@/lib/domain";
import { request, useStore } from "./store";
export function Admin({
  tab = "orders",
}: {
  tab?: "orders" | "menu" | "settings";
}) {
  const [authenticated, setAuthenticated] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    request("/api/admin/session")
      .then(() => setAuthenticated(true))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/session", {
        method: "POST",
        body: JSON.stringify({
          password: new FormData(e.currentTarget).get("password"),
        }),
      });
      setAuthenticated(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="page" role="status">
        Checking staff access…
      </div>
    );
  if (!authenticated)
    return (
      <div className="page narrow">
        <span className="eyebrow">FOR THE RESTAURANT TEAM</span>
        <h1>Staff sign in.</h1>
        <form className="form" onSubmit={signIn}>
          <label className="field">
            Staff password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </label>
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  return (
    <div className="page">
      <div className="admin-top">
        <div>
          <span className="eyebrow">SHAWARMAO NA · STAFF</span>
          <h1 style={{ margin: "12px 0 28px" }}>
            {tab === "menu"
              ? "The menu."
              : tab === "settings"
                ? "Restaurant setup."
                : "On the pass."}
          </h1>
        </div>
        <button
          className="text-button"
          onClick={async () => {
            try {
              await request("/api/admin/session", { method: "DELETE" });
              setAuthenticated(false);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Sign out
        </button>
      </div>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      <nav className="admin-tabs" aria-label="Staff navigation">
        <Link className={tab === "orders" ? "active" : ""} href="/admin/orders">
          Orders
        </Link>
        <Link className={tab === "menu" ? "active" : ""} href="/admin/menu">
          Menu
        </Link>
        <Link
          className={tab === "settings" ? "active" : ""}
          href="/admin/settings"
        >
          Setup
        </Link>
      </nav>
      {tab === "orders" ? (
        <Orders />
      ) : tab === "menu" ? (
        <MenuEditor />
      ) : (
        <Settings />
      )}
    </div>
  );
}
function Orders() {
  const [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [filter, setFilter] = useState("active");
  const refresh = useCallback(async () => {
    try {
      setOrders(
        (await request<{ orders: Order[] }>("/api/admin/orders")).orders,
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function transition(id: string, status: Status) {
    setBusy(id);
    setError("");
    try {
      await request("/api/admin/order-status", {
        method: "POST",
        body: JSON.stringify({ id, status }),
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const day = (v: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(v);
  const today = orders.filter(
    (o) => day(new Date(o.createdAt)) === day(new Date()),
  );
  const completed = today.filter((o) => o.status === "delivered");
  const total = completed.reduce((s, o) => s + o.total, 0);
  const visible = orders.filter(
    (o) =>
      filter === "all" ||
      (filter === "active"
        ? !["delivered", "cancelled", "rejected"].includes(o.status)
        : o.status === filter),
  );
  return (
    <>
      <div className="stats">
        <div>
          <strong>{today.length}</strong>
          <span>Orders today · IST</span>
        </div>
        <div>
          <strong>{money(total)}</strong>
          <span>Completed order value today</span>
        </div>
        <div>
          <strong>
            {money(completed.length ? Math.round(total / completed.length) : 0)}
          </strong>
          <span>Average completed order</span>
        </div>
      </div>
      <p className="live-status">
        Latest 200 orders · Refreshes every 10 seconds · Order value does not
        confirm payment collection.
      </p>
      <div className="menu-tools">
        <label className="field">
          Show orders
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="active">Active orders</option>
            <option value="all">All orders</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label} ({orders.filter((o) => o.status === value).length})
              </option>
            ))}
          </select>
        </label>
        <button className="text-button" onClick={() => void refresh()}>
          Refresh orders
        </button>
      </div>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading orders…</p>
      ) : !visible.length ? (
        <div className="empty">
          <h3>The pass is clear.</h3>
          <p>Orders matching this view will appear here.</p>
        </div>
      ) : (
        <div className="order-list">
          {visible.map((order) => (
            <details
              className="order-card"
              key={order.id}
              open={order.status === "pending"}
            >
              <summary>
                <div>
                  <h3>{order.number}</h3>
                  <small>
                    {order.name} · {order.fulfillment} ·{" "}
                    {new Date(order.createdAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </small>
                </div>
                <strong>{money(order.total)}</strong>
                <span className="status-tag">{statusLabel[order.status]}</span>
              </summary>
              <div className="order-details">
                <p>
                  <a href={`tel:${order.phone}`}>{order.phone}</a>
                </p>
                {order.address && <p>{order.address}</p>}
                {order.notes && (
                  <p>
                    <strong>Notes:</strong> {order.notes}
                  </p>
                )}
                {order.items.map((i) => (
                  <div className="summary-line" key={i.id}>
                    <span>
                      {i.quantity} × {i.name}
                    </span>
                    <span>{money(i.pricePaise * i.quantity)}</span>
                  </div>
                ))}
                {order.taxRateBps > 0 && (
                  <p>
                    GST ({order.taxRateBps / 100}%): {money(order.tax)}
                  </p>
                )}
                <p>Delivery fee: {money(order.deliveryFee)}</p>
                <p className="muted">Payment is not recorded as paid.</p>
                <div className="order-actions">
                  {nextStates(order.status, order.fulfillment).map((status) => (
                    <button
                      disabled={busy === order.id}
                      key={status}
                      onClick={() => void transition(order.id, status)}
                    >
                      {status === "confirmed"
                        ? "Accept order"
                        : status === "rejected"
                          ? "Reject order"
                          : status === "cancelled"
                            ? "Cancel order"
                            : `Mark ${statusLabel[status].toLowerCase()}`}
                    </button>
                  ))}
                </div>
                <h3 style={{ fontSize: 18 }}>Status history</h3>
                {order.history.map((h, index) => (
                  <p key={index}>
                    <small>
                      {statusLabel[h.status]} ·{" "}
                      {new Date(h.at).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </small>
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
function MenuEditor() {
  const { refresh: refreshPublic } = useStore();
  const formRef = useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<MenuItem[]>([]),
    [editing, setEditing] = useState<MenuItem | null>(null),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  const refresh = useCallback(async () => {
    setItems((await request<{ items: MenuItem[] }>("/api/admin/menu")).items);
  }, []);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  useEffect(() => {
    if (!editing) return;
    formRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    formRef.current
      ?.querySelector<HTMLInputElement>('input[name="name"]')
      ?.focus({ preventScroll: true });
  }, [editing, version]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    const form = new FormData(e.currentTarget);
    const data = {
      ...(editing ? { id: editing.id } : {}),
      name: form.get("name"),
      description: form.get("description"),
      category: form.get("category"),
      pricePaise: Math.round(Number(form.get("price")) * 100),
      image: form.get("image"),
      dietary: form.get("dietary"),
      available: form.get("available") === "on",
      verified: form.get("verified") === "on",
    };
    try {
      await request("/api/admin/menu", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setEditing(null);
      setVersion((v) => v + 1);
      setSuccess("Menu item saved.");
      await refresh();
      await refreshPublic();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(item: MenuItem) {
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/menu", {
        method: "POST",
        body: JSON.stringify({ ...item, available: !item.available }),
      });
      await refresh();
      await refreshPublic();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="notice">
        Only publish owner-approved names, prices, dietary markers and
        descriptions. Unverified items stay hidden from customers.
      </div>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="live-status">
          {success}
        </p>
      )}
      <div className="admin-menu">
        <form
          className="form menu-editor-form"
          ref={formRef}
          key={`${editing?.id || "new"}-${version}`}
          onSubmit={save}
        >
          <h2 style={{ fontSize: 30 }}>
            {editing ? "Edit item" : "Add an item"}
          </h2>
          <label className="field">
            Item name
            <input
              name="name"
              defaultValue={editing?.name}
              required
              minLength={2}
              maxLength={100}
            />
          </label>
          <label className="field">
            Description
            <textarea
              name="description"
              defaultValue={editing?.description}
              maxLength={300}
            />
          </label>
          <label className="field">
            Category
            <input
              name="category"
              defaultValue={editing?.category}
              required
              minLength={2}
              maxLength={60}
            />
          </label>
          <label className="field">
            Price in rupees
            <input
              name="price"
              type="number"
              step="0.01"
              min="1"
              max="10000"
              defaultValue={editing ? editing.pricePaise / 100 : undefined}
              required
            />
          </label>
          <label className="field">
            Dietary marker
            <select
              name="dietary"
              defaultValue={editing?.dietary || "unspecified"}
            >
              <option value="unspecified">Not specified</option>
              <option value="veg">Verified vegetarian</option>
              <option value="non-veg">Verified non-vegetarian</option>
            </select>
          </label>
          <label className="field">
            Photo path{" "}
            <small>Optional. Use an approved file under /images/.</small>
            <input
              name="image"
              defaultValue={editing?.image || ""}
              placeholder="/images/item.webp"
            />
          </label>
          <label className="checkbox">
            <input
              name="available"
              type="checkbox"
              defaultChecked={editing?.available ?? true}
            />{" "}
            Available to order
          </label>
          <label className="checkbox">
            <input
              name="verified"
              type="checkbox"
              defaultChecked={editing?.verified ?? false}
            />{" "}
            Owner has verified this item and price
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save item"}
          </button>
          {editing && (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setEditing(null);
                setVersion((v) => v + 1);
              }}
            >
              Cancel editing
            </button>
          )}
        </form>
        <section>
          <h2 style={{ fontSize: 30 }}>Menu items</h2>
          {items.length === 0 ? (
            <div className="empty">
              <h3>A fresh menu starts here.</h3>
              <p>Add your first verified item using the form.</p>
            </div>
          ) : (
            items.map((item) => (
              <div className="menu-admin-item" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    <small>
                      {item.category} · {money(item.pricePaise)} ·{" "}
                      {item.verified ? "Verified" : "Draft"}
                    </small>
                  </p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditing(item);
                      setVersion((v) => v + 1);
                      setSuccess("");
                    }}
                  >
                    Edit {item.name}
                  </button>
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={item.available}
                    onChange={() => void toggle(item)}
                    aria-label={`Availability of ${item.name}`}
                  />
                  <span>Available</span>
                </label>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}
function Settings() {
  const { catalog } = useStore();
  return (
    <section className="policy narrow">
      <h2>Ordering configuration</h2>
      <p>
        Online ordering:{" "}
        <strong>{catalog.orderingEnabled ? "Enabled" : "Disabled"}</strong>
      </p>
      <p>
        Delivery:{" "}
        <strong>{catalog.deliveryEnabled ? "Enabled" : "Disabled"}</strong>
      </p>
      <p>
        Delivery fee:{" "}
        <strong>
          {catalog.deliveryFee === null
            ? "Not configured"
            : money(catalog.deliveryFee)}
        </strong>
      </p>
      <div className="notice">
        Configuration is managed on the server. Restart the application after
        changing environment settings.
      </div>
      <h2>Before accepting orders</h2>
      <p>
        Verify the restaurant contact details, hours, menu, prices and photos.
        Approve the privacy, terms and cancellation pages. Confirm payment
        collection, delivery coverage and charges with the team.
      </p>
      <p>
        The local build uses persistent SQLite storage. A production deployment
        needs a persistent disk, backups, production staff authentication and a
        reviewed retention policy.
      </p>
    </section>
  );
}
