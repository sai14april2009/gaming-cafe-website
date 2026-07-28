import { Link } from "react-router";

export function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <h1 className="text-3xl font-semibold mb-3">Page not found</h1>
      <p className="text-gray-600 mb-6">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link
        to="/"
        className="inline-block px-5 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
