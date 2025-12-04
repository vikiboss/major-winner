export function Footer() {
  return (
    <footer className="border-border mt-auto border-t footer">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="text-muted flex flex-col sm:flex-row items-center justify-center sm:justify-between text-sm gap-2">
          <span>Major Winner © {new Date().getFullYear()}</span>
          <span>数据仅供娱乐</span>
        </div>
      </div>
    </footer>
  )
}
