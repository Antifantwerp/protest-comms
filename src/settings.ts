import PocketBase, { UnsubscribeFunc } from "pocketbase";
import { init, subscribeToSloganChange } from "./pocketbase";
import { error, reportError } from "./notify";

let pb: PocketBase;

let addingSlogan = false;
let oldSlogansListInner = "";
let editorSubscriptions: UnsubscribeFunc[] = [];
const signalQuickSelectors = $("#send-signal select");

async function changeCurrentSlogan(e) {
    const selectedRadio = $(e.target)
    const sloganId = selectedRadio.attr("id")?.replace("current-", "");
    const ping = (await pb.collection("ping").getList(1, 1)).items[0];
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

async function activateSloganChanger() {
    const slogansList = $("#slogans ol")
    const editor = $("#editor-current-slogan");
    

    if ($("#slogan-changer").is(":checked")) {
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
                if (currentSlogan) {
                    // Removing current-slogan is taken care of by original subscribe
                    $("#current-" + currentSlogan).parent().addClass("current-slogan")
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

async function onSubmitSendSignal(e) {
    e.preventDefault();

    const form = $(e.target);
    const ping = (await pb.collection("ping").getList(1, 1)).items[0];
    console.log(ping)
    try {
        const data = await pb.collection("ping").update(ping.id, {
            message: form.children("#signal").val()
        })
        console.log(data)
    }
    catch (err) {
        reportError("Error while sending signal", err);
    }
    
}


function onInputSignalQuickSelect() {
    const [urgency, type, location] = signalQuickSelectors.map((i, elem) => $(elem).val());
    $("#signal").val(`${urgency}: ${type} ${location}`)
}

function onChangeSloganChanger() {
    // Save old slogan state
    if (oldSlogansListInner == "") {
        oldSlogansListInner = $("#slogans ol").html();
    }
    activateSloganChanger();
}

function onClickAddSlogan(e) {
    const addSlogan = $(e.target);
    if (!addingSlogan) {
        addSlogan.before(`<label for="new-slogan" id="new-slogan-label" />`)
                 .before(`<input type="text" id="new-slogan" name="new-slogan" placeholder="New slogan text..." />`)
        addSlogan.val("Save new slogan");
    } else {
        pb.collection("slogans").create({
            text: $("#new-slogan").val()
        });
        $("#new-slogan").remove();
        $("#new-slogan-label").remove();
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
        $("#editor-change-slogans").hide(400);
        $("#editor-current-slogan").hide(400);
        return true;
    } else {
        return false;
    }
}

function settingsInit() : PocketBase {
    pb = init();

    $(window).on("load", () => {
        // Load default values into #signal value
        onInputSignalQuickSelect();

        $("#slogan-changer").on("change", onChangeSloganChanger);
        $("#send-signal").on("submit", onSubmitSendSignal);
        signalQuickSelectors.on("input", onInputSignalQuickSelect);
    
        $("#add-slogan").on("click", onClickAddSlogan);
        $("#edit-slogans").on("click", onClickEditSlogans);
    })

    return pb;
}

export default settingsInit;