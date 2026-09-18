import { useEffect } from "react";

import { initFirebase } from "../lib/firebase";

/** Client-only: initializes Firebase web SDK once on mount. */
export function FirebaseInit() {
  useEffect(() => {
    initFirebase();
  }, []);

  return null;
}
