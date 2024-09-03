import init from "./pocketbase";

const pb = init();

let addingSlogan = false;

$(window).on("load", () => {
    console.log("Loaded settings")

    const addSlogan = $("#add-slogan")

    addSlogan.on("click", (e) => {
        if (!addingSlogan) {
            $("#edit-slogans")
                .prepend(`<label for="new-slogan" id="new-slogan-label" />`)
                .prepend(`<input type="text" id="new-slogan" name="new-slogan" placeholder="New slogan text..." />`)
            addSlogan.val("Save new slogan");
        } else {
            pb.collection("slogans").create({
                text: $("#new-slogan").val()
            });
            $("#new-slogan").remove();
            $("#new-slogan-label").remove();
        }
        addingSlogan = !addingSlogan;
    })
})