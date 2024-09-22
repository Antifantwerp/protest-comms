import { init } from "./pocketbase";

/**
 * Script imported on the index page (e.g. for attendees)
 */

const pb = init({justReturnPb:false, tryWithoutAuth:true});
