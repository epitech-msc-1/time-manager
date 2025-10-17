// Allow importing SVGs as modules
declare module "*.svg" {
    const src: string;
    export default src;
}

// Explicitly allow the Vite root svg import used in the template
declare module "/vite.svg" {
    const src: string;
    export default src;
}
