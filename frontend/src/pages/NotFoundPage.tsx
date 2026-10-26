import { Link } from "react-router-dom"

import { usePageTitle } from "../lib/usePageTitle"

export function NotFoundPage() {
  usePageTitle("Not found")

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-mist">404</p>
      <h1 className="mt-2 font-serif text-4xl">This page is not on the chart</h1>
      <p className="mt-3 text-sm leading-6 text-mist">
        The address does not match a desk view or a patient in the panel.
      </p>
      <Link to="/" className="mt-6 inline-flex rounded-full bg-pine px-4 py-2 text-sm font-medium text-white">
        Back to the desk
      </Link>
    </div>
  )
}
