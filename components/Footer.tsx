import Image from 'next/image'

export function Footer() {
  return (
    <footer className="border-border bg-surface-1 mt-auto border-t">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between md:gap-12">
          {/* Left Side: Brand & Copyright */}
          <div className="flex flex-col gap-4 md:max-w-sm">
            <div className="flex items-center gap-3">
              <Image src="/icon.png" alt="Logo" width={32} height={32} className="size-8" />
              <span className="text-lg font-bold tracking-tight">Major Winner</span>
            </div>
            <div className="text-muted space-y-2 text-sm leading-relaxed">
              <p>
                CS2 Major 竞猜结果展示与排行榜。
                <br className="hidden sm:block" />
                及时更新赛事竞猜数据，助你轻松掌握作业情况。
              </p>
              <p className="text-xs opacity-60">
                © {new Date().getFullYear()} Major Winner. 数据仅供娱乐。
              </p>
            </div>
          </div>

          {/* Right Side: Community */}
          <div className="flex flex-col gap-4 md:items-end">
            <div className="text-sm font-semibold tracking-wider uppercase">加入社区</div>
            <div className="flex flex-row items-center gap-4 md:flex-row-reverse">
              {/* QR Code */}
              <div className="bg-surface-0 shrink-0 rounded-lg p-1 shadow-sm">
                <Image
                  src="/group-qrcode.png"
                  alt="QQ Group QR"
                  width={80}
                  height={80}
                  className="size-20 rounded-md"
                />
              </div>

              {/* Text Info */}
              <div className="flex flex-col gap-1.5 md:items-end md:text-right">
                <p className="text-muted text-sm font-medium">与其他玩家讨论作业</p>
                <a
                  href="https://qm.qq.com/q/oiHxyHNfl6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-300 inline-flex items-center gap-1.5 text-sm transition-colors"
                >
                  <span>点此一键加群</span>
                </a>
                <span className="text-muted text-xs select-all">群号: 902511365</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
