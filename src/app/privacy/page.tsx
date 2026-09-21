import { Policy } from "@/components/policy";
export default function Page() {
  return (
    <Policy title="Privacy policy">
      <h2>Information used for your order</h2>
      <p>
        Checkout asks for your name, mobile number, order items and optional
        notes. Delivery orders also require an address. Restaurant staff use
        these details to prepare and fulfill your order and contact you about
        it.
      </p>
      <h2>Storage on your device</h2>
      <p>
        Your bag is saved in your browser so it can be restored when you return.
        Staff sign-in uses an essential session cookie. This implementation does
        not include advertising or analytics trackers.
      </p>
      <h2>Your order link</h2>
      <p>
        Your tracking link is private. Anyone you share it with can see the
        items and status, but the public tracking page does not display your
        phone number or address.
      </p>
      <h2>Review before launch</h2>
      <p>
        The restaurant must confirm its retention periods, hosting providers and
        process for privacy requests before accepting orders.
      </p>
    </Policy>
  );
}
