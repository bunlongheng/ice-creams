"use client";

import { getFlavor, getVessel } from "@/lib/catalog";
import { describeOrder, type Order } from "@/lib/orders";
import { FlavorArt, VesselArt } from "@/components/ui/Art";

interface OrderTicketsProps {
  orders: readonly Order[];
  /** Highlights the tickets this creation would currently fill. */
  wantedFlavors: readonly string[];
  wantedVessel: string | null;
}

/**
 * The customers waiting at the counter. Only the first two show on a phone -
 * three tickets and a speech bubble will not share 390 pixels. Each ticket is two pictures - a flavour
 * and a container - because that is the whole order. No timers, no pressure:
 * a ticket sits there until she feels like making it.
 */
export function OrderTickets({ orders, wantedFlavors, wantedVessel }: OrderTicketsProps) {
  return (
    <ul className="flex shrink-0 items-start gap-1.5 sm:gap-2.5" aria-label="Orders waiting">
      {orders.map((order, index) => {
        const flavor = getFlavor(order.flavorId);
        const vessel = getVessel(order.vesselId);
        if (!flavor || !vessel) return null;

        const flavorDone = wantedFlavors.includes(order.flavorId);
        const vesselDone = wantedVessel === order.vesselId;
        const ready = flavorDone && vesselDone;

        return (
          <li
            key={order.id}
            aria-label={`Order: ${describeOrder(order)}${ready ? " - ready to serve" : ""}`}
            data-ready={ready}
            className={`animate-pop-in relative flex items-center gap-0.5 rounded-2xl border-2 bg-vanilla/95 px-1 py-1 shadow-md transition-colors sm:gap-1.5 sm:px-2 sm:py-1.5 ${
              ready ? "border-mint bg-mint/25" : "border-cocoa/15"
            } ${index > 1 ? "hidden sm:flex" : "flex"}`}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <span className={`block w-7 sm:w-10 ${flavorDone ? "" : "opacity-90"}`}>
              <FlavorArt flavor={flavor} />
            </span>
            <span className="text-[10px] font-black text-cocoa/40 sm:text-xs" aria-hidden="true">
              +
            </span>
            <span className={`block w-7 sm:w-10 ${vesselDone ? "" : "opacity-90"}`}>
              <VesselArt id={vessel.id} />
            </span>
            {ready && (
              <span
                aria-hidden="true"
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-mint text-cocoa shadow"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M4 12.5l5 5L20 6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
