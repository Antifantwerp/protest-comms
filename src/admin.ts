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

$(window).on("load", function() {
    $("#setup-collections").on("click", setupCollections);

});
