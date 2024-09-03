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
        loggedIn();

        //console.log(pb.collection("slogans").getFullList());

    }
}

function loggedIn() {
    // Remove initial hiding class
    // Hide loading & login
    $("#loading").hide();
    $("#loginForm").hide();        

    // Show slogans for everyone logged in
    $('#slogans').show(400)

    // Show settings to chaperone && admins
    let usr = pb.authStore.model ? pb.authStore.model.username : "";
    if (usr == "chaperone" || pb.authStore.isAdmin) {
        $("#settings").show(400)
    }

    if (pb.authStore.isAdmin) {
        $("#admin-settings").show()
    }
}


console.log(pb.authStore.model)
window.addEventListener("load", function() {
    // Hide everything
    $("main").children().hide();

    $("main").removeClass("loading");
    

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
        loggedIn();
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
