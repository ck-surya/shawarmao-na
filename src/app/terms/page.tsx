import { Policy } from "@/components/policy";
export default function Page() {
  return (
    <Policy title="Terms & conditions">
      <h2>Placing an order</h2>
      <p>
        Orders are requests until the restaurant confirms them. Current menu
        prices and item availability are checked when the order is submitted.
        The order summary includes any configured delivery charge.
      </p>
      <h2>Pickup and delivery</h2>
      <p>
        Choose from the fulfillment options available at checkout. Delivery,
        when enabled, is managed by the restaurant. Confirm any special
        requirements directly with staff.
      </p>
      <h2>Payment and food requirements</h2>
      <p>
        No online payment is collected by this implementation. Pay at pickup or
        on delivery as arranged with staff. Contact the restaurant before
        ordering if you have allergies or dietary requirements.
      </p>
      <h2>Review before launch</h2>
      <p>
        The restaurant must approve these terms, delivery coverage, payment
        methods and its handling of unavailable items before accepting orders.
      </p>
    </Policy>
  );
}
