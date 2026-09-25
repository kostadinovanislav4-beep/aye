/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/** Каталогът на съдържанието, сглобен от content/ (scripts/content-catalog.ts). */
declare module 'virtual:aye/catalog' {
  // В декларация на модул не може да има import с относителен път — остава само import().
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const catalog: import('./domain/content/catalog').Catalog
  export default catalog
}
