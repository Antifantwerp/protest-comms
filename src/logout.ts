import { init } from "./pocketbase";

/**
 * Logs you out, that's about it
 */

async function logout() {
    const pb = init({justReturnPb: true});
    await pb.authStore.clear();
    window.history.back()
}

logout();
