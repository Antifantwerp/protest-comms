import PocketBase, { RecordModel, UnsubscribeFunc } from "pocketbase";
import { init as pocketbaseInit, subscribeToSloganChange } from "./pocketbase";
import { error, reportError } from "./notify";
import languages from "./languages";

/**
 * All chaperone specific functionality, including (but not limited to):
 * - Importing & initialising pocketbase.ts
 * - Changing the chaperones current slogan
 * - Editing/adding/removing slogans
 */

let pb: PocketBase;



let addingSlogan = false;
let editorSubscriptions: UnsubscribeFunc[] = [];
const signalQuickSelectors = $("#send-signal select");

async function changeCurrentSlogan(e) {
    const selectedRadio = $(e.target)
    const sloganId = selectedRadio.attr("id")?.replace("current-", "");
    const ping = await getChaperonePing();
    pb.collection("ping").update(ping.id, {
        currentslogan: sloganId,
    })
}

function _createCurrentSloganEntry(sloganId: string, sloganText: string) {
    const label = $(`<label for="current-${sloganId}"></label>`);
    const newLi = $(`<li></li>`);
    const radio = $(`<input type="radio" name="currentslogan" id="current-${sloganId}" />`);
    const span = $(`<span>${sloganText}</span>`)
    radio.on("change", changeCurrentSlogan);

    newLi.append(radio);
    newLi.append(span);
    label.append(newLi);
    $("#editor-current-slogan ol").append(label);
}

async function activateSloganChanger(activate:boolean) {
    const slogansList = $("#slogans ol")
    const editor = $("#editor-current-slogan");    

    if (activate) {
        editor.show(400);

        slogansList.children().each((index, elem) => {
            const li = $(elem);
    
            const sloganId = li.attr("id");
            const sloganText = li.text();
            if (!sloganId) {
                error("Couldn't find sloganId from list element. See console logs for more details");
                console.log(li);
                return;
            }
            _createCurrentSloganEntry(sloganId, sloganText);
        });

        editorSubscriptions.push(await subscribeToSloganChange(
            // Add
            (record) => {
                _createCurrentSloganEntry(record.id, record.text);
            },
            // Update
            (record) => {
                $("#current-" + record.id + " + label").text(record.text);
            },
            // Delete
            (record) => {
                $("#current-" + record.id).parent().remove();
            }
        ));
        
        editorSubscriptions.push(await pb.collection("ping").subscribe("*", function(data) {
            if (data.action == "update") {
                const currentSlogan = data.record.currentslogan;
                const chaperone = data.record.chaperone;
                if (currentSlogan) {
                    // Removing current-slogan is taken care of by original subscribe
                    $("#current-" + currentSlogan).parent().addClass("current-slogan").addClass(chaperone);
                }
            }
        }))
    } else {
        editorCleanup();
    }
}

async function editSlogan(e) {
    e.preventDefault();

    const form = $(e.target);
    const sloganId = form.data("slogan-id");

    if (!sloganId) {
        console.error("editSlogan could not get sloganId from form")
        return;
    }

    switch (form.data("action")) {
        case "save":
            const newValue = form.children(".text").first().val();
            await pb.collection("slogans").update(sloganId, {
                text: newValue
            })
            break;
        case "delete":
            await pb.collection("slogans").delete(sloganId);
            break;
    }

}

async function getChaperonePing() {
    const model = pb.authStore.model;
    if (!model) {
        const msg = "Auth information could not be loaded. Are you logged in?";
        error(msg)
        throw new Error(msg);
    }
    try {
        return await pb.collection("ping").getFirstListItem(`chaperone = "${model.id}"`)
    }
    catch (err) {
        return await pb.collection("ping").create({chaperone: model.id, chaperone_nickname: model.username});
    }
}

async function onSubmitSendSignal(e) {
    e.preventDefault();

    const form = $(e.target);
    const ping = await getChaperonePing();
    try {
        const data = await pb.collection("ping").update(ping.id, {
            message: form.children("#signal").val()
        })
        setTimeout(async function() {
            await pb.collection("ping").update(ping.id, {
                message: null
            })
        }, 4000)
    } catch (err) {
        reportError("Error while sending signal", err);
    }
}


function onInputSignalQuickSelect() {
    const [urgency, type, location] = signalQuickSelectors.map((i, elem) => $(elem).val());
    $("#signal").val(`${urgency}: ${type} ${location}`)
}

