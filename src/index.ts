import PocketBase from "../node_modules/pocketbase";
import config from "../config.json";


const pb = new PocketBase(config.url);

const main = $("main");

async function loginWithPassword(e) {
    e.preventDefault();
    
    // @ts-ignore
    username = (typeof username === "string") ? username : (document.getElementById("username") as HTMLInputElement).value;
    // @ts-ignore
    console.log(`Logging into ${config.url} as ${username}...`);
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
    // If not logged in
    if (!pb.authStore.isValid) {
        // Remove initial hiding class
        $("main").removeClass("loading");
        // Hide all shown elements
        $("main > *").hide();
        // Enable & show login
        $("#loginForm").on("submit", loginWithPassword).show();
    }
    // If logged in
    else {
        // Remove initla hiding class
        $("main").removeClass("loading");
        if (pb.authStore.isAdmin) {
            $("")
        }
        console.log(pb.authStore.model)
        $("#loading").hide();
        $("#loginForm").hide();
        $('#main > *:not("#loading, #loginForm")').show()
    }
    
});

window.addEventListener("unload", function() {
    /*console.log("Logging out...");
    pb.authStore.clear();*/
});

function getPocketBase() {
    return pb;
}

export default getPocketBase;
