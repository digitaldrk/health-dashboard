import { NavLink, Outlet } from "react-router-dom"
import { useState } from "react"

const links = [
  { to: "/", label: "Desk", end: true },
  { to: "/patients", label: "Patients", end: false },
]

export function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[250px_1fr]">
      <aside
        className={`flex-col bg-pine-deep text-foam ${
          open
            ? "fixed inset-y-0 left-0 z-30 flex w-64 md:static md:w-auto"
            : "hidden md:flex md:static md:w-auto"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-pine font-serif text-sm">JB</span>
          <span>
            <span className="block font-serif text-xl leading-none">JB Medical</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-3" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium ${isActive ? "bg-white/15" : "hover:bg-white/10"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-5 py-6 text-xs leading-5 text-foam/60">
          Fictional charts for the staff desk.
        </p>
      </aside>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-ink/40 md:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="min-w-0">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-8">
          <button
            type="button"
            className="rounded-full border border-line bg-foam px-3 py-1.5 text-sm md:hidden"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
          <p className="text-sm text-mist">Patient desk</p>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
