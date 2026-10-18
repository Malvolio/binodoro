import { Context, Effect, Layer } from "effect";
export class CoffeeInvitation extends Context.Tag("CoffeeInvitation")<
  CoffeeInvitation,
  { offer: Effect.Effect<boolean> }
>() {}
export const CoffeeInvitationLive = Layer.succeed(CoffeeInvitation, {
  offer: Effect.sync(() => Math.random() < 1 / 3),
});
