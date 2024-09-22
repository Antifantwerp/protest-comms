import {init} from "./pocketbase";
import {success, error, warning, info, reportError} from "./notify";
import { CollectionModel, RecordModel } from "pocketbase";

/**
 * All admin specific functionality including (but not limited to):
 * - Importing & initialising ./pocketbase.ts
 * - Setting up collections
 * - Creating/deleting/setting passwords for users
 */

const pb = init({});

const ALLOW_ONLY_REGISTERED_USERS = '@request.auth.id != ""';  // https://pocketbase.io/docs/api-rules-and-filters#examples
const ALLOW_IF_SELF = "id = @request.auth.id";
const ALLOW_ONLY_ADMINS = null;  // null sets admin only
const ALLOW_EVERYONE = "";  // empty allows everyone, no matter if logged in
const ALLOW_ONLY_CHAPERONE_AND_ADMINS = `@request.auth.is_chaperone = true`
const ALLOW_IF_IS_CHAPERONE_IS_NOT_SET = "@request.data.is_chaperone:isset = false";
const ALLOW_IF_NOT_ATTENDEE = 'username != "attendee"';
const ALLOW_IF_CHAPERONE_IS_REQUESTER = `@request.auth.id = chaperone`;

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

    const sloganViewOrListPermission = requirePINForViewingSlogans ? ALLOW_ONLY_REGISTERED_USERS : ALLOW_EVERYONE;

    try {
        // COLLECTION: users
        const data = await pb.collections.update("users", {
            schema: [
                {
                    name: "is_chaperone",
                    type: "bool"
                },
            ],
            listRule: `${ALLOW_IF_SELF} || username ~ "chaperone%"`,  // If starts with chaperone
            createRule: ALLOW_ONLY_ADMINS,
            updateRule: `${ALLOW_IF_NOT_ATTENDEE} && ${ALLOW_IF_SELF} && ${ALLOW_IF_IS_CHAPERONE_IS_NOT_SET}`,  // TODO, use id? re-integrate previously removed chaperone id system
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


    // Setting up collections clears slogan values. Save them here
    let slogans: RecordModel[];
    try {
        slogans = await pb.collection("slogans").getFullList();   
    }
    catch (err) {
        slogans = [];
        reportError("Error while trying to get existing slogan values", err);
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
            createRule: ALLOW_ONLY_CHAPERONE_AND_ADMINS,
            updateRule: ALLOW_ONLY_CHAPERONE_AND_ADMINS,
            deleteRule: ALLOW_ONLY_CHAPERONE_AND_ADMINS,
        })
    } catch (err) {
        reportError("Error while trying to create/update slogans collection", err);
    }

    // Re-add slogan values
    try {
        if (slogans.length > 0) {
            slogans.forEach(async (slogan) => {
                await pb.collection("slogans").update(slogan.id, {
                    text: slogan.text
                });
            })
            success("Re-added slogan values")
        }
    } catch (err) {
        reportError("Error while trying to re-add slogan values", err);
    }

    try {
        // COLLECTION: ping
        const slogansCollectionId = (await pb.collections.getOne("slogans")).id;
        const usersCollectionId = (await pb.collections.getOne("users")).id
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
                {
                    name: "chaperone",
                    type: "relation",
                    options: {
                        collectionId: usersCollectionId,
                        maxSelect: 1,
                        cascadeDelete: false
                    }
                },
                {
                    name: "chaperone_nickname",  // Set here to decrease requests for subscriptions
                    type: "text",
                },
            ],
            listRule: sloganViewOrListPermission,
            viewRule: sloganViewOrListPermission,
            createRule: ALLOW_ONLY_CHAPERONE_AND_ADMINS,
            updateRule: ALLOW_IF_CHAPERONE_IS_REQUESTER,
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

async function createUserOnForm(e) {
    e.preventDefault();
    const form = $(e.target);
    const username = form.attr("id");

    function password() {
        return form.children(".password").val() as string;
    }
    function passwordConfirm() {
        return form.children(".passwordConfirm").val() as string;
    }
    if (!username) {
        error("Username is missing when creating user");
        throw Error(e);
    }

    if (username != "chaperone") {
        createUser(username, false, password, passwordConfirm)
    } else {
        // Remove any existing chaperones
        const chaperones = await pb.collection("users").getFullList({filter: "is_chaperone = true"})
        chaperones.forEach(async (user) => {
            await pb.collection("users").delete(user.id);
            info(`Deleted ${user.username} (id: ${user.id})`)
        })        

        const amountRaw = form.children("input[name='chaperone-amount']").val() as string;
        let amount;
        if (!amountRaw) {
            error("Amount of chaperone accounts must be set")
        }
        try {
            amount = parseInt(amountRaw);
        } catch (e) {
            error("Failed to parse chaperone amount. See console.log")
            throw new Error(e);
        }
        for (let i = 0; i < amount; i++) {
            console.log(await createUser(`${username}${i}`, true, password, passwordConfirm));
        }
    }

}

// Keep the passwords outside of variables
async function createUser(username: string, is_chaperone: boolean, password: () => string, passwordConfirm: () => string) {
    function newUser() {
        return {
            username: username,
            is_chaperone: is_chaperone,
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
        return user;
    } catch (err) {
        reportError("Error while setting pin for " + username, err);
    }
}

function onRequireLoginChange() {
    warning("Press Setup collections to save changes!");
}

$(window).on("load", async function() {
    $("#setup-collections").on("click", setupCollections);
    $(".userForm").on("submit", createUserOnForm);
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
