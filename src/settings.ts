import PocketBase from "pocketbase";
import init from "./pocketbase";
import { reportError } from "./notify";

let pb: PocketBase;

let addingSlogan = false;
let oldSlogansListInner = "";
const signalQuickSelectors = $("#send-signal select");

async function changeCurrentSlogan(e) {
    const selectedRadio = $(e.target)
    const sloganId = selectedRadio.attr("id");
    const ping = (await pb.collection("ping").getList(1, 1)).items[0];
    pb.collection("ping").update(ping.id, {
        currentslogan: sloganId,
    })
}

async function activateSloganChanger() {
    const slogansList = $("#slogans ol")

    if ($("#slogan-changer").is(":checked")) {

        slogansList.children().each((index, elem) => {
            const li = $(elem);
    
            const sloganId = li.attr("id");
            const sloganText = li.text();
    
            const container = $(`<label for="${sloganId}"></label>`);
            const newLi = $(`<li></li>`);
            const radio = $(`<input type="radio" name="currentslogan" id="${sloganId}" />`);
            radio.on("change", changeCurrentSlogan)

            newLi.append(radio);
            newLi.append(`<span>${sloganText}</span>`);
            container.append(newLi);
            li.replaceWith(container);
        })
    } else {
        // TODO: better solution than this. Done because slogans might have changed from oldSlogansListInner
        if (slogansList.html() != oldSlogansListInner) {
            window.location.reload();

        }
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
    $("#slogans ol").html(oldSlogansListInner)
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
        reportError(err);
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

function onClickEditSlogans() {
    const slogansList = $("#slogans ol")
    oldSlogansListInner = slogansList.html();

    slogansList.children().each((index, elem) => {
        const li = $(elem);
        const sloganId = li.attr("id");
        const sloganText = li.text();
        const newLi = $(`<li></li>`)
        const form = $(`<form data-slogan-id="${sloganId}"></form>`)
        form.append(`<input type="text" value="${sloganText}" class="text" />`)
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
        li.replaceWith(newLi);
    })
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