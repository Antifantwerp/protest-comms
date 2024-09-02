import PocketBase from "../node_modules/pocketbase";
import config from "../config.json";


let pb: PocketBase;
async function login(e) {
    e.preventDefault();
    // @ts-ignore
    console.log(`Logging into ${config.url} as ${username}...`);
    pb = new PocketBase(config.url);
    const passInput: HTMLInputElement = document.getElementById("password") as HTMLInputElement;
    

    if (passInput.value) {
        // @ts-ignore
        const data = await pb.collection("users").authWithPassword(username, passInput.value);
        console.log("Logged in!")
        const loginForm = (document.getElementById("loginForm") as HTMLElement);
        loginForm.style.display = "none";
    }
}

window.addEventListener("load", function() {
    document.getElementById("loginForm")?.addEventListener("submit", login);
});

window.addEventListener("unload", function() {
    console.log("Logging out...");
    pb.authStore.clear();
});
