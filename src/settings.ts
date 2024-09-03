import PocketBase from "pocketbase";
import init from "./pocketbase";

let pb: PocketBase;

let addingSlogan = false;
let oldSlogansListInner = "";


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
            console.log("Setting to " + newValue);
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

function settingsInit() : PocketBase {
    pb = init();

    $(window).on("load", () => {
        console.log("Loaded settings")
    
        const addSlogan = $("#add-slogan")
        const editSlogans = $("#edit-slogans")
    
        addSlogan.on("click", (e) => {
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
        });

        editSlogans.on("click", (e) => {
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

        })
    })

    return pb;
}

export default settingsInit;