/** Web stub — expo-media-library faqat iOS/Android da mavjud. */
export async function requestPermissionsAsync() {
  return { granted: false, status: "denied", expires: "never", canAskAgain: false };
}

export async function saveToLibraryAsync() {
  throw new Error("expo-media-library is not available on web");
}

export async function getPermissionsAsync() {
  return { granted: false, status: "denied", expires: "never", canAskAgain: false };
}
