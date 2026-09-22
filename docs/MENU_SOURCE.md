# Supplied menu transcription

Source: the Google Maps photo supplied by the user, photo ID `CIABIhAWqWx69uuGPTLoKXVMUfF3`, for Shawarmao Na, Sector 51. The exact reference image is preserved in [references/menu-google-maps.jpg](references/menu-google-maps.jpg). The photo date is not established; the menu was supplied in this development session on 22 September 2026.

The 18 printed rows produce 23 catalog entries: five momo rows each have a chicken price followed by a veg price under the explicit `CHICKEN//VEG` heading. Names are changed only from uppercase to title case and by appending the momo variant. No ingredients, serving counts, item photos, or promotional claims are inferred. Dietary labels are included only where the menu explicitly says Chicken or Veg. Other items remain unspecified.

| Signature Lebanese | Price (₹) |
| ------------------ | --------: |
| Chicken Shawarma   |       190 |
| Paneer Shawarma    |       180 |
| Falafel Shawarma   |       160 |
| Hummus - Pita      |       160 |
| Hummus - Falafel   |       160 |
| Chicken Platter    |       260 |
| Paneer Platter     |       250 |
| Doner Chicken Bowl |       220 |

| Momos for the Soul | Chicken (₹) | Veg (₹) |
| ------------------ | ----------: | ------: |
| Steam Momos        |         150 |     120 |
| Fried Momos        |         160 |     130 |
| Peri Peri Momos    |         170 |     140 |
| Kurkure Momos      |         200 |     180 |
| Wheat Steam Momos  |         160 |     130 |

| Indulgences      | Price (₹) |
| ---------------- | --------: |
| French Fries     |       120 |
| Peri Peri Fries  |       140 |
| Veg Spring Rolls |       160 |
| Choco Lava Cake  |       100 |
| Walnut Brownie   |       100 |

The photo explicitly says **5% GST extra**. Catalog prices therefore exclude this charge. The implementation applies 5% to the food subtotal and rounds once to the nearest paise. The photo does not specify delivery charges or their tax treatment; delivery remains disabled until those are configured and confirmed.

Run `npm run menu:import` to add the supplied menu to the selected local database. The import validates all rows, uses stable IDs, and never overwrites existing staff edits. Listed items are initially enabled in the catalog, with verification based on the menu supplied by the user. This is not independent confirmation of current stock, owner approval, or current Google listing data. Ordering remains disabled by default; staff must confirm stock and current prices before launch.
