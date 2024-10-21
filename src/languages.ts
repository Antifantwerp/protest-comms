class Language {
    code: string;
    name: string;
    emoji: string;
}

const LANGUAGES : {[key: string]: Language} = {
    "nl": {
        code: "nl",
        name: "Dutch",
        emoji: "🇳🇱"
    },
    "fr": {
        code: "fr",
        name: "French",
        emoji: "🇫🇷"
    },
    "en": {
        code: "en",
        name: "English",
        emoji: "🇬🇧"
    },
}


export default LANGUAGES;