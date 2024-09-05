import { init } from "./pocketbase";

async function logout() {
    const pb = init(true);
    await pb.authStore.clear();
    window.history.back()
}

logout();
