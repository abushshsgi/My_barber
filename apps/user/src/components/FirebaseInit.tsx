import { useEffect } from "react";

/** Client-only: initializes Firebase web SDK once on mount. */
export function FirebaseInit() {
  useEffect(() => {
    void import("../lib/firebase").then((m) => m.initFirebase());
  }, []);

  return null;
}
