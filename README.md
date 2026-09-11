<div align="center">

<img src="docs/icon-512.png" alt="Mila's Ice Cream Shop" width="128">

# Mila's Ice Cream Shop

**A pretend-play ice cream shop in 3D, built for a two-and-a-half-year-old.**

Pick a swirl or scoops, choose from 30 flavours, pick a cone, a cup or a six-well egg carton,
pile on the toppings, then hit the big pink **Serve!** button for a confetti ta-da.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Three.js](https://img.shields.io/badge/Three.js-r186-000000?logo=threedotjs&logoColor=white)](https://threejs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-FFD25E.svg)](LICENSE)

<img src="docs/screenshots/hero-desktop.png" alt="Three scoops on a waffle cone with hot fudge, sprinkles, whipped cream and a cherry" width="900">

</div>

---

## What it is

A 3 to 5 minute pretend-play loop for a toddler: take the order, make the ice cream, serve it.
Every choice changes a real 3D model on screen, so the ice cream she is building is the ice cream
she sees. There is no reading required - every button is a picture.

| | |
|---|---|
| **2 styles** | Soft swirl (one braided ribbon per flavour, up to 5) and hand-dug scoops |
| **30 flavours** | Vanilla, chocolate, strawberry, mint chip, cookies and cream, cookie dough, caramel, bubblegum, birthday cake, rocky road, pistachio, mango, blueberry, peanut butter, neapolitan, purple cow, raisin, coconut, banana, pina colada, orange, pineapple, peach, coffee, watermelon, lime, lemon, raspberry, cotton candy, cherry |
| **9 containers** | Cup, waffle cone, cake cone, sundae glass, float, waffle bowl, paper boat, pink egg carton (6 wells, scoops only), frosty cup |
| **14 toppings** | Sprinkles, Oreo crumbles, cookie pieces, gummy bears, fruit, chocolate chips, peanuts, hot fudge, caramel, whipped cream, marshmallows, cherry |
| **Orders and coins** | Customers arrive one a minute with a picture ticket - container, flavour, sometimes a topping. Fill one fast and the tip is bigger |
| **The ta-da** | Confetti, a sparkle burst, a glow, a fanfare and a coin ka-ching when the order is served |

<div align="center">
<img src="docs/screenshots/served-desktop.png" alt="The serve celebration with confetti and sparkles" width="440">
<img src="docs/screenshots/phone.png" alt="The shop on a phone, showing a cotton candy twist" width="200">
</div>

## Taking orders

One customer is waiting when the shop opens, on a rail down the left of the counter, and a new one walks
in only once a minute. A busy counter is stressful, so the rail holds three at the very most and in
practice settles at two.

A ticket is just pictures, in the same order she works through the steps: the container, the flavour,
and sometimes a topping. Most tickets ask for two things, some for three, and the occasional show-off
wants four. Any container can be ordered, including the float and the six-well egg carton.

Each picture brightens as that part lands on the ice cream. When the whole ticket is covered it turns
green with a check, and the Serve button shows what it is worth. Serving pays into the till and the
customer leaves - the counter gets calmer, not instantly busy again. After the confetti the shop clears
itself and lands back on the first question, so there is no button to find before playing again.

Each customer waits two minutes, shown as a bar under their ticket and as the colour of its ring:

| Waiting | Ring | What happens |
|---|---|---|
| Under a minute | Mint | Plenty of time |
| One to two minutes | Orange | Hurry up |
| Past two minutes | - | The customer gives up and leaves |

| Serve | Pays |
|---|---|
| Right container | 2 coins |
| Right flavour | 2 coins |
| Each topping the ticket asked for | 1 coin each |
| Serving at all | 1 coin |
| The whole ticket, filled fast | + up to 3 coins of tip |

**The tip is for speed:** 3 coins under 20 seconds, 2 under 40, 1 under a minute, none after that. So a
perfect order served quickly is 8 coins and the same order served slowly is 5.

Two rules keep it kind. **A customer leaving costs nothing** - there is no penalty, only a missed tip.
And **a serve that matches no ticket still pays a coin**, so making something just because you felt like
it is never punished. The clock also pauses whenever the tab is hidden, so putting the iPad down does not
empty the shop.

## Built for little hands

- **Pictures, not words.** Every choice is a hand-drawn SVG of the real thing.
- **Big targets.** The choice buttons are 88px tall and every control clears 44px, down to a 320px screen.
- **No dead ends.** Picking a 7th topping drops the oldest one instead of disabling the button, and a step
  is only offered once the answers it needs are in.
- **Double taps do not punish.** A toddler taps twice while the screen is still moving, so a tap that lands
  within 300ms of a change is ignored - and the serve holds that guard for 1.2s so the ta-da cannot be
  tapped away.
- **No way to break it.** No menus, no settings, no external links, no in-app purchases, no network calls.
- **Sound that can be turned off.** All audio is synthesised in the browser and the mute state is remembered.
- **Accessible.** Real button semantics, `aria-pressed` state, visible focus rings, focus moved to each new
  question as it appears, a spoken description of the dessert on the canvas, and `prefers-reduced-motion`
  honoured in the CSS, the confetti and the 3D scene (no spin, no sparkle burst, no light flash).

## Quick start

```bash
git clone https://github.com/bunlongheng/ice-creams.git
cd ice-creams
npm install
npm run dev
```

Open <http://localhost:3047>.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3047 |
| `npm run build` | Production build |
| `npm start` | Serve the production build on port 3047 |
| `npm run lint` | ESLint (`next/core-web-vitals` + TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests for the order logic and the 3D helpers |

## Environment variables

**None are required.** The app has no backend, no database, no API keys and makes no network requests
at runtime. `.env.example` documents the single optional value:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | No | Vercel's production domain, else unset | Absolute base for the canonical and Open Graph URLs. On Vercel it falls back to `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`, so set it only for a custom domain or a self-hosted deploy. |

Real values never belong in the repository - copy `.env.example` to `.env.local`, which is gitignored.

## Project layout

```
src/
  app/
    layout.tsx          Fonts, metadata, viewport
    page.tsx            Renders the shop
    globals.css         Design tokens, the sticker button, the awning, keyframes
    icon.png            App icon (favicon)
    apple-icon.png      Home-screen icon
  components/
    Shop.tsx            The one stateful component: order state, steps, sounds
    scene/
      IceCreamCanvas.tsx  React <-> Three.js bridge (client only, dynamically imported)
    ui/
      Art.tsx           Hand-drawn SVG art for every choice
      ChoiceGrid.tsx    The picture-button grid used by all four steps
      StepBar.tsx       Step progress and back-navigation
      Celebration.tsx   Confetti overlay for the serve moment
      OrderTickets.tsx  The customers waiting at the counter
      CoinCounter.tsx   The till, counting up
  lib/
    catalog.ts          Styles, flavours, vessels, toppings - the single source of truth
    creation.ts         Pure reducer for one order (+ unit tests)
    orders.ts           The order queue, matching and the till (+ unit tests)
    sound.ts            Web Audio synthesis, no audio files
    random.ts           Seeded RNG and value noise (+ unit tests)
  scene/
    IceCreamScene.ts    Owns the WebGL canvas, lights, camera and render loop
    iceCream.ts         Soft-serve swirls and hand-dug scoops
    vessels.ts          Cones, cups, glasses and bowls
    toppings.ts         Sauces, cream, scattered bits, the cherry
    geometry.ts         Swept tubes, lathes, scoop noise, sauce drips
    materials.ts        Shared, cached material recipes (+ unit tests)
    scatter.ts          Instanced scattering of bits over a surface
    textures.ts         Canvas-drawn textures - no image assets
    sparkles.ts         The celebration particle burst
docs/
  icon-512.png          App icon
  screenshots/          README images
```

## How the 3D works

Everything on screen is generated from maths at runtime - there are no downloaded models,
no textures and no HDR maps, which keeps the payload small and the shop instantly re-skinnable.

- **Soft serve** is a circle swept along a tapering helix, with the tube radius shrinking as it rises.
  A twist is two of those coils, half a turn out of phase.
- **Scoops** are spheres displaced by 3D value noise, with a flattened underside where they sat in the tub.
- **Sauce** is a cap that follows the same noise function as the scoop under it, then runs down the side
  in uneven tongues, so hot fudge hugs the lumps instead of floating above them.
- **Toppings** are instanced meshes scattered onto anchor points sampled from the dessert's surface.
- **Gloss** comes from a physically based material with a clear coat, lit by a procedural room
  environment for real reflections.
- **Nothing is random.** A seeded RNG means the same order always rebuilds the same dessert.

React never re-renders per frame: `IceCreamScene` owns its own `requestAnimationFrame` loop, pauses when the
tab is hidden and clamps the pixel ratio to 2. Geometry is rebuilt and disposed on every change, but materials
are **cached and shared** - disposing a material throws away its compiled shader program, so a fresh one per
tap would recompile half a dozen shaders in the next frame. The scene also only rebuilds when the dessert
itself changed: stepping backwards and forwards touches nothing.

## Deploying

The repo is Vercel-ready (`vercel.json` pins the framework, install and build commands):

```bash
npm i -g vercel
vercel link
vercel --prod
```

No environment variables need to be set for a working deployment. Security headers - CSP, HSTS,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` - are applied to
every response from `next.config.ts`.

Any host that can run `npm run build && npm start` works too; the app is a standard Next.js App Router build.

## Contributing

Adding a flavour or a topping is a one-line change in `src/lib/catalog.ts` - the buttons, the 3D model
and the tests all read from that table. Please run `npm run lint`, `npm run typecheck` and `npm test`
before opening a pull request.

## License

[MIT](LICENSE) - Bunlong Heng
