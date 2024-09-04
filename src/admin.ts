import init from "./settings";
import {success, error, warning} from "./notify";


const pb = init();

const ALLOW_ONLY_REGISTERED_USERS = '@request.auth.id != ""';  // https://pocketbase.io/docs/api-rules-and-filters#examples
const ALLOW_ONLY_ADMINS = null;  // null sets admin only
const ALLOW_EVERYONE = "";  // empty allows everyone, no matter if logged in

async function createOrUpdateCollection(collectionId, schema) {
    try {
        await pb.collections.getOne(collectionId);
        await pb.collections.update(collectionId, schema)
    } catch (err) {
        if (err.status == 404) {
            warning(collectionId +  " not found, creating...")
            await pb.collections.create(schema);
        }
    }
}

async function setupCollections() {
    const requirePINForViewingSlogans = $("#require-login").is(":checked");

    const chaperone = (await pb.collection("users").getFullList()).find(iser => iser.username == "chaperone")

    if (!chaperone) {
        alert("Please create the chaperone user first by setting a PIN code for it below");
        return;
    }
    const ruleAllowOnlyChaperoneAndAdmins = `@request.auth.id = "${chaperone.id}"`


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
    await createOrUpdateCollection("slogans", {
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
        createRule: ruleAllowOnlyChaperoneAndAdmins,
        updateRule: ruleAllowOnlyChaperoneAndAdmins,
        deleteRule: ruleAllowOnlyChaperoneAndAdmins,
    })

    // COLLECTION: ping
    const slogansCollectionId = (await pb.collections.getOne("slogans")).id;
    await createOrUpdateCollection("ping", {
        name: "ping",
        type: "base",
        schema: [
            {
                name: "message",
                type: "text",
                required: false
            },
            {
                name: "currentslogan",
                type: "relation",
                options: {
                    collectionId: slogansCollectionId,
                    maxSelect: 1,
                    cascadeDelete: false
                }
            },
        ],
        listRule: sloganViewOrListPermission,
        viewRule: sloganViewOrListPermission,
        createRule: ALLOW_ONLY_ADMINS,
        updateRule: ruleAllowOnlyChaperoneAndAdmins,
        deleteRule: ALLOW_ONLY_ADMINS,
    })

    // Cleanup any old ping items
    const allItems = await pb.collection("ping").getFullList()
    allItems.forEach(async(item) => await pb.collection("ping").delete(item.id))
    // Create empty ping item
    await pb.collection("ping").create({
        message: "",
        currentslogan: [],
    })
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
