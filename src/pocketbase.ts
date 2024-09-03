import PocketBase from "pocketbase";
import config from "../config.json";

let pb: PocketBase;


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

        //console.log();

    }
}

const slogans = $("#slogans ol") // TODO move up
function addSlogan(sloganRecord) {
    slogans.append(`<li id="${sloganRecord.id}">${sloganRecord.text}</li>`)
}

function updateSlogan(sloganRecord) {
    $("#" + sloganRecord.id).text(sloganRecord.text)
}

function deleteSlogan(sloganRecord) {
    $("#" + sloganRecord.id).remove();
}

async function loggedIn() {
    // Remove initial hiding class
    // Hide loading & login
    $("#loading").hide();
    $("#loginForm").hide();        


    try {
        (await pb.collection("slogans").getFullList()).forEach(addSlogan);


        pb.collection("slogans").subscribe("*", function(data) {
            switch (data.action) {
                case "create":
                    addSlogan(data.record);
                    break;
                
                case "update":
                    updateSlogan(data.record);
                    break;

                case "delete":
                    deleteSlogan(data.record);
                    break;

                default:
                    throw new Error("Unimplemented action: " + data.action)
            }
        });
    } catch (err) {
        console.error("Error while retrieving slogans" + (pb.authStore.isAdmin ? `. Please go to ${window.location.origin}/maintainer.html, use the setup collections button` : ""))
        console.error(err);
    }
    

    // Show slogans for everyone logged in
    $('#slogans').show(400)

    // Show settings to chaperone && admins
    let usr = pb.authStore.model ? pb.authStore.model.username : "";
    if (usr == "chaperone" || pb.authStore.isAdmin) {
        $("#send-signal").show(400)
        $("#settings").show(400)
    }

    if (pb.authStore.isAdmin) {
        $("#admin-settings").show()
    }
}

function init(logout=false, tryWithoutAuth=false): PocketBase {
    pb = new PocketBase(config.url);

    if (logout) {
        pb.authStore.clear();
        window.history.back()
        return pb;
    }

    $(window).on("load", async function() {
        // Hide everything
        $("main").children().hide();
    
        $("main").removeClass("loading");
        
        // If not logged in
        if (!pb.authStore.isValid) {
            // For index/attendee page, still try without auth
            if (tryWithoutAuth) {
                const data = await pb.collection("slogans").getList(1, 1);  // Return 1
                if (data.totalItems == 0) {
                    console.log("No slogans found, assuming you need to log in")
                } else {
                    // TODO: cleaner solution
                    loggedIn();
                    return pb;
                }
            }

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
    
    return pb;
}

export default init;
