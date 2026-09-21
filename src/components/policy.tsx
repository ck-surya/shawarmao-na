import { restaurant } from "@/lib/domain";
export function Policy({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="page narrow policy">
      <span className="eyebrow">SHAWARMAO NA</span>
      <h1>{title}</h1>
      <div className="notice">
        Draft for restaurant review. Online ordering remains disabled until
        these policies are approved.
      </div>
      {children}
      <h2>Contact</h2>
      <p>
        For questions, call{" "}
        <a href={`tel:${restaurant.phone}`}>{restaurant.displayPhone}</a>.{" "}
        {restaurant.address}. Contact details are awaiting owner confirmation.
      </p>
    </article>
  );
}
