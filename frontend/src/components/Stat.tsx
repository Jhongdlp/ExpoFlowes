interface Props {
  label: string
  value: string | number
  note?: string
}

export function Stat({ label, value, note }: Props) {
  return (
    <div className="px-5 py-4 first:pl-0">
      <p className="label-caps">{label}</p>
      <p className="tnum mt-1 text-2xl leading-none font-medium">{value}</p>
      {note ? <p className="mt-1 text-[12px] text-ink-faint">{note}</p> : null}
    </div>
  )
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-line border-b border-line md:grid-cols-4">
      {children}
    </div>
  )
}
