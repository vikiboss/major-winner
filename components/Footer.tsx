import Image from 'next/image'

export function Footer() {
  return (
    <footer className="border-border bg-surface-1 mt-auto border-t">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="flex flex-col gap-2 md:flex-row md:justify-between md:gap-2">
          {/* Left Side: Brand & Copyright */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Image src="/icon.png" alt="Logo" width={32} height={32} className="size-8" />
              <span className="text-lg font-bold tracking-tight">Major Winner</span>
            </div>
            <div className="text-muted space-y-2 text-sm leading-relaxed">
              <p>
                CS2 Major 竞猜结果与排行，数据主要整理自 B 站 UP 主
                <a
                  href="https://space.bilibili.com/472947493"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 mx-1 hover:underline"
                >
                  @原劫色
                </a>
                和
                <a
                  href="https://space.bilibili.com/1428295"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 mx-1 hover:underline"
                >
                  @三米七七
                </a>
                等。
                <br className="hidden sm:block" />
                网站将及时更新赛事竞猜数据，助你轻松掌握作业情况。
              </p>
              <p className="text-xs opacity-60">
                © {new Date().getFullYear()} Major Winner, Viki.
                数据仅供娱乐参考，不保证完全准确性。
              </p>
            </div>
          </div>

          {/* Right Side: Community */}
          <div className="flex flex-col gap-4 md:items-end">
            <div className="text-sm font-semibold tracking-wider uppercase">加入交流群</div>
            <div className="flex flex-row items-center gap-4 md:flex-row-reverse">
              {/* QR Code */}
              <div className="bg-surface-0 shrink-0 rounded-lg shadow-sm">
                <Image
                  src="/group-qrcode.png"
                  alt="QQ Group QR"
                  width={80}
                  height={80}
                  className="size-20 rounded-md"
                />
              </div>

              {/* Text Info */}
              <div className="flex flex-col items-start gap-1.5 text-left text-sm md:items-end md:text-right">
                <p className="text-muted font-medium">与其他玩家讨论作业、激情开黑</p>
                <a
                  href="https://qm.qq.com/q/oiHxyHNfl6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline"
                >
                  点此拉起 QQ 一键加群
                </a>
                <span className="text-muted select-all">QQ 群: 902511365（Major Winner）</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
