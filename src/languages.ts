export class Language {
    code: string;
    name: string;
    emoji: string;

    constructor({
        code,
        name,
        emoji
    }: { 
        code: string, 
        name: string, 
        emoji: string 
    }) {
        this.code = code;
        this.name = name;
        this.emoji = emoji;
    }

    private _getLine(count: string, required: boolean=false) {
        return { 
            id: `line-${count}-${this.code}`,
            dbId: `line_${count}_${this.code}`,
            label: `Slogan text in ${this.name} (line ${count}, ${this.emoji})`,
            placeholder: `${this.emoji} New slogan text (line ${count})...`,
            required: required
        };
    }

    get lineOne() {
        return this._getLine("one", true);
    }
    get lineTwo() {
        return this._getLine("two");
    }

}

const LANGUAGES: { [key: string]: Language } = {
    "nl": new Language({
        code: "nl",
        name: "Dutch",
        emoji: "🇳🇱"
    }),
    "fr": new Language({
        code: "fr",
        name: "French",
        emoji: "🇫🇷"
    }),
    "en": new Language({
        code: "en",
        name: "English",
        emoji: "🇬🇧"
    }),
}


// If no languages are configured, only use English
const languages: Language[] = process.env.LANGUAGES ? process.env.LANGUAGES?.split(",").map(code => LANGUAGES[code]) : [LANGUAGES["en"]];

export default languages;