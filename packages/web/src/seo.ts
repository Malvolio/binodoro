export const siteUrl = "https://binodoro.online";
export const homeTitle = "Binodoro — Pomodoro Timer with Binaural Beats";

export const pageSeo = (path: string, title: string, description: string) => ({
  meta: [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Binodoro" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: `${siteUrl}${path}` },
    { property: "og:image", content: `${siteUrl}/images/binodoro-social.png` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: "Binodoro — Pomodoro timer with binaural beats",
    },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: `${siteUrl}/images/binodoro-social.png` },
    {
      name: "twitter:image:alt",
      content: "Binodoro — Pomodoro timer with binaural beats",
    },
  ],
  links: [{ rel: "canonical", href: `${siteUrl}${path}` }],
});
