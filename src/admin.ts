import init from "./settings";

const pb = init();

const ALLOW_ONLY_REGISTERED_USERS = '@request.auth.id != ""';  // https://pocketbase.io/docs/api-rules-and-filters#examples
const ALLOW_ONLY_ADMINS = null;  // null sets admin only
const ALLOW_EVERYONE = "";  // empty allows everyone, no matter if logged in


async function setupCollections() {
    const requirePINForViewingSlogans = $("#require-login").is(":checked");

    console.log(requirePINForViewingSlogans)

    // COLLECTION: users
    await pb.collections.update("users", {
        schema: [],
        createRule: ALLOW_ONLY_ADMINS,
        updateRule: ALLOW_ONLY_ADMINS,
        deleteRule: ALLOW_ONLY_ADMINS,
        options: {
            allowOAuth2Auth: false,
            allowEmailAuth: false,  // Only affects users, not admins
            requireEmail: false,
            minPasswordLength: 5
        }
    });
    
    
    // COLLECTION: slogans
    const sloganViewOrListPermission = requirePINForViewingSlogans ? ALLOW_ONLY_REGISTERED_USERS : ALLOW_EVERYONE;
    const slogansSchema = {
        name: "slogans",
        type: "base",
        schema: [
            {
                name: "text",
                type: "text",
                required: true
            }
        ],
        listRule: sloganViewOrListPermission,
        viewRule: sloganViewOrListPermission,
        createRule: ALLOW_ONLY_ADMINS,
        updateRule: ALLOW_ONLY_ADMINS,
        deleteRule: ALLOW_ONLY_ADMINS,
    }
    try {
        await pb.collections.getOne("slogans");
        await pb.collections.update("slogans", slogansSchema)
    } catch (err) {
        if (err.status == 404) {
            console.log("slogans not found, creating...")
            await pb.collections.create(slogansSchema);
        }
    }
}



async function createUser(e) {
    e.preventDefault();

    const form = $(e.target);
    const username = form.attr("id");
    function password() {
        return form.children(".password").val();
    }
    function passwordConfirm() {
        return form.children(".passwordConfirm").val();
    }
    function newUser() {
        return {
            username: username,
            password: password(),
            passwordConfirm: passwordConfirm()
        };
    }

    const users = await pb.collection("users").getFullList();
    const existingUser = users.find(user => user.username == username);

    
    try {
        if (existingUser) {
            await pb.collection("users").update(existingUser.id, newUser(), {requestKey: null});
            
        } else {
            await pb.collection("users").create(newUser(), {requestKey: null});
        }
    } catch (err) {
        alert(err + " Please check your console for the request response.");
    }
}

$(window).on("load", function() {
    $("#setup-collections").on("click", setupCollections);
    $(".userForm").on("submit", createUser);
});
