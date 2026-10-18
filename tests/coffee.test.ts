import { expect, it, vi } from "vitest";
import { Effect } from "effect";
import {
  CoffeeInvitation,
  CoffeeInvitationLive,
} from "../packages/web/src/coffee";
it("offers support on exactly the lower third of random draws", () => {
  const random = vi.spyOn(Math, "random");
  const offer = Effect.flatMap(
    CoffeeInvitation,
    (service) => service.offer,
  ).pipe(Effect.provide(CoffeeInvitationLive));
  for (const [value, expected] of [
    [0, true],
    [1 / 3 - Number.EPSILON, true],
    [1 / 3, false],
    [0.9, false],
  ] as const) {
    random.mockReturnValue(value);
    expect(Effect.runSync(offer)).toBe(expected);
  }
  random.mockRestore();
});
