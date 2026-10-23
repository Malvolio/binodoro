import { createFileRoute, Link } from "@tanstack/react-router";
import { AboutContent } from "../AboutContent";
import { pageSeo } from "../seo";
export const Route = createFileRoute("/about")({
  head: () =>
    pageSeo(
      "/about",
      "About Binodoro — Pomodoro Technique & Binaural Beats",
      "Learn how to use Binodoro's Pomodoro timer and binaural beats generator, customize focus sounds, and understand the research and limits of binaural listening.",
    ),
  component: About,
});
function About() {
  return (
    <div className="about-page-shell">
      <main className="about-page">
        <nav aria-label="About navigation">
          <Link to="/">← Back to timer</Link>
        </nav>
        <article>
          <h1>About Binodoro</h1>
          <p className="about-lead">
            A Pomodoro timer with binaural beats, made for a steady rhythm of
            focus and rest.
          </p>
          <AboutContent headingLevel={2} />
          <p>
            <Link className="edit-presets-button" to="/controls">
              Explore sound controls
            </Link>
          </p>
        </article>
      </main>
    </div>
  );
}
