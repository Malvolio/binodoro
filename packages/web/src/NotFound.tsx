import { Link } from "@tanstack/react-router";
export const NotFound = () => (
  <main className="not-found">
    <h1>Page not found</h1>
    <p>Let's get back to focus.</p>
    <Link to="/">Return to your timer</Link>
  </main>
);
