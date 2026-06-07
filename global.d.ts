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

// 全局 define 类型声明
declare const BUILD_AT: string