function toggleButton(selector: string) {
    const button = $(selector);
    const unpressing = button.attr("aria-pressed") === "true";
    if (unpressing) {
        button.attr("aria-pressed", "false").removeClass("outline");
        return false;
    } else {
        button.attr("aria-pressed", "true").addClass("outline");
        return true;
    }
}

function onClickSloganChanger() {
    const activate = toggleButton("#slogan-changer");

    activateSloganChanger(activate);
}

function _sloganFormInput(id: string, label: string, placeholder: string, required: boolean=false) {
    const reqLabel = required ? "" : " (optional)";
    const reqInput = required ? 'required="true" ' : "";
    return `
    <label for="${id}" id="${id}-label">${label}${reqLabel}</label>
    <input type="text" id="${id}" name="${id}" placeholder="${placeholder}" ${reqInput}/>
    `
}

function sloganForm(prefix: string) {
    const pre = `${prefix}-slogan`;
    const textForms = languages.map((lang) => {
        let inputs = [lang.lineOne, lang.lineTwo].map(line => 
            _sloganFormInput(`${pre}-${line.id}`, line.label, line.placeholder, line.required)
        )
        return inputs.join("")
    });
    
    return [
        "<article>",
        "<form class='slogan-form'>",
        ].concat(textForms).concat([
            "</form>",
            "</article>"
        ]).join("")
}

function onClickAddSlogan(e) {
    const addSlogan = $(e.target);
    if (!addingSlogan) {
        addSlogan.before(sloganForm("new"))
        addSlogan.val("Save new slogan").addClass("outline");
    } else {
        pb.collection("slogans").create({
            text: $("#new-slogan").val()
        });
        $("#new-slogan").remove();
        $("#new-slogan-label").remove();
        addSlogan.val("Add slogan").removeClass("outline")
    }
    addingSlogan = !addingSlogan;
}

function _createAddSloganForm(sloganId: string, sloganText: string) {
    const newLi = $(`<li></li>`)
    const form = $(`<form data-slogan-id="${sloganId}"></form>`)
    form.append(`<input type="text" value="${sloganText}" id="edit-${sloganId}" class="text" />`)
        .append(`<input type="submit" class="save" value="Save" />`)
        .append(`<input type="submit" class="delete" value="Delete" />`)

    // Based on https://stackoverflow.com/a/6452340
    form.children(".save").on("click", () => {
        form.data("action", "save");
    });
    form.children(".delete").on("click", () => {
        form.data("action", "delete");
    });

    form.on("submit", editSlogan);

    newLi.append(form);

    $("#editor-change-slogans ol").append(newLi);
    $("#editor-change-slogans").show(400);
}

async function onClickEditSlogans() {
    const slogansList = $("#slogans ol");
    toggleButton("#edit-slogans")

    if (editorCleanup()) {
        return;
    }

    slogansList.children().each((index: number, elem: HTMLElement) => {
        const li = $(elem);
        const sloganId = li.attr("id");
        const sloganText = li.text();
        if (!sloganId) {
            error("Couldn't find sloganId from li element. See console logs for more info");
            console.log(li);
            return;
        }
        _createAddSloganForm(sloganId, sloganText);
    });

    editorSubscriptions.push(await subscribeToSloganChange(
        // Add
        (record) => {
            _createAddSloganForm(record.id, record.text);
        },
        // Update
        (record) => {
            $("#edit-" + record.id).val(record.text);
        },
        // Delete
        (record) => {
            $(`form[data-slogan-id="${record.id}"]`).parent().remove();
        }
    ));
}

function editorCleanup() {
    if (editorSubscriptions.length > 0) {
        editorSubscriptions.forEach(async (unsubscribe) => await unsubscribe())
        editorSubscriptions = [];
        $("#editor-change-slogans ol").empty();
        $("#editor-current-slogan ol").empty();
        return true;
    } else {
        return false;
    }
}

function init() : PocketBase {
    pb = pocketbaseInit({lendUsername: true});

    $(window).on("load", () => {
        // Load default values into #signal value
        onInputSignalQuickSelect();

        $("#slogan-changer").on("click", onClickSloganChanger);
        $("#send-signal").on("submit", onSubmitSendSignal);
        signalQuickSelectors.on("input", onInputSignalQuickSelect);
    
        $("#add-slogan").on("click", onClickAddSlogan);
        $("#edit-slogans").on("click", onClickEditSlogans);
    })

    return pb;
}

init();

