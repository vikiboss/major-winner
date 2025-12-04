/// <reference types="next" />

// CSS 模块类型声明
declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

// 支持直接导入 CSS 文件(副作用导入)
declare module '*.css' {
  const content: unknown
  export = content
}
