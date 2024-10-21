import {init} from "./pocketbase";
import {success, error, warning, info, reportError} from "./notify";
import { CollectionModel, RecordModel } from "pocketbase";
import languages from "./languages";

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

    try {
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

async function getFullList(collectionName: string, label: string) : Promise<RecordModel[]> {
    try {
        return await pb.collection(collectionName).getFullList();   
    }
    catch (err) {
        reportError("Error while trying to get " + label, err);
        return [];
    }
}

async function reAddValues(collectionName: string, records: RecordModel[], keys: string[], label: string) {
    try {
        if (records.length > 0) {
            records.forEach(async (record) => {
                const obj = {};
                keys.forEach((key) => {
                    obj[key] = record[key];
                });

                await pb.collection(collectionName).update(record.id, obj);
            })
            success("Re-added " + label)
        }
    } catch (err) {
        reportError("Error while trying to re-add" + label, err);
    }
}

async function setupCollections() {
    console.log("aaa")
    console.error("QSIHFSI")

    const requirePINForViewingSlogans = $("#require-login").is(":checked");

    const sloganViewOrListPermission = requirePINForViewingSlogans ? ALLOW_ONLY_REGISTERED_USERS : ALLOW_EVERYONE;

    // Setting up collections resets existing values. Save them here
    let users = await getFullList("users", "existing users")
    let slogans = await getFullList("slogans", "existing slogan values");


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
    reAddValues("users", users, ["is_chaperone"], "is_chaperone values")


        // COLLECTION: slogans

        const schema = languages.map(lang => [
            {
                name: lang.lineOne.dbId,
                type: "text",
                required: lang.lineOne.required
            },
            {
                name: lang.lineTwo.dbId,
                type: "text",
                required: lang.lineTwo.required
            }
            
        ]).flat();
        console.log(schema)
        await createOrUpdateCollection("slogans", {
            name: "slogans",
            type: "base",
            schema: schema,
            listRule: sloganViewOrListPermission,
            viewRule: sloganViewOrListPermission,
            createRule: ALLOW_ONLY_CHAPERONE_AND_ADMINS,
            updateRule: ALLOW_ONLY_CHAPERONE_AND_ADMINS,
            deleteRule: ALLOW_ONLY_CHAPERONE_AND_ADMINS,
        })
    

    // Re-add slogan values
    reAddValues("slogans", slogans, ["text"], "slogan values");

    try {
        // COLLECTION: ping
        const slogansCollectionId = (await pb.collections.getOne("slogans")).id;
        const usersCollectionId = (await pb.collections.getOne("users")).id
        await createOrUpdateCollection("ping", {
            name: "ping",
            type: "base",
            schema: [
                /*{
                    name: "currentslogan",
                    type: "relation",
                    options: {
                        collectionId: slogansCollectionId,
                        maxSelect: 1,
                        cascadeDelete: false
                    }
                },*/
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
            //currentslogan: [],
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
