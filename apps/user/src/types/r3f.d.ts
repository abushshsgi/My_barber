import type { ThreeElements } from "@react-three/fiber";

declare module "@react-three/fiber" {
  // Ensure R3F JSX tags are available under React 18 IntrinsicElements.
}

declare global {
  namespace React {
    namespace JSX {
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

export {};
