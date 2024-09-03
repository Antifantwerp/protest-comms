import PocketBase from "../node_modules/pocketbase";
import config from "../config.json";


let pb: PocketBase;
async function login(e) {
    e.preventDefault();
    
    // @ts-ignore
    username = (typeof username === "string") ? username : (document.getElementById("username") as HTMLInputElement).value;
    // @ts-ignore
    console.log(`Logging into ${config.url} as ${username}...`);
    pb = new PocketBase(config.url);
    const passInput: HTMLInputElement = document.getElementById("password") as HTMLInputElement;
    

    if (passInput.value) {
        
        // @ts-ignore
        const login = !tryAdminLogin ? pb.collection("users") : pb.admins;
        // @ts-ignore
        const data = await login.authWithPassword(username, passInput.value);
        console.log("Logged in!")
        const loginForm = (document.getElementById("loginForm") as HTMLElement);
        loginForm.style.display = "none";

        console.log(pb.collection("slogans").getFullList());
    }
}

window.addEventListener("load", function() {
    document.getElementById("loginForm")?.addEventListener("submit", login);
});

window.addEventListener("unload", function() {
    console.log("Logging out...");
    pb.authStore.clear();
});

function getPocketBase() {
    return pb;
}

export default getPocketBase;
