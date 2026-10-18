import alchemy from "alchemy";
import { EmailAddress, EmailRouting, EmailRule } from "alchemy/cloudflare";

const app = await alchemy("binodoro-email");
if (app.stage !== "production") {
  throw new Error(
    "Email routing is production-only. Use bun run deploy:email.",
  );
}

// Keep email provisioning independent of website deployments and previews.
const destination = await EmailAddress("contact-destination", {
  email: "malvoliosf+binodoro@gmail.com",
});

if (destination.verified) {
  await EmailRouting("contact-routing", {
    zone: "binodoro.online",
    enabled: true,
  });
  await EmailRule("contact-forwarding", {
    zone: "binodoro.online",
    name: "Forward info@binodoro.online",
    enabled: true,
    matchers: [{ type: "literal", field: "to", value: "info@binodoro.online" }],
    actions: [{ type: "forward", value: [destination.email] }],
  });
  console.log("Email forwarding configured: info@binodoro.online");
} else {
  console.log(
    "Email forwarding is pending. Confirm Cloudflare's verification email at " +
      destination.email +
      ", then rerun bun run deploy:email.",
  );
}

await app.finalize();
