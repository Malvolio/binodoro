// Local static preview of the same files Alchemy uploads to Cloudflare.
import { resolve, sep } from "node:path";
const directory = resolve(import.meta.dirname, "../packages/web/dist/client");
const portIndex = process.argv.indexOf("--port");
const server = Bun.serve({
  port: portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4173,
  hostname: "0.0.0.0",
  async fetch(request) {
    const url = new URL(request.url);
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response(null, { status: 400 });
    }
    const path = resolve(directory, `.${pathname}`);
    if (path !== directory && !path.startsWith(directory + sep))
      return new Response(null, { status: 404 });
    if (
      pathname !== "/" &&
      (pathname.endsWith("/") || pathname.endsWith(".html"))
    ) {
      const clean =
        pathname.replace(/(?:index)?\.html$/, "").replace(/\/$/, "") || "/";
      const target = resolve(
        directory,
        `.${clean === "/" ? "/index" : clean}.html`,
      );
      if (await Bun.file(target).exists())
        return Response.redirect(new URL(clean + url.search, url), 307);
    }
    for (const candidate of pathname === "/"
      ? [resolve(directory, "index.html")]
      : [path, `${path}.html`]) {
      const file = Bun.file(candidate);
      if ((await file.exists()) && !(await file.stat()).isDirectory())
        return new Response(file);
    }
    return new Response(Bun.file(resolve(directory, "404.html")), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});
console.log(`Static preview: http://localhost:${server.port}`);
