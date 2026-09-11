"use client";

import { getFlavor, getTopping, getVessel } from "@/lib/catalog";
import {
  PATIENCE_MS,
  describeOrder,
  orderAge,
  orderStage,
  secondsLeft,
  type Order,
} from "@/lib/orders";
import { FlavorArt, ToppingArt, VesselArt } from "@/components/ui/Art";

interface OrderTicketsProps {
  orders: readonly Order[];
  /** The counter's clock, ticking once a second. */
  now: number;
  /** Highlights the parts of a ticket this creation already covers. */
  wantedFlavors: readonly string[];
  wantedVessel: string | null;
  wantedToppings: readonly string[];
}

/** Calm, then hurry-up. The ring around a ticket is the only clock she needs. */
const STAGE_RING = {
  fresh: "border-mint",
  hurry: "border-[#F0932B]",
  gone: "border-cocoa/15",
} as const;

/** One picture in the order, dimmed until it is on the ice cream. */
function Wanted({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <span className={`block w-7 shrink-0 transition-opacity sm:w-9 ${done ? "opacity-100" : "opacity-55"}`}>
      {children}
    </span>
  );
}

/**
 * The customers waiting at the counter, stacked down the left like a rail of
 * paper tickets. Most ask for a flavour and a container; some add a topping,
 * and the occasional show-off wants two.
 */
export function OrderTickets({ orders, now, wantedFlavors, wantedVessel, wantedToppings }: OrderTicketsProps) {
  return (
    <ul className="flex w-fit flex-col gap-1.5 sm:gap-2" aria-label="Orders waiting">
      {orders.map((order, index) => {
        const flavor = getFlavor(order.flavorId);
        const vessel = getVessel(order.vesselId);
        if (!flavor || !vessel) return null;

        const flavorDone = wantedFlavors.includes(order.flavorId);
        const vesselDone = wantedVessel === order.vesselId;
        const toppingsDone = order.toppingIds.every((id) => wantedToppings.includes(id));
        const ready = flavorDone && vesselDone && toppingsDone;
        const stage = orderStage(order, now);
        const left = Math.max(1 - orderAge(order, now) / PATIENCE_MS, 0);

        return (
          <li
            key={order.id}
            aria-label={`Order: ${describeOrder(order)}, ${secondsLeft(order, now)} seconds left${
              ready ? " - ready to serve" : ""
            }`}
            data-ready={ready}
            data-stage={stage}
            className={`animate-pop-in relative flex flex-col gap-1 overflow-hidden rounded-2xl border-2 bg-vanilla/95 px-1.5 pt-1.5 pb-2 shadow-md transition-colors sm:px-2 ${
              ready ? "border-mint bg-mint/25" : STAGE_RING[stage]
            } ${index > 1 ? "hidden sm:flex" : "flex"}`}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            {/* Container first, then flavour, then toppings - the same order
                she works through the steps in. */}
            <span className="flex items-center gap-1">
              <Wanted done={vesselDone}>
                <VesselArt id={vessel.id} />
              </Wanted>
              <Wanted done={flavorDone}>
                <FlavorArt flavor={flavor} />
              </Wanted>
              {order.toppingIds.map((id) => {
                const topping = getTopping(id);
                if (!topping) return null;
                return (
                  <Wanted key={id} done={wantedToppings.includes(id)}>
                    <ToppingArt topping={topping} />
                  </Wanted>
                );
              })}
            </span>

            {/* How much patience is left, as a bar rather than a number. */}
            <span aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-cocoa/10">
              <span
                className={`block h-full rounded-full transition-[width] duration-1000 ease-linear ${
                  stage === "hurry" ? "bg-[#F0932B]" : "bg-mint"
                }`}
                style={{ width: `${left * 100}%` }}
              />
            </span>

            {ready && (
              <span
                aria-hidden="true"
                className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-mint text-cocoa shadow"
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
