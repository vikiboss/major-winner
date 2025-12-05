export function Footer() {
  return (
    <footer className="border-border footer mt-auto border-t">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="text-muted flex flex-col items-center justify-center gap-2 text-sm sm:flex-row sm:justify-between">
          <span>Major Winner © {new Date().getFullYear()}</span>
          <span>数据仅供娱乐</span>
        </div>
      </div>
    </footer>
  )
}
