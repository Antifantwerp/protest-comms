import PocketBase, { RecordModel } from "pocketbase";
import {success, error, warning, info, init as initNotyf} from "./notify";

let pb: PocketBase;
let lendUsernameGlobal = false;

async function login(username: string, passInput:HTMLElement, tryAdminLogin=false) {
    const login = !tryAdminLogin ? pb.collection("users") : pb.admins;
    try {
        // @ts-ignore
        return {success:true, data: await login.authWithPassword(username, passInput.value)};
    } catch (err) {
        error(err.response.message);
        return {success:false, data: err};
    }
}

async function loginWithPassword(e) {
    e.preventDefault();
    
    const username =  $("#username").val() as string;
    const passInput: HTMLInputElement = document.getElementById("password") as HTMLInputElement;
    const tryAdminLogin = $("#try-admin-login").is(":checked")

    if (passInput.value) {
        let auth: {success:boolean, data:any} = {success: false, data: {}};
        if (!lendUsernameGlobal) {
            auth = await login(username, passInput, tryAdminLogin);        
        } else {
            const chaperones = await pb.collection("users").getFullList();
            let i = 0;
            for (let i = 0; i < chaperones.length; i++) {
                console.log(`Trying ${chaperones[i].username} (id: ${chaperones[i].id})`)
                auth = await login(chaperones[i].username, passInput, tryAdminLogin);
                if (auth.success) {
                    break;
                }
            }
            if (!auth.success) {
                error("Couldn't lend username!");
            }
        }
        
        if (auth.success) {
            success("Logged in!")
            const loginForm = (document.getElementById("loginForm") as HTMLElement);
            loginForm.style.display = "none";
            loggedIn();
        }
        

    }
}

const slogans = $("#slogans ol") // TODO move up
function addSlogan(sloganRecord: RecordModel) {
    slogans.append(`<li id="${sloganRecord.id}">${sloganRecord.text}</li>`)
}

function updateSlogan(sloganRecord: RecordModel) {
    $("#" + sloganRecord.id).text(sloganRecord.text)
}

function deleteSlogan(sloganRecord: RecordModel) {
    $("#" + sloganRecord.id).remove();
}

function subscribeToSloganChange(
    addSloganElement: (sloganRecord: RecordModel) => void=addSlogan,
    updateSloganElement: (sloganRecord: RecordModel) => void=updateSlogan,
    deleteSloganElement: (sloganRecord: RecordModel) => void=deleteSlogan,
) {
    return pb.collection("slogans").subscribe("*", function(data) {
        switch (data.action) {
            case "create":
                addSloganElement(data.record);
                break;
            
            case "update":
                updateSloganElement(data.record);
                break;

            case "delete":
                deleteSloganElement(data.record);
                break;

            default:
                throw new Error("Unimplemented action: " + data.action)
        }
    });
}


async function loggedIn() {
    // Remove initial hiding class
    $("main").removeClass("loading");
    // Hide loading & login
    $("#loading").hide();
    $("#loginForm").hide();     
    $("#logout").show();   


    try {
        (await pb.collection("slogans").getFullList()).forEach(addSlogan);

        subscribeToSloganChange();

        pb.collection("ping").subscribe("*", function(data) {
            if (data.action == "update") {
                const currentSlogan = data.record.currentslogan;
                const message = data.record.message;
                if (currentSlogan) {
                    $(".current-slogan").removeClass("current-slogan");
                    $("#" + currentSlogan).addClass("current-slogan")
                    // TODO: move this code to a better spot?
                    if ($("#editor-current-slogan ol li").length > 0) {
                        window.location.hash = "#current-" + currentSlogan;
                        
                    } else if ($("#editor-change-slogans ol li").length > 0) {
                        // Do nothing
                    } else {
                        window.location.hash = "#" + currentSlogan;

                    }
                }
                if (message) {
                    const msg = message.toLowerCase();
                    if (msg.includes("urgent") || msg.includes("life-threatening") || msg.includes("police")) {
                        error(message)
                    } else if (msg.includes("when possible")) {
                        warning(message)
                    }
                    else if (msg.includes("incoming")) {
                        info(message);
                    }
                    else {
                        console.log("Couldn't determine urgency, send as info");
                        info(message);
                    }
                }
            }
        })
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
    }

    if (pb.authStore.isAdmin) {
        $("#admin-settings").show()
    }
}
function init({justReturnPb=false, tryWithoutAuth=false, lendUsername=false}): PocketBase {
    lendUsernameGlobal = lendUsername;
    // Init notifications
    initNotyf();

    const pocketBaseUrl = process.env.POCKETBASE_URL;
    if (!pocketBaseUrl) {
        alert("No database url could be found. Please report this to the site admin!");
        return pb;
    }
    pb = new PocketBase(pocketBaseUrl);

    if (justReturnPb) {
        return pb;
    }

    $(window).on("load", async function() {        
        // If not logged in
        if (!pb.authStore.isValid) {
            // For index/attendee page, still try without auth
            if (tryWithoutAuth) {
                const data = await pb.collection("slogans").getList(1, 1);  // Return 1
                if (data.totalItems == 0) {
                    warning("No slogans could be loaded. Are you logged in?");
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

export { init, subscribeToSloganChange };
