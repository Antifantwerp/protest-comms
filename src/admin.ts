import init from "./settings";
import {success, error, warning, reportError} from "./notify";
import { CollectionModel, RecordModel } from "pocketbase";


const pb = init();

const ALLOW_ONLY_REGISTERED_USERS = '@request.auth.id != ""';  // https://pocketbase.io/docs/api-rules-and-filters#examples
const ALLOW_ONLY_ADMINS = null;  // null sets admin only
const ALLOW_EVERYONE = "";  // empty allows everyone, no matter if logged in

async function createOrUpdateCollection(collectionId, schema) {
    let data: CollectionModel|null = null;
    let action: string = "";
;    try {
        await pb.collections.getOne(collectionId);  // Will throw to catch if not found
        data = await pb.collections.update(collectionId, schema);
        action = "Updated";
    } catch (err) {
        if (err.status == 404) {
            warning(collectionId +  " not found, creating...")
            data = await pb.collections.create(schema);
            action = "Created";
        }
    }
    if (data) {
        success(`${action} collection ${data.name}! (ID: ${data.id}`)

    }
}

async function setupCollections() {
    const requirePINForViewingSlogans = $("#require-login").is(":checked");

    const chaperone = (await pb.collection("users").getFullList()).find(iser => iser.username == "chaperone")

    if (!chaperone) {
        error("Please create the chaperone user first by setting a PIN code for it below");
        return;
    }
    const sloganViewOrListPermission = requirePINForViewingSlogans ? ALLOW_ONLY_REGISTERED_USERS : ALLOW_EVERYONE;
    const ruleAllowOnlyChaperoneAndAdmins = `@request.auth.id = "${chaperone.id}"`


    try {
        // COLLECTION: users
        const data = await pb.collections.update("users", {
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
        success(`Setup permission for collection ${data.name}! (ID: ${data.id})`)
    } catch (err) {
        reportError("Error while trying to update users collection", err);
    }

    
    try {
        // COLLECTION: slogans
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
    } catch (err) {
        reportError("Error while trying to create/update slogans collection", err);
    }

    try {
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
    } catch (err) {
        reportError("Error while creating/updating ping collection", err);
    }
    
    try {
        // Cleanup any old ping items
        const allItems = await pb.collection("ping").getFullList()
        allItems.forEach(async(item) => await pb.collection("ping").delete(item.id))
        // Create empty ping item
        await pb.collection("ping").create({
            message: "",
            currentslogan: [],
        })
    } catch (err) {
        reportError("Error while cleaning up old pings", err);
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
        let user :RecordModel;
        if (existingUser) {
            user = await pb.collection("users").update(existingUser.id, newUser(), {requestKey: null});
        } else {
            user = await pb.collection("users").create(newUser(), {requestKey: null});
        }
        success(`PIN set for ${user.username}!`);
    } catch (err) {
        reportError("Error while setting pin for " + username, err);
    }
}

function onRequireLoginChange() {
    $("#require-login + label").after("<p>Press Setup collections to save changes!</p>")
    $("#require-login").off("change");
}

$(window).on("load", async function() {
    $("#setup-collections").on("click", setupCollections);
    $(".userForm").on("submit", createUser);
    $("#require-login").on("change", onRequireLoginChange);

    try {
        const slogans = await pb.collections.getOne(pb.collection("slogans").collectionIdOrName);
        console.log(slogans.viewRule)
        if (slogans.viewRule != ALLOW_EVERYONE) {
            $("#require-login").prop("checked", true)
        }
    } catch (err) {
        reportError("Error while trying to get slogans collection", err);
    }
});
