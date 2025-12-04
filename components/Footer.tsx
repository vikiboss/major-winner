export function Footer() {
  return (
    <footer className="border-border mt-auto border-t">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="text-muted flex items-center justify-between text-sm">
          <span>Major Winner © {new Date().getFullYear()}</span>
          <span>数据仅供娱乐</span>
        </div>
      </div>
    </footer>
  )
}
