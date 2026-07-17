import { ensureGuestParam } from "./utils/guestSession";
import { App } from "./App";

ensureGuestParam();

export { App };

export default function Client() {
  return <App />;
}
