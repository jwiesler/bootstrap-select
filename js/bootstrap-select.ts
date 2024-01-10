import Dropdown from "bootstrap/js/dist/dropdown";
// @ts-ignore
import EventHandler from "bootstrap/js/dist/dom/event-handler";

const DISALLOWED_ATTRIBUTES = ['sanitize', 'whiteList', 'sanitizeFn'];

const uriAttrs = [
    'background',
    'cite',
    'href',
    'itemtype',
    'longdesc',
    'poster',
    'src',
    'xlink:href'
];

const ARIA_ATTRIBUTE_PATTERN = /^aria-[\w-]*$/i;

const DefaultWhitelist = {
    // Global attributes allowed on any supplied element below.
    '*': ['class', 'dir', 'id', 'lang', 'role', 'tabindex', 'style', ARIA_ATTRIBUTE_PATTERN],
    a: ['target', 'href', 'title', 'rel'],
    area: [],
    b: [],
    br: [],
    col: [],
    code: [],
    div: [],
    em: [],
    hr: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    i: [],
    img: ['src', 'alt', 'title', 'width', 'height'],
    li: [],
    ol: [],
    p: [],
    pre: [],
    s: [],
    small: [],
    span: [],
    sub: [],
    sup: [],
    strong: [],
    u: [],
    ul: []
};

/**
 * A pattern that recognizes a commonly useful subset of URLs that are safe.
 *
 * Shoutout to Angular 7 https://github.com/angular/angular/blob/7.2.4/packages/core/src/sanitization/url_sanitizer.ts
 */
const SAFE_URL_PATTERN = /^(?:(?:https?|mailto|ftp|tel|file):|[^&:/?#]*(?:[/?#]|$))/gi;

/**
 * A pattern that matches safe data URLs. Only matches image, video and audio types.
 *
 * Shoutout to Angular 7 https://github.com/angular/angular/blob/7.2.4/packages/core/src/sanitization/url_sanitizer.ts
 */
const DATA_URL_PATTERN = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[a-z0-9+/]+=*$/i;

const ParseableAttributes = ['title', 'placeholder']; // attributes to use as settings, can add others in the future

function allowedAttribute(attr: Attr, allowedAttributeList: (string | RegExp)[]) {
    const attrName = attr.nodeName.toLowerCase();

    if (allowedAttributeList.indexOf(attrName) !== -1) {
        if (uriAttrs.indexOf(attrName) !== -1) {
            return Boolean(attr.nodeValue?.match(SAFE_URL_PATTERN) || attr.nodeValue?.match(DATA_URL_PATTERN));
        }

        return true;
    }

    const regExp = allowedAttributeList.filter((value) => {
        return value instanceof RegExp;
    }) as RegExp[];

    // Check if a regular expression validates the attribute.
    let i = 0;
    const l = regExp.length;
    for (; i < l; i++) {
        if (attrName.match(regExp[i])) {
            return true;
        }
    }

    return false;
}

function sanitizeHtml(unsafeElements: ParentNode[], whiteList: Record<string, (string | RegExp)[]>, sanitizeFn: ((elements: ParentNode[]) => void) | null) {
    if (sanitizeFn && typeof sanitizeFn === 'function') {
        sanitizeFn(unsafeElements);
        return;
    }

    const whitelistKeys = Object.keys(whiteList);

    let i = 0;
    const len = unsafeElements.length;
    for (; i < len; i++) {
        const elements = unsafeElements[i].querySelectorAll('*');

        let j = 0;
        const len2 = elements.length;
        for (; j < len2; j++) {
            const el = elements[j];
            const elName = el.nodeName.toLowerCase();

            if (whitelistKeys.indexOf(elName) === -1) {
                el.parentNode?.removeChild(el);

                continue;
            }

            const attributeList = Array.from(el.attributes);
            const whitelistedAttributes = ([] as (string | RegExp)[]).concat(whiteList['*'] || [], whiteList[elName] || []);

            let k = 0;
            const len3 = attributeList.length;
            for (; k < len3; k++) {
                const attr = attributeList[k];

                if (!allowedAttribute(attr, whitelistedAttributes)) {
                    el.removeAttribute(attr.nodeName);
                }
            }
        }
    }
}

// shallow array comparison
function isEqual<T>(array1: T[], array2: T[]) {
    return array1.length === array2.length && array1.every(function (element, index) {
        return element === array2[index];
    });
}

function toKebabCase(str: string) {
    return str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, function (a, ofs) {
        return (ofs ? '-' : '') + a.toLowerCase();
    });
}

function triggerNative(element: HTMLElement, eventName: string) {
    const event = new Event(eventName, {
        bubbles: true
    });

    element.dispatchEvent(event);
}

// </editor-fold>

function stringSearch(li: SelectPickerElement, searchString: string, method: ((str: string, search: string) => boolean) | 'contains' | "startsWith", normalize: boolean) {
    const stringTypes: (keyof SelectPickerElement)[] = [
        'display',
        'subtext',
        'tokens'
    ];
    let searchSuccess = false;

    for (let i = 0; i < stringTypes.length; i++) {
        const stringType = stringTypes[i];
        let s: string = li[stringType];

        if (s) {
            let string = s.toString();

            // Strip HTML tags. This isn't perfect, but it's much faster than any other method
            if (stringType === 'display') {
                string = string.replace(/<[^>]+>/g, '');
            }

            if (normalize) string = normalizeToBase(string);
            string = string.toUpperCase();

            if (typeof method === 'function') {
                searchSuccess = method(string, searchString);
            } else if (method === 'contains') {
                searchSuccess = string.indexOf(searchString) >= 0;
            } else {
                searchSuccess = string.startsWith(searchString);
            }

            if (searchSuccess) break;
        }
    }

    return searchSuccess;
}

function toInteger(value: string) {
    return parseInt(value, 10) || 0;
}

// Borrowed from Lodash (_.deburr)
/** Used to map Latin Unicode letters to basic Latin letters. */
const deburredLetters: Record<string, string> = {
    // Latin-1 Supplement block.
    '\xc0': 'A', '\xc1': 'A', '\xc2': 'A', '\xc3': 'A', '\xc4': 'A', '\xc5': 'A',
    '\xe0': 'a', '\xe1': 'a', '\xe2': 'a', '\xe3': 'a', '\xe4': 'a', '\xe5': 'a',
    '\xc7': 'C', '\xe7': 'c',
    '\xd0': 'D', '\xf0': 'd',
    '\xc8': 'E', '\xc9': 'E', '\xca': 'E', '\xcb': 'E',
    '\xe8': 'e', '\xe9': 'e', '\xea': 'e', '\xeb': 'e',
    '\xcc': 'I', '\xcd': 'I', '\xce': 'I', '\xcf': 'I',
    '\xec': 'i', '\xed': 'i', '\xee': 'i', '\xef': 'i',
    '\xd1': 'N', '\xf1': 'n',
    '\xd2': 'O', '\xd3': 'O', '\xd4': 'O', '\xd5': 'O', '\xd6': 'O', '\xd8': 'O',
    '\xf2': 'o', '\xf3': 'o', '\xf4': 'o', '\xf5': 'o', '\xf6': 'o', '\xf8': 'o',
    '\xd9': 'U', '\xda': 'U', '\xdb': 'U', '\xdc': 'U',
    '\xf9': 'u', '\xfa': 'u', '\xfb': 'u', '\xfc': 'u',
    '\xdd': 'Y', '\xfd': 'y', '\xff': 'y',
    '\xc6': 'Ae', '\xe6': 'ae',
    '\xde': 'Th', '\xfe': 'th',
    '\xdf': 'ss',
    // Latin Extended-A block.
    '\u0100': 'A', '\u0102': 'A', '\u0104': 'A',
    '\u0101': 'a', '\u0103': 'a', '\u0105': 'a',
    '\u0106': 'C', '\u0108': 'C', '\u010a': 'C', '\u010c': 'C',
    '\u0107': 'c', '\u0109': 'c', '\u010b': 'c', '\u010d': 'c',
    '\u010e': 'D', '\u0110': 'D', '\u010f': 'd', '\u0111': 'd',
    '\u0112': 'E', '\u0114': 'E', '\u0116': 'E', '\u0118': 'E', '\u011a': 'E',
    '\u0113': 'e', '\u0115': 'e', '\u0117': 'e', '\u0119': 'e', '\u011b': 'e',
    '\u011c': 'G', '\u011e': 'G', '\u0120': 'G', '\u0122': 'G',
    '\u011d': 'g', '\u011f': 'g', '\u0121': 'g', '\u0123': 'g',
    '\u0124': 'H', '\u0126': 'H', '\u0125': 'h', '\u0127': 'h',
    '\u0128': 'I', '\u012a': 'I', '\u012c': 'I', '\u012e': 'I', '\u0130': 'I',
    '\u0129': 'i', '\u012b': 'i', '\u012d': 'i', '\u012f': 'i', '\u0131': 'i',
    '\u0134': 'J', '\u0135': 'j',
    '\u0136': 'K', '\u0137': 'k', '\u0138': 'k',
    '\u0139': 'L', '\u013b': 'L', '\u013d': 'L', '\u013f': 'L', '\u0141': 'L',
    '\u013a': 'l', '\u013c': 'l', '\u013e': 'l', '\u0140': 'l', '\u0142': 'l',
    '\u0143': 'N', '\u0145': 'N', '\u0147': 'N', '\u014a': 'N',
    '\u0144': 'n', '\u0146': 'n', '\u0148': 'n', '\u014b': 'n',
    '\u014c': 'O', '\u014e': 'O', '\u0150': 'O',
    '\u014d': 'o', '\u014f': 'o', '\u0151': 'o',
    '\u0154': 'R', '\u0156': 'R', '\u0158': 'R',
    '\u0155': 'r', '\u0157': 'r', '\u0159': 'r',
    '\u015a': 'S', '\u015c': 'S', '\u015e': 'S', '\u0160': 'S',
    '\u015b': 's', '\u015d': 's', '\u015f': 's', '\u0161': 's',
    '\u0162': 'T', '\u0164': 'T', '\u0166': 'T',
    '\u0163': 't', '\u0165': 't', '\u0167': 't',
    '\u0168': 'U', '\u016a': 'U', '\u016c': 'U', '\u016e': 'U', '\u0170': 'U', '\u0172': 'U',
    '\u0169': 'u', '\u016b': 'u', '\u016d': 'u', '\u016f': 'u', '\u0171': 'u', '\u0173': 'u',
    '\u0174': 'W', '\u0175': 'w',
    '\u0176': 'Y', '\u0177': 'y', '\u0178': 'Y',
    '\u0179': 'Z', '\u017b': 'Z', '\u017d': 'Z',
    '\u017a': 'z', '\u017c': 'z', '\u017e': 'z',
    '\u0132': 'IJ', '\u0133': 'ij',
    '\u0152': 'Oe', '\u0153': 'oe',
    '\u0149': "'n", '\u017f': 's'
};

/** Used to match Latin Unicode letters (excluding mathematical operators). */
const reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;

/** Used to compose unicode character classes. */
const rsComboMarksRange = '\\u0300-\\u036f',
    reComboHalfMarksRange = '\\ufe20-\\ufe2f',
    rsComboSymbolsRange = '\\u20d0-\\u20ff',
    rsComboMarksExtendedRange = '\\u1ab0-\\u1aff',
    rsComboMarksSupplementRange = '\\u1dc0-\\u1dff',
    rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange + rsComboMarksExtendedRange + rsComboMarksSupplementRange;

/** Used to compose unicode capture groups. */
const rsCombo = '[' + rsComboRange + ']';

/**
 * Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
 * [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
 */
const reComboMark = RegExp(rsCombo, 'g');

function deburrLetter(key: string): string {
    return deburredLetters[key];
}

function normalizeToBase(string: string) {
    return string.replace(reLatin, deburrLetter).replace(reComboMark, '');
}

// List of HTML entities for escaping.
const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
};

// Functions for escaping and unescaping strings to/from HTML interpolation.
const createEscaper = function (map: Record<string, string>) {
    const escaper = function (match: string) {
        return map[match];
    };
    // Regexes for identifying a key that needs to be escaped.
    const source = '(?:' + Object.keys(map).join('|') + ')';
    const testRegexp = RegExp(source);
    const replaceRegexp = RegExp(source, 'g');
    return function (string: string) {
        string = string == null ? '' : '' + string;
        return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
};

const htmlEscape = createEscaper(escapeMap);

/**
 * ------------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------------
 */
const keyCodeMap: Record<number, string> = {
    32: ' ',
    48: '0',
    49: '1',
    50: '2',
    51: '3',
    52: '4',
    53: '5',
    54: '6',
    55: '7',
    56: '8',
    57: '9',
    59: ';',
    65: 'A',
    66: 'B',
    67: 'C',
    68: 'D',
    69: 'E',
    70: 'F',
    71: 'G',
    72: 'H',
    73: 'I',
    74: 'J',
    75: 'K',
    76: 'L',
    77: 'M',
    78: 'N',
    79: 'O',
    80: 'P',
    81: 'Q',
    82: 'R',
    83: 'S',
    84: 'T',
    85: 'U',
    86: 'V',
    87: 'W',
    88: 'X',
    89: 'Y',
    90: 'Z',
    96: '0',
    97: '1',
    98: '2',
    99: '3',
    100: '4',
    101: '5',
    102: '6',
    103: '7',
    104: '8',
    105: '9'
};

const keyCodes = {
    ESCAPE: 27, // KeyboardEvent.which value for Escape (Esc) key
    ENTER: 13, // KeyboardEvent.which value for Enter key
    SPACE: 32, // KeyboardEvent.which value for space key
    TAB: 9, // KeyboardEvent.which value for tab key
    ARROW_UP: 38, // KeyboardEvent.which value for up arrow key
    ARROW_DOWN: 40 // KeyboardEvent.which value for down arrow key
};

const version = {
    success: false,
    major: 3,
    full: [""]
};
version.full = Dropdown.VERSION.split(' ')[0].split('.');
version.major = parseInt(version.full[0]);
version.success = true;

let selectId = 0;

const EVENT_KEY = '.bs.select';

interface ClassNames {
    DISABLED: string
    DIVIDER: string
    SHOW: string
    DROPUP: string
    MENU: string
    MENURIGHT: string
    MENULEFT: string
    BUTTONCLASS: string
    POPOVERHEADER: string
    ICONBASE: string
    TICKICON: string
}

const classNames: ClassNames = {
    DISABLED: 'disabled',
    DIVIDER: 'divider',
    SHOW: 'open',
    DROPUP: 'dropup',
    MENU: 'dropdown-menu',
    MENURIGHT: 'dropdown-menu-right',
    MENULEFT: 'dropdown-menu-left',
    // to-do: replace with more advanced template/customization options
    BUTTONCLASS: 'btn-default',
    POPOVERHEADER: 'popover-title',
    ICONBASE: 'glyphicon',
    TICKICON: 'glyphicon-ok'
};

const Selector = {
    MENU: '.' + classNames.MENU,
    DATA_TOGGLE: 'data-toggle="dropdown"'
};

class ElementTemplates {
    readonly _div: HTMLDivElement;
    readonly _span: HTMLElement;
    readonly _i: HTMLElement;
    readonly _subtext: HTMLElement;
    readonly _a: HTMLAnchorElement;
    readonly _li: HTMLLIElement;
    readonly _whitespace: Text;
    readonly _fragment: DocumentFragment;
    readonly _option: HTMLOptionElement;
    readonly _selectedOption: HTMLOptionElement;
    readonly _noResults: HTMLLIElement;
    readonly _text: HTMLSpanElement;
    readonly _checkMark: HTMLSpanElement;

    constructor() {
        this._div = document.createElement('div');
        this._span = document.createElement('span');
        this._i = document.createElement('i');
        this._subtext = document.createElement('small');
        this._a = document.createElement('a');
        this._li = document.createElement('li');
        this._whitespace = document.createTextNode('\u00A0');
        this._fragment = document.createDocumentFragment();
        this._option = document.createElement('option');

        this._selectedOption = this._option.cloneNode(false) as HTMLOptionElement;
        this._selectedOption.setAttribute('selected', String(true));

        this._noResults = this._li.cloneNode(false) as HTMLLIElement;
        this._noResults.className = 'no-results';

        this._a.setAttribute('role', 'option');
        this._a.className = 'dropdown-item';

        this._subtext.className = 'text-muted';

        this._text = this._span.cloneNode(false) as HTMLSpanElement;
        this._text.className = 'text';

        this._checkMark = this._span.cloneNode(false) as HTMLSpanElement;
    }

    div(): HTMLDivElement {
        return this._div.cloneNode(true) as HTMLDivElement;
    }

    span(): HTMLElement {
        return this._span.cloneNode(true) as HTMLElement;
    }

    i(): HTMLElement {
        return this._i.cloneNode(true) as HTMLElement;
    }

    subtext(): HTMLElement {
        return this._subtext.cloneNode(true) as HTMLElement;
    }

    a(): HTMLAnchorElement {
        return this._a.cloneNode(true) as HTMLAnchorElement;
    }

    li(): HTMLLIElement {
        return this._li.cloneNode(true) as HTMLLIElement;
    }

    whitespace(): Text {
        return this._whitespace.cloneNode(true) as Text;
    }

    fragment(): DocumentFragment {
        return this._fragment.cloneNode(true) as DocumentFragment;
    }

    option(): HTMLOptionElement {
        return this._option.cloneNode(true) as HTMLOptionElement;
    }

    selectedOption(): HTMLOptionElement {
        return this._selectedOption.cloneNode(true) as HTMLOptionElement;
    }

    noResults(): HTMLLIElement {
        return this._noResults.cloneNode(true) as HTMLLIElement;
    }

    text(): HTMLSpanElement {
        return this._text.cloneNode(true) as HTMLSpanElement;
    }

    checkMark(): HTMLSpanElement {
        return this._checkMark.cloneNode(true) as HTMLSpanElement;
    }
}

const elementTemplates = new ElementTemplates();


const REGEXP_ARROW = [keyCodes.ARROW_UP, keyCodes.ARROW_DOWN];

interface TextOptions {
    text?: string
    content?: string
    icon?: { icon: string, iconBase: string }
    subtext?: string
}

const generateOption = {
    li: function (content: Node | false, classes?: string, optgroup?: string | null) {
        const li = elementTemplates.li();

        if (content) {
            if (content.nodeType === 1 || content.nodeType === 11) {
                li.appendChild(content);
            } else {
                li.innerHTML = String(content);
            }
        }

        if (classes !== undefined && classes !== '') li.className = classes;
        if (optgroup !== undefined && optgroup !== null) li.classList.add('optgroup-' + optgroup);

        return li;
    },

    a: function (text?: string | DocumentFragment, classes?: string, inline?: string) {
        const a = elementTemplates.a();

        if (text) {
            if (typeof text === "string") {
                a.insertAdjacentHTML('beforeend', text);
            } else {
                a.appendChild(text);
            }
        }

        if (typeof classes !== 'undefined' && classes !== '') a.classList.add.apply(a.classList, classes.split(/\s+/));
        if (inline) a.setAttribute('style', inline);

        return a;
    },

    text: function (options: TextOptions, useFragment?: boolean) {
        const textElement = elementTemplates.text();
        let subtextElement,
            iconElement;

        const fragment = elementTemplates.fragment();
        if (options.content) {
            textElement.innerHTML = options.content;
        } else {
            if (options.text) {
                textElement.textContent = options.text;
            }

            if (options.icon) {
                const whitespace = elementTemplates.whitespace();

                // need to use <i> for icons in the button to prevent a breaking change
                // note: switch to span in next major release
                iconElement = (useFragment === true ? elementTemplates.i() : elementTemplates.span());
                iconElement.className = options.icon.iconBase + ' ' + options.icon.icon;

                fragment.appendChild(iconElement);
                fragment.appendChild(whitespace);
            }

            if (options.subtext) {
                subtextElement = elementTemplates.subtext();
                subtextElement.textContent = options.subtext;
                textElement.appendChild(subtextElement);
            }
        }

        if (useFragment === true) {
            while (textElement.childNodes.length > 0) {
                fragment.appendChild(textElement.childNodes[0] as ChildNode);
            }
        } else {
            fragment.appendChild(textElement);
        }

        return fragment;
    },

    label: function (options: { icon?: string, subtext?: string, display?: string }, iconBase: string) {
        const textElement = elementTemplates.text() as HTMLElement;
        let subtextElement,
            iconElement;

        if (options.display) {
            textElement.innerHTML = options.display;
        }

        const fragment = elementTemplates.fragment();
        if (options.icon) {
            const whitespace = elementTemplates.whitespace();

            iconElement = elementTemplates.span();
            iconElement.className = iconBase + ' ' + options.icon;

            fragment.appendChild(iconElement);
            fragment.appendChild(whitespace);
        }

        if (options.subtext) {
            subtextElement = elementTemplates.subtext();
            subtextElement.textContent = options.subtext;
            textElement.appendChild(subtextElement);
        }

        fragment.appendChild(textElement);

        return fragment;
    }
};

const getOptionData = {
    fromOption: function (option: HTMLOptionElement, type: string) {
        let value;

        switch (type) {
            case 'divider':
                value = option.getAttribute('data-divider') === 'true';
                break;

            case 'text':
                value = option.textContent;
                break;

            case 'label':
                value = (option as any).label;
                break;

            case 'style':
                value = option.style.cssText;
                break;

            case 'title':
                value = option.title;
                break;

            default:
                value = option.getAttribute('data-' + toKebabCase(type));
                break;
        }

        return value;
    },
    fromDataSource: function (option: DataSource, type: string) {
        let value;

        switch (type) {
            case 'text':
            case 'label':
                value = option.text || option.value || '';
                break;

            default:
                // @ts-ignore
                value = option[type];
                break;
        }

        return value;
    }
};

interface ElementCommon {
    title?: string
    text: string
    subtext?: string
    content?: any
    icon?: any
    optID?: number
    sanitized?: boolean
    element?: HTMLElement
    position: number
    height: number
    posinset: number
    display?: string
    tokens?: string

    headerIndex?: number
    lastIndex?: number
    value?: string
    type: "option" | "divider" | "optgroup-label";
}

interface OptionElement extends ElementCommon {
    type: "option"
    option?: HtmlSelectPickerOptionElement
    optionClass: string
    inlineStyle: string
    tokens: string
    display?: string
    value: string
    index: number

    disabled: boolean
    selected: boolean
}

interface DividerElement extends ElementCommon {
    type: "divider"
    optID: number
}

interface OptionGroupElement extends ElementCommon {
    type: 'optgroup-label'
    optgroup: any
    optID: number
    display: string
    optgroupClass: string
}

type SelectPickerElement = OptionGroupElement | DividerElement | OptionElement;

interface DataSource {
    hidden?: boolean
    disabled?: boolean
    selected?: boolean
    text: string
    value?: string
    children?: DataSource[]
    className?: string
    option?: HTMLOptionElement
}

interface CommonState {
    data: SelectPickerElement[]
    totalItems: number
    elements: HTMLElement[]
    hasMore: boolean
}

interface MainState extends CommonState {
    optionQueue: DocumentFragment
}

interface SearchState extends CommonState {
    previousValue?: string
}

class State {
    readonly main: MainState;
    readonly search: SearchState;
    // current is either equal to main or search depending on if a search is in progress
    current: MainState | SearchState;
    // map of option values and their respective data (only used in conjunction with options.source)
    readonly view: {
        currentActive?: HTMLElement
        visibleElements?: HTMLElement[]
        position0: number
        position1: number
        canHighlight: boolean[]
        size: number
        firstHighlightIndex: number | false
        scrollTop: number
        titleOption?: HTMLOptionElement
        displayedValue?: string
        tabindex?: string
        widestOption?: HTMLElement
    };
    optionValuesDataMap: Record<string, OptionElement>;
    isSearching: boolean;
    readonly keydown: { keyHistory: string, resetKeyHistory: { start: () => NodeJS.Timeout, cancel?: NodeJS.Timeout } };
    dropup: boolean = false;

    constructor() {
        this.main = {
            data: [],
            optionQueue: elementTemplates.fragment(),
            hasMore: false,
            totalItems: 0,
            elements: []
        };
        this.search = {
            data: [],
            hasMore: false,
            totalItems: 0,
            elements: []
        };
        this.current = this.main;
        this.view = {
            size: -1,
            firstHighlightIndex: false,
            position0: -1,
            position1: -1,
            canHighlight: [],
            scrollTop: 0
        };
        this.optionValuesDataMap = {};
        this.isSearching = false;
        this.keydown = {
            keyHistory: '',
            resetKeyHistory: {
                start: () => {
                    return setTimeout(() => {
                        this.keydown.keyHistory = '';
                    }, 800);
                }
            }
        }
    }
}

const optionSelector = ':not([hidden]):not([data-hidden="true"]):not([style*="display: none"])';

export interface Options {
    noneSelectedText: string
    noneResultsText: string
    countSelectedText: (numSelected: number, numTotal: number) => string
    maxOptionsText: ((numAll: number | false, numGroup: number | false) => [string, string]) | string
    selectAllText: string
    deselectAllText: string
    source: {
        pageSize: number
        data?: DataSource[]
        search?: (callback: (data: DataSource[], more: boolean, totalItems: number) => void, page: number, searchValue?: string) => void,
    }
    chunkSize: number
    doneButton: boolean
    doneButtonText: string
    multipleSeparator: string
    styleBase: string
    style: string
    size: "auto" | number | false
    title: null
    placeholder: string
    allowClear: boolean
    selectedTextFormat: string
    width: false | "auto" | "fit"
    container: HTMLElement | false
    hideDisabled: boolean
    showSubtext: boolean
    showIcon: boolean
    showContent: boolean
    dropupAuto: boolean
    header: boolean
    liveSearch: boolean
    liveSearchPlaceholder: null
    liveSearchNormalize: boolean
    liveSearchStyle: "contains" | "startsWith"
    actionsBox: boolean
    iconBase: string
    tickIcon: string
    showTick: boolean
    template: {
        caret: string
    }
    maxOptions: false | number
    mobile: boolean
    selectOnTab: boolean
    dropdownAlignRight: "auto" | boolean
    windowPadding: [number, number, number, number]
    virtualScroll: number | boolean
    display: boolean | string
    sanitize: boolean
    sanitizeFn: ((elements: ParentNode[]) => void) | null
    whiteList: Record<string, (string | RegExp)[]>
}

type HtmlSelectPickerOptionElement = HTMLOptionElement & { liIndex: number };

interface Coordinates {
    left: number;
    top: number;
}

function indexInParent(node: Node): number {
    return Array.prototype.indexOf.call((node.parentElement as HTMLElement).children, node);
}

export class SelectPicker {
    readonly element: HTMLSelectElement;
    private readonly dropdown: HTMLElement;
    private readonly button: HTMLButtonElement;
    private readonly menu: HTMLElement;
    private options: Options;
    private selectpicker: State;
    private readonly sizeInfo: {
        hasScrollBar: boolean
        liHeight: number
        dropdownHeaderHeight: number
        headerHeight: number
        searchHeight: number
        actionsHeight: number
        selectWidth: number
        doneButtonHeight: number
        dividerHeight: number
        menuPadding: { vert: number, horiz: number }
        menuExtras: { vert: number, horiz: number }
        menuWidth: number
        menuInnerInnerWidth: number
        menuInnerHeight: number
        totalMenuWidth: number
        scrollBarWidth: number
        selectHeight: number
        selectOffsetTop: number
        selectOffsetBot: number
        selectOffsetLeft: number
        selectOffsetRight: number
    };
    selectId: string;
    multiple: boolean;
    autofocus: boolean;
    private clearButton?: HTMLElement;
    private readonly menuInner: HTMLElement;
    private readonly searchBox?: HTMLInputElement;
    private readonly bsDropdown: Dropdown;
    private focusedParent: HTMLElement;
    private noScroll: boolean = false;
    private activeElement?: HTMLElement;
    private prevActiveElement?: HTMLElement;
    private selectedElement?: HTMLElement;
    private bsContainer?: HTMLElement;

    constructor(element: HTMLSelectElement, options: Partial<Options>) {
        this.element = element;
        this.options = Object.assign(Object.assign(Object.assign({}, SelectPicker.DEFAULTS), options), element.dataset);
        this.selectpicker = new State();

        this.sizeInfo = {
            selectWidth: 0,
            hasScrollBar: false,
            liHeight: 0,
            dropdownHeaderHeight: 0,
            headerHeight: 0,
            searchHeight: 0,
            actionsHeight: 0,
            doneButtonHeight: 0,
            dividerHeight: 0,
            menuPadding: {horiz: 0, vert: 0},
            menuExtras: {horiz: 0, vert: 0},
            menuWidth: 0,
            menuInnerInnerWidth: 0,
            menuInnerHeight: 0,
            totalMenuWidth: 0,
            scrollBarWidth: 0,
            selectHeight: 0,
            selectOffsetTop: 0,
            selectOffsetBot: 0,
            selectOffsetLeft: 0,
            selectOffsetRight: 0,
        };

        const that = this,
            id = this.element.getAttribute('id'),
            form = element.form;

        selectId++;
        this.selectId = 'bs-select-' + selectId;

        element.classList.add('bs-select-hidden');

        this.multiple = this.element.getAttribute('multiple') !== null;
        this.autofocus = this.element.getAttribute('autofocus') !== null;

        if (element.classList.contains('show-tick')) {
            this.options.showTick = true;
        }

        this.dropdown = this.createDropdown();

        this.element.after(this.dropdown);
        this.dropdown.prepend(this.element);

        // ensure select is associated with form element if it got unlinked after moving it inside newElement
        if (form && element.form === null) {
            if (!form.id) form.id = 'form-' + this.selectId;
            element.setAttribute('form', form.id);
        }

        this.button = this.dropdown.querySelector('button') as HTMLButtonElement;
        if (this.options.allowClear) this.clearButton = this.button.querySelector('.bs-select-clear-selected') as HTMLElement;
        this.menu = this.dropdown.querySelector(Selector.MENU) as HTMLElement;
        this.menuInner = this.menu.querySelector('.inner') as HTMLElement;
        this.searchBox = this.menu.querySelector('input') as HTMLInputElement;

        element.classList.remove('bs-select-hidden');

        this.fetchData(() => {
            this.render(true);
            this.buildList();

            requestAnimationFrame(function () {
                that.element.dispatchEvent(new Event('loaded' + EVENT_KEY));
            });
        });

        if (this.options.dropdownAlignRight === true) this.menu.classList.add(classNames.MENURIGHT);

        if (id !== null) {
            this.button.setAttribute('data-id', id);
        }

        this.checkDisabled();
        this.clickListener();

        this.bsDropdown = new Dropdown(this.button);

        if (this.options.liveSearch) {
            this.liveSearchListener();
            this.focusedParent = this.searchBox;
        } else {
            this.focusedParent = this.menuInner;
        }

        this.setStyle();
        this.setWidth();
        if (this.options.container) {
            this.selectPosition();
        } else {
            this.element.addEventListener('hide' + EVENT_KEY, () => {
                if (this.isVirtual()) {
                    // empty menu on close
                    const menuInner = this.menuInner,
                        emptyMenu = (menuInner.firstChild as Node).cloneNode(false);

                    // replace the existing UL with an empty one - this is faster than $.empty() or innerHTML = ''
                    menuInner.replaceChild(emptyMenu, (menuInner.firstChild as Node));
                    menuInner.scrollTop = 0;
                }
            });
        }
        if (this.options.mobile) this.mobile();

        this.dropdown.addEventListener('hide.bs.dropdown', (e) => {
            this.element.dispatchEvent(new Event('hide' + EVENT_KEY, e));
        });
        this.dropdown.addEventListener('hidden.bs.dropdown', (e) => {
            this.element.dispatchEvent(new Event('hidden' + EVENT_KEY, e));
        });
        this.dropdown.addEventListener('show.bs.dropdown', (e) => {
            this.element.dispatchEvent(new Event('show' + EVENT_KEY, e));
        });
        this.dropdown.addEventListener('shown.bs.dropdown', (e) => {
            this.element.dispatchEvent(new Event('shown' + EVENT_KEY, e));
        });

        // if (element.hasAttribute('required')) {
        //     this.element.addEventListener('invalid', () => {
        //         this.button.classList.add('bs-invalid');
        //
        //         const shwon = () => {
        //             this.element
        //                 .val(this.element.value) // set the value to hide the validation message in Chrome when menu is opened
        //                 .off('shown' + EVENT_KEY + '.invalid');
        //         };
        //         this.element
        //             .on('shown' + EVENT_KEY + '.invalid', () => {
        //                 this.$element
        //                     .val(this.$element.val() as (string | string[])) // set the value to hide the validation message in Chrome when menu is opened
        //                     .off('shown' + EVENT_KEY + '.invalid');
        //             })
        //             .on('rendered' + EVENT_KEY, function () {
        //                 // if select is no longer invalid, remove the bs-invalid class
        //                 if (this.validity.valid) that.$button[0].classList.remove('bs-invalid');
        //                 that.$element.off('rendered' + EVENT_KEY);
        //             });
        //
        //         this.$button.on('blur' + EVENT_KEY, () => {
        //             this.element.focus();
        //             this.element.blur();
        //             this.$button.off('blur' + EVENT_KEY);
        //         });
        //     });
        // }

        if (form) {
            form.addEventListener('reset', () => {
                requestAnimationFrame(() => {
                    this.render();
                });
            });
        }
    }

    public static VERSION = '1.14.0-beta3';

    // part of this is duplicated in i18n/defaults-en_US.js. Make sure to update both.
    public static DEFAULTS: Options = {
        noneSelectedText: 'Nothing selected',
        noneResultsText: 'No results matched {0}',
        countSelectedText: function (numSelected: number, numTotal: number) {
            return (numSelected == 1) ? '{0} item selected' : '{0} items selected';
        },
        maxOptionsText: function (numAll, numGroup) {
            return [
                (numAll == 1) ? 'Limit reached ({n} item max)' : 'Limit reached ({n} items max)',
                (numGroup == 1) ? 'Group limit reached ({n} item max)' : 'Group limit reached ({n} items max)'
            ];
        },
        selectAllText: 'Select All',
        deselectAllText: 'Deselect All',
        source: {
            pageSize: 40
        },
        chunkSize: 40,
        doneButton: false,
        doneButtonText: 'Close',
        multipleSeparator: ', ',
        styleBase: 'btn',
        style: classNames.BUTTONCLASS,
        size: 'auto',
        title: null,
        placeholder: "",
        allowClear: false,
        selectedTextFormat: 'values',
        width: false,
        container: false,
        hideDisabled: false,
        showSubtext: false,
        showIcon: true,
        showContent: true,
        dropupAuto: true,
        header: false,
        liveSearch: false,
        liveSearchPlaceholder: null,
        liveSearchNormalize: false,
        liveSearchStyle: 'contains',
        actionsBox: false,
        iconBase: classNames.ICONBASE,
        tickIcon: classNames.TICKICON,
        showTick: false,
        template: {
            caret: '<span class="caret"></span>'
        },
        maxOptions: false,
        mobile: false,
        selectOnTab: true,
        dropdownAlignRight: false,
        windowPadding: [0, 0, 0, 0],
        virtualScroll: 600,
        display: false,
        sanitize: true,
        sanitizeFn: null,
        whiteList: DefaultWhitelist
    };

    createDropdown() {
        // Options
        // If we are multiple or showTick option is set, then add the show-tick class
        const showTick = (this.multiple || this.options.showTick) ? ' show-tick' : '';
        const multiselectable = this.multiple ? ' aria-multiselectable="true"' : '';
        let inputGroup = '';
        const autofocus = this.autofocus ? ' autofocus' : '';

        if (version.major < 4 && (this.element.parentElement as HTMLElement).classList.contains('input-group')) {
            inputGroup = ' input-group-btn';
        }

        // Elements
        let header = '';
        let searchbox = '';
        let actionsbox = '';
        let donebutton = '';
        let clearButton = '';

        if (this.options.header) {
            header =
                '<div class="' + classNames.POPOVERHEADER + '">' +
                '<button type="button" class="close" aria-hidden="true">&times;</button>' +
                this.options.header +
                '</div>';
        }

        if (this.options.liveSearch) {
            searchbox =
                '<div class="bs-searchbox">' +
                '<input type="search" class="form-control" autocomplete="off"' +
                (
                    this.options.liveSearchPlaceholder === null ? ''
                        :
                        ' placeholder="' + htmlEscape(this.options.liveSearchPlaceholder) + '"'
                ) +
                ' role="combobox" aria-label="Search" aria-controls="' + this.selectId + '" aria-autocomplete="list">' +
                '</div>';
        }

        if (this.multiple && this.options.actionsBox) {
            actionsbox =
                '<div class="bs-actionsbox">' +
                '<div class="btn-group btn-group-sm">' +
                '<button type="button" class="actions-btn bs-select-all btn ' + classNames.BUTTONCLASS + '">' +
                this.options.selectAllText +
                '</button>' +
                '<button type="button" class="actions-btn bs-deselect-all btn ' + classNames.BUTTONCLASS + '">' +
                this.options.deselectAllText +
                '</button>' +
                '</div>' +
                '</div>';
        }

        if (this.multiple && this.options.doneButton) {
            donebutton =
                '<div class="bs-donebutton">' +
                '<div class="btn-group">' +
                '<button type="button" class="btn btn-sm ' + classNames.BUTTONCLASS + '">' +
                this.options.doneButtonText +
                '</button>' +
                '</div>' +
                '</div>';
        }

        if (this.options.allowClear) {
            clearButton = '<span class="close bs-select-clear-selected" title="' + this.options.deselectAllText + '"><span>&times;</span>';
        }

        const drop =
            '<div class="dropdown bootstrap-select' + showTick + inputGroup + '">' +
            '<button type="button" tabindex="-1" class="' +
            this.options.styleBase +
            ' dropdown-toggle" ' +
            (this.options.display === 'static' ? 'data-display="static"' : '') +
            Selector.DATA_TOGGLE +
            autofocus +
            ' role="combobox" aria-owns="' +
            this.selectId +
            '" aria-haspopup="listbox" aria-expanded="false">' +
            '<div class="filter-option">' +
            '<div class="filter-option-inner">' +
            '<div class="filter-option-inner-inner">&nbsp;</div>' +
            '</div> ' +
            '</div>' +
            clearButton +
            '</span>' +
            (
                version.major >= 4 ? ''
                    :
                    '<span class="bs-caret">' +
                    this.options.template.caret +
                    '</span>'
            ) +
            '</button>' +
            '<div class="' + classNames.MENU + ' ' + (version.major >= 4 ? '' : classNames.SHOW) + '">' +
            header +
            searchbox +
            actionsbox +
            '<div class="inner ' + classNames.SHOW + '" role="listbox" id="' + this.selectId + '" tabindex="-1" ' + multiselectable + '>' +
            '<ul class="' + classNames.MENU + ' inner ' + (version.major >= 4 ? classNames.SHOW : '') + '" role="presentation">' +
            '</ul>' +
            '</div>' +
            donebutton +
            '</div>' +
            '</div>';

        const div = document.createElement("div");
        div.innerHTML = drop;
        return div.firstChild as HTMLElement;
    }

    setPositionData() {
        this.selectpicker.view.canHighlight = [];
        this.selectpicker.view.size = 0;
        this.selectpicker.view.firstHighlightIndex = false;

        for (let i = 0; i < this.selectpicker.current.data.length; i++) {
            const li = this.selectpicker.current.data[i] as SelectPickerElement;
            let canHighlight = true;

            if (li.type === 'divider') {
                canHighlight = false;
                li.height = this.sizeInfo.dividerHeight;
            } else if (li.type === 'optgroup-label') {
                canHighlight = false;
                li.height = this.sizeInfo.dropdownHeaderHeight;
            } else {
                li.height = this.sizeInfo.liHeight;
            }

            if ((li as { disabled?: boolean }).disabled) canHighlight = false;

            this.selectpicker.view.canHighlight.push(canHighlight);

            if (canHighlight) {
                this.selectpicker.view.size++;
                li.posinset = this.selectpicker.view.size;
                if (this.selectpicker.view.firstHighlightIndex === false) this.selectpicker.view.firstHighlightIndex = i;
            }

            li.position = (i === 0 ? 0 : (this.selectpicker.current.data[i - 1] as SelectPickerElement).position) + li.height;
        }
    }

    getSelectedOptions(): OptionElement[] {
        let options = this.selectpicker.main.data;

        if (this.options.source.data || this.options.source.search) {
            options = Object.values(this.selectpicker.optionValuesDataMap);
        }

        let selectedOptions = options.filter(item => {
            if (item.type === "option" && item.selected) {
                return !(this.options.hideDisabled && item.disabled);

            }

            return false;
        }) as OptionElement[];

        // ensure only 1 option is selected if multiple are set in the data source
        if (this.options.source.data && !this.multiple && selectedOptions.length > 1) {
            for (let i = 0; i < selectedOptions.length - 1; i++) {
                (selectedOptions[i] as OptionElement).selected = false;
            }

            selectedOptions = [selectedOptions[selectedOptions.length - 1]];
        }

        return selectedOptions;
    }


    isVirtual() {
        return this.options.virtualScroll === true || (this.options.virtualScroll !== false) && (this.selectpicker.main.data.length >= this.options.virtualScroll);
    }

    createView(isSearching: boolean, setSize?: boolean, refresh?: boolean) {
        const that = this;
        let scrollTop = 0;

        this.selectpicker.isSearching = isSearching;
        this.selectpicker.current = isSearching ? this.selectpicker.search : this.selectpicker.main;

        this.setPositionData();

        if (setSize) {
            if (refresh) {
                scrollTop = this.menuInner.scrollTop;
            } else if (!that.multiple) {
                const element = that.element,
                    selectedIndex = (element.options[element.selectedIndex] as HtmlSelectPickerOptionElement || {})["liIndex"];

                if (typeof selectedIndex === 'number' && this.options.size !== false) {
                    const selectedData = that.selectpicker.main.data[selectedIndex],
                        position = selectedData && selectedData.position;

                    if (position) {
                        scrollTop = position - ((that.sizeInfo.menuInnerHeight + that.sizeInfo.liHeight) / 2);
                    }
                }
            }
        }

        scroll(scrollTop, true);

        EventHandler.off(this.menuInner, 'scroll.createView');
        EventHandler.on(this.menuInner, 'scroll.createView', function () {
            if (!that.noScroll) scroll(that.menuInner.scrollTop);
            that.noScroll = false;
        });

        function scroll(scrollTop: number, init?: boolean) {
            const size = that.selectpicker.current.data.length,
                chunks = [] as [number, number][];
            let chunkSize,
                chunkCount,
                firstChunk,
                lastChunk,
                currentChunk,
                prevPositions,
                positionIsDifferent,
                previousElements,
                menuIsDifferent = true;
            const isVirtual = that.isVirtual();
            const view = that.selectpicker.view;

            view.scrollTop = scrollTop;

            chunkSize = that.options.chunkSize; // number of options in a chunk
            chunkCount = Math.ceil(size / chunkSize) || 1; // number of chunks

            for (let i = 0; i < chunkCount; i++) {
                let endOfChunk = (i + 1) * chunkSize;

                if (i === chunkCount - 1) {
                    endOfChunk = size;
                }

                chunks[i] = [
                    (i) * chunkSize + (!i ? 0 : 1),
                    endOfChunk
                ];

                if (!size) break;

                if (currentChunk === undefined && scrollTop - 1 <= that.selectpicker.current.data[endOfChunk - 1].position - that.sizeInfo.menuInnerHeight) {
                    currentChunk = i;
                }
            }

            if (currentChunk === undefined) currentChunk = 0;

            prevPositions = [view.position0, view.position1];

            // always display previous, current, and next chunks
            firstChunk = Math.max(0, currentChunk - 1);
            lastChunk = Math.min(chunkCount - 1, currentChunk + 1);

            view.position0 = !isVirtual ? 0 : (Math.max(0, chunks[firstChunk][0]) || 0);
            view.position1 = !isVirtual ? size : (Math.min(size, chunks[lastChunk][1]) || 0);

            positionIsDifferent = prevPositions[0] !== view.position0 || prevPositions[1] !== view.position1;

            if (that.activeElement !== undefined) {
                if (init) {
                    if (that.activeElement !== that.selectedElement) {
                        that.defocusItem(that.activeElement);
                    }
                    that.activeElement = undefined;
                }

                if (that.activeElement !== that.selectedElement && that.selectedElement) {
                    that.defocusItem(that.selectedElement);
                }
            }

            if (that.prevActiveElement !== undefined && that.prevActiveElement !== that.activeElement && that.prevActiveElement !== that.selectedElement) {
                that.defocusItem(that.prevActiveElement);
            }

            if (init || positionIsDifferent || that.selectpicker.current.hasMore) {
                previousElements = view.visibleElements ? view.visibleElements.slice() : [];

                if (!isVirtual) {
                    view.visibleElements = that.selectpicker.current.elements;
                } else {
                    view.visibleElements = that.selectpicker.current.elements.slice(view.position0, view.position1);
                }

                that.setOptionStatus();

                // if searching, check to make sure the list has actually been updated before updating DOM
                // this prevents unnecessary repaints
                if (isSearching || (!isVirtual && init)) menuIsDifferent = !isEqual(previousElements, view.visibleElements);

                // if virtual scroll is disabled and not searching,
                // menu should never need to be updated more than once
                if ((init || isVirtual) && menuIsDifferent) {
                    const menuInner = that.menuInner,
                        firstChild = menuInner.firstChild as HTMLElement,
                        menuFragment = document.createDocumentFragment(),
                        emptyMenu = firstChild.cloneNode(false);
                    let marginTop,
                        marginBottom;
                    const elements = view.visibleElements,
                        toSanitize: HTMLElement[] = [];

                    // replace the existing UL with an empty one - this is faster than $.empty()
                    menuInner.replaceChild(emptyMenu, firstChild);

                    for (let i = 0, visibleElementsLen = elements.length; i < visibleElementsLen; i++) {
                        const element = elements[i];

                        if (that.options.sanitize) {
                            const elText = element.lastChild;

                            if (elText) {
                                const elementData = that.selectpicker.current.data[i + view.position0];

                                if (elementData && elementData.content && !elementData.sanitized) {
                                    toSanitize.push(elText as HTMLElement);
                                    elementData.sanitized = true;
                                }
                            }
                        }

                        menuFragment.appendChild(element);
                    }

                    if (that.options.sanitize && toSanitize.length) {
                        sanitizeHtml(toSanitize, that.options.whiteList, that.options.sanitizeFn);
                    }

                    if (isVirtual) {
                        marginTop = (view.position0 === 0 ? 0 : that.selectpicker.current.data[view.position0 - 1].position);
                        marginBottom = (view.position1 > size - 1 ? 0 : that.selectpicker.current.data[size - 1].position - that.selectpicker.current.data[view.position1 - 1].position);

                        firstChild.style.marginTop = marginTop + 'px';
                        firstChild.style.marginBottom = marginBottom + 'px';
                    } else {
                        firstChild.style.marginTop = String(0);
                        firstChild.style.marginBottom = String(0);
                    }

                    (menuInner.firstChild as HTMLElement).appendChild(menuFragment);

                    // if an option is encountered that is wider than the current menu width, update the menu width accordingly
                    // switch to ResizeObserver with increased browser support
                    if (isVirtual && that.sizeInfo.hasScrollBar) {
                        const menuInnerInnerWidth = firstChild.offsetWidth;

                        if (init && menuInnerInnerWidth < that.sizeInfo.menuInnerInnerWidth && that.sizeInfo.totalMenuWidth > that.sizeInfo.selectWidth) {
                            firstChild.style.minWidth = that.sizeInfo.menuInnerInnerWidth + 'px';
                        } else if (menuInnerInnerWidth > that.sizeInfo.menuInnerInnerWidth) {
                            // set to 0 to get actual width of menu
                            that.menu.style.minWidth = String(0);

                            const actualMenuWidth = firstChild.offsetWidth;

                            if (actualMenuWidth > that.sizeInfo.menuInnerInnerWidth) {
                                that.sizeInfo.menuInnerInnerWidth = actualMenuWidth;
                                firstChild.style.minWidth = that.sizeInfo.menuInnerInnerWidth + 'px';
                            }

                            // reset to default CSS styling
                            that.menu.style.minWidth = '';
                        }
                    }
                }

                if ((!isSearching && that.options.source.data || isSearching && that.options.source.search) && that.selectpicker.current.hasMore && currentChunk === chunkCount - 1) {
                    // Don't load the next chunk until scrolling has started
                    // This prevents unnecessary requests while the user is typing if pageSize is <= chunkSize
                    if (scrollTop > 0) {
                        // Chunks use 0-based indexing, but pages use 1-based. Add 1 to convert and add 1 again to get next page
                        const page = Math.floor((currentChunk * that.options.chunkSize) / that.options.source.pageSize) + 2;

                        that.fetchData(() => {
                            that.render();
                            that.buildList(size, isSearching);
                            that.setPositionData();
                            scroll(scrollTop);
                        }, isSearching ? 'search' : 'data', page, isSearching ? that.selectpicker.search.previousValue : undefined);
                    }
                }
            }

            that.prevActiveElement = that.activeElement;

            if (!that.options.liveSearch) {
                that.menuInner.focus();
            } else if (isSearching && init) {
                let index = 0;

                if (!view.canHighlight[index]) {
                    index = 1 + view.canHighlight.slice(1).indexOf(true);
                }

                const visible = view.visibleElements as HTMLElement[];
                const newActive = index < visible.length ? visible[index] : undefined;

                if (view.currentActive) {
                    that.defocusItem(view.currentActive);
                }

                that.activeElement = ((that.selectpicker.current.data[index] || {}) as {
                    element?: HTMLElement
                }).element;

                if (newActive) {
                    that.focusItem(newActive);
                }
            }
        }

        const resizeEvent = 'resize' + EVENT_KEY + '.' + this.selectId + '.createView';
        EventHandler.off(window, resizeEvent);
        EventHandler.on(window, resizeEvent, function () {
            const isActive = that.dropdown.classList.contains(classNames.SHOW);
            if (isActive) scroll(that.menuInner.scrollTop);
        });
    }

    focusItem(li: HTMLElement, liData?: ElementCommon, noStyle?: boolean) {
        liData = liData || this.selectpicker.current.data[this.selectpicker.current.elements.indexOf(this.activeElement as HTMLElement)];
        const a = li.firstChild as HTMLElement;

        if (a) {
            a.setAttribute('aria-setsize', String(this.selectpicker.view.size));
            a.setAttribute('aria-posinset', String(liData.posinset));

            if (noStyle !== true) {
                this.focusedParent.setAttribute('aria-activedescendant', a.id);
                li.classList.add('active');
                a.classList.add('active');
            }
        }
    }

    defocusItem(li: HTMLElement) {
        if (li) {
            li.classList.remove('active');
            if (li.firstChild) (li.firstChild as HTMLElement).classList.remove('active');
        }
    }

    setPlaceholder() {
        const that = this;
        let updateIndex = false;

        if ((this.options.placeholder || this.options.allowClear) && !this.multiple) {
            if (!this.selectpicker.view.titleOption) this.selectpicker.view.titleOption = document.createElement('option');

            // this option doesn't create a new <li> element, but does add a new option at the start,
            // so startIndex should increase to prevent having to check every option for the bs-title-option class
            updateIndex = true;

            const element = this.element;
            let selectTitleOption = false;
            const titleNotAppended = !this.selectpicker.view.titleOption.parentNode,
                selectedIndex = element.selectedIndex,
                selectedOption = element.options[selectedIndex],
                firstSelectable = element.querySelector('select > *:not(:disabled)'),
                firstSelectableIndex = firstSelectable ? (firstSelectable as HTMLOptionElement).index : 0,
                navigation = window.performance && window.performance.getEntriesByType('navigation');
            // Safari doesn't support getEntriesByType('navigation') - fall back to performance.navigation
            // @ts-ignore
            const isNotBackForward = (navigation && navigation.length) ? navigation[0]["type"] !== 'back_forward' : window.performance.navigation.type !== 2;

            if (titleNotAppended) {
                // Use native JS to prepend option (faster)
                this.selectpicker.view.titleOption.className = 'bs-title-option';
                this.selectpicker.view.titleOption.value = '';

                // Check if selected or data-selected attribute is already set on an option. If not, select the titleOption option.
                // the selected item may have been changed by user or programmatically before the bootstrap select plugin runs,
                // if so, the select will have the data-selected attribute
                selectTitleOption = !selectedOption || (selectedIndex === firstSelectableIndex && !selectedOption.defaultSelected && this.element.dataset.selected === undefined);
            }

            if (titleNotAppended || this.selectpicker.view.titleOption.index !== 0) {
                element.insertBefore(this.selectpicker.view.titleOption, element.firstChild);
            }

            // Set selected *after* appending to select,
            // otherwise the option doesn't get selected in IE
            // set using selectedIndex, as setting the selected attr to true here doesn't work in IE11
            if (selectTitleOption && isNotBackForward) {
                element.selectedIndex = 0;
            } else if (document.readyState !== 'complete') {
                // if navigation type is back_forward, there's a chance the select will have its value set by BFCache
                // wait for that value to be set, then run render again
                window.addEventListener('pageshow', function () {
                    if (that.selectpicker.view.displayedValue !== element.value) that.render();
                });
            }
        }

        return updateIndex;
    }

    fetchData(callback: (count: number) => void, type: "data" | "search" = "data", page: number = 1, searchValue?: string) {
        const data = this.options.source[type];

        if (data) {
            this.options.virtualScroll = true;

            if (typeof data === 'function') {
                data(
                    (data, more, totalItems) => {
                        const current = this.selectpicker[type === 'search' ? 'search' : 'main'];
                        current.hasMore = more;
                        current.totalItems = totalItems;
                        const builtData = this.buildData(data, type);
                        callback(builtData);
                        this.element.dispatchEvent(new Event('fetched' + EVENT_KEY));
                    },
                    page,
                    searchValue
                );
            } else if (Array.isArray(data)) {
                const builtData = this.buildData(data, type);
                callback(builtData);
            }
        } else {
            const builtData = this.buildData(false, type);
            callback(builtData);
        }
    }

    private filterHidden(item: DataSource) {
        return !(item.hidden || this.options.hideDisabled && item.disabled);
    }

    private buildDataImpl<U extends DataSource | HTMLOptionElement>(selectOptions: U[], isData: boolean, type: "search" | "data") {
        let selector = optionSelector;
        if (this.options.hideDisabled) selector += ':not(:disabled)';
        const mainData = [] as SelectPickerElement[];
        let startLen = this.selectpicker.main.data ? this.selectpicker.main.data.length : 0,
            optID = 0;
        const startIndex = this.setPlaceholder() && !isData ? 1 : 0; // append the titleOption if necessary and skip the first option in the loop

        if (type === 'search') {
            startLen = this.selectpicker.search.data.length;
        }

        const addDivider = (config: { optID?: number }) => {
            const previousData = mainData[mainData.length - 1];

            // ensure optgroup doesn't create back-to-back dividers
            if (
                previousData &&
                previousData.type === 'divider' &&
                (previousData.optID || config.optID)
            ) {
                return;
            }

            const data = config as Partial<DividerElement>;
            data.type = 'divider';

            mainData.push(data as DividerElement);
        }

        const addOption = <T extends DataSource | HTMLOptionElement>(item: T, dataGetter: (value: T, type: string) => any, option_config: {
            optID?: number,
            optgroupClass?: string,
            disabled?: boolean,
            text?: string,
            content?: string
        }) => {
            const divider = dataGetter(item, 'divider');

            if (divider === true) {
                addDivider({
                    optID: option_config.optID
                });
            } else {
                const liIndex = mainData.length + startLen,
                    cssText = dataGetter(item, 'style'),
                    inlineStyle = cssText ? htmlEscape(cssText) : '';
                let optionClass = ((item.className || '') + (option_config.optgroupClass || ''));

                if (option_config.optID) optionClass = 'opt ' + optionClass;
                optionClass = optionClass.trim();

                // reference option element if it exists
                const option = (("option" in item && item.option !== undefined) ? (item as DataSource).option : (item as HTMLOptionElement)) as HtmlSelectPickerOptionElement;
                option.liIndex = liIndex;
                let optionElement: OptionElement = {
                    optionClass,
                    text: dataGetter(item, 'text'),
                    title: dataGetter(item, 'title'),
                    content: dataGetter(item, 'content'),
                    tokens: dataGetter(item, 'tokens'),
                    subtext: dataGetter(item, 'subtext'),
                    icon: dataGetter(item, 'icon'),
                    inlineStyle: inlineStyle,
                    display: option_config.content || option_config.text,
                    value: item.value === undefined ? item.text : item.value,
                    selected: !!item.selected,
                    type: 'option',
                    index: liIndex,
                    option,
                    disabled: option_config.disabled || !!item.disabled,
                    height: 0,
                    posinset: 0,
                    position: 0,
                };

                if (isData) {
                    if (this.selectpicker.optionValuesDataMap[optionElement.value]) {
                        optionElement = Object.assign(this.selectpicker.optionValuesDataMap[optionElement.value], optionElement);
                    } else {
                        this.selectpicker.optionValuesDataMap[optionElement.value] = optionElement as OptionElement;
                    }
                }

                mainData.push(optionElement as OptionElement);
            }
        }

        const addOptgroup = <T extends DataSource | HTMLOptionElement>(index: number, selectOptions: T[], dataGetter: (value: T, type: string) => any) => {
            const optgroup = selectOptions[index],
                // skip placeholder option
                previous = index - 1 < startIndex ? false : selectOptions[index - 1],
                next = selectOptions[index + 1],
                options = !isData ? ((optgroup as HTMLElement).querySelectorAll('option' + selector) as NodeListOf<HTMLOptionElement>) :
                    ((optgroup as DataSource).children || []).filter(v => this.filterHidden(v));

            if (!options.length) return;

            optID++;

            const config: OptionGroupElement = {
                text: "",
                height: 0,
                posinset: 0,
                position: 0,
                display: htmlEscape(dataGetter(optgroup, 'label')),
                subtext: dataGetter(optgroup, 'subtext'),
                icon: dataGetter(optgroup, 'icon'),
                type: 'optgroup-label',
                optgroupClass: ' ' + (optgroup.className || ''),
                optgroup: optgroup,
                optID: optID
            };
            let headerIndex,
                lastIndex;

            if (previous) {
                addDivider({optID: optID});
            }

            mainData.push(config);

            let j = 0;
            const len = options.length;
            for (; j < len; j++) {
                const option = options[j];

                if (j === 0) {
                    headerIndex = mainData.length - 1;
                    lastIndex = headerIndex + len;
                }

                const optionConfig = {
                    headerIndex: headerIndex,
                    lastIndex: lastIndex,
                    optID: config.optID,
                    optgroupClass: config.optgroupClass,
                    disabled: optgroup.disabled
                };
                if (isData) {
                    addOption(option as DataSource, getOptionData.fromDataSource, optionConfig);
                } else {
                    addOption(option as HTMLOptionElement, getOptionData.fromOption, optionConfig);
                }
            }

            if (next) {
                addDivider({optID: optID});
            }
        }

        for (let len = selectOptions.length, i = startIndex; i < len; i++) {
            const item = selectOptions[i],
                children = item.children;

            if (children && children.length) {
                if (isData) {
                    addOptgroup(i, selectOptions as DataSource[], getOptionData.fromDataSource);
                } else {
                    addOptgroup(i, selectOptions as HTMLOptionElement[], getOptionData.fromOption);
                }
            } else {
                if (isData) {
                    addOption(item as DataSource, getOptionData.fromDataSource, {});
                } else {
                    addOption(item as HTMLOptionElement, getOptionData.fromOption, {});
                }
            }
        }

        switch (type) {
            case 'data': {
                if (!this.selectpicker.main.data) {
                    this.selectpicker.main.data = [];
                }
                Array.prototype.push.apply(this.selectpicker.main.data, mainData);
                this.selectpicker.current.data = this.selectpicker.main.data;
                break;
            }
            case 'search': {
                Array.prototype.push.apply(this.selectpicker.search.data, mainData);
                break;
            }
        }

        return mainData.length;
    }

    private buildData(data: DataSource[] | false, type: "search" | "data") {
        let selector = optionSelector;
        if (this.options.hideDisabled) selector += ':not(:disabled)';

        if (data !== false) {
            const elements = data.filter(v => this.filterHidden(v));
            return this.buildDataImpl(elements, true, type)
        } else {
            const elements = Array.from(this.element.querySelectorAll('select > *' + selector)) as HTMLOptionElement[];
            return this.buildDataImpl(elements, false, type);
        }
    }

    buildList(size?: number, searching?: boolean) {
        const selectData = searching ? this.selectpicker.search.data : this.selectpicker.main.data,
            mainElements: HTMLElement[] = [];
        let widestOptionLength = 0;

        if ((this.options.showTick || this.multiple)) {
            elementTemplates._checkMark.className = this.options.iconBase + ' ' + this.options.tickIcon + ' check-mark';
            elementTemplates._a.appendChild(elementTemplates._checkMark);
        } else {
            elementTemplates._checkMark.remove();
        }

        const buildElement = (mainElements: HTMLElement[], item: SelectPickerElement) => {
            let liElement: HTMLElement,
                combinedLength = 0;

            switch (item.type) {
                case 'divider':
                    liElement = generateOption.li(
                        false,
                        classNames.DIVIDER,
                        (item.optID ? item.optID + 'div' : undefined)
                    );

                    break;

                case 'option':
                    liElement = generateOption.li(
                        generateOption.a(
                            generateOption.text(item),
                            item.optionClass,
                            item.inlineStyle
                        ),
                        '',
                        item.optID === undefined ? undefined : String(item.optID)
                    );

                    if (liElement.firstChild) {
                        (liElement.firstChild as HTMLElement).id = this.selectId + '-' + item.index;
                    }

                    break;

                case 'optgroup-label':
                    liElement = generateOption.li(
                        generateOption.label(item, this.options.iconBase),
                        'dropdown-header' + item.optgroupClass,
                        item.optID === undefined ? undefined : String(item.optID)
                    );

                    break;
            }

            if (!item.element) {
                item.element = liElement;
            } else {
                item.element.innerHTML = liElement.innerHTML;
            }
            mainElements.push(item.element);

            // count the number of characters in the option - not perfect, but should work in most cases
            if (item.display) combinedLength += (item.display as string).length;
            if (item.subtext) combinedLength += item.subtext.length;
            // if there is an icon, ensure this option's width is checked
            if (item.icon) combinedLength += 1;

            if (combinedLength > widestOptionLength) {
                widestOptionLength = combinedLength;

                // guess which option is the widest
                // use this when calculating menu width
                // not perfect, but it's fast, and the width will be updating accordingly when scrolling
                this.selectpicker.view.widestOption = mainElements[mainElements.length - 1];
            }
        }

        const startIndex = size || 0;

        const len = selectData.length;
        let i = startIndex;
        for (; i < len; i++) {
            const item = selectData[i];
            buildElement(mainElements, item);
        }

        if (size) {
            if (searching) {
                Array.prototype.push.apply(this.selectpicker.search.elements, mainElements);
            } else {
                Array.prototype.push.apply(this.selectpicker.main.elements, mainElements);
                this.selectpicker.current.elements = this.selectpicker.main.elements;
            }
        } else {
            if (searching) {
                this.selectpicker.search.elements = mainElements;
            } else {
                this.selectpicker.main.elements = this.selectpicker.current.elements = mainElements;
            }
        }
    }

    findLis() {
        return this.menuInner.querySelectorAll('.inner > li');
    }

    // much faster than $.val()
    getSelectValues(selectedOptions?: SelectPickerElement[]) {
        const value = [] as string[],
            options = selectedOptions || this.getSelectedOptions();
        let opt;

        let i = 0;
        const len = options.length;
        for (; i < len; i++) {
            opt = options[i];

            if (!(opt as { disabled?: boolean }).disabled) {
                value.push(opt.value === undefined ? opt.text : opt.value);
            }
        }

        if (!this.multiple) {
            return !value.length ? null : value[0];
        }

        return value;
    }

    render(init?: boolean) {
        const that = this,
            element = this.element;
        let // ensure titleOption is appended and selected (if necessary) before getting selectedOptions
            placeholderSelected = this.setPlaceholder() && element.selectedIndex === 0;
        const selectedOptions = this.getSelectedOptions(),
            selectedCount = selectedOptions.length,
            selectedValues = this.getSelectValues(selectedOptions),
            button = this.button,
            buttonInner = button.querySelector('.filter-option-inner-inner') as HTMLElement,
            multipleSeparator = document.createTextNode(this.options.multipleSeparator);
        let titleFragment = elementTemplates.fragment(),
            showCount: boolean,
            countMax: string[],
            hasContent = false;

        function createSelected(item: OptionElement) {
            if (item.selected) {
                that.createOption(item, true);
            } else {
                const children = (item as { children?: OptionElement[] }).children;
                if (children && children.length) {
                    children.map(createSelected);
                }
            }
        }

        // create selected option elements to ensure select value is correct
        if (this.options.source.data && init) {
            selectedOptions.map(createSelected);
            element.appendChild(this.selectpicker.main.optionQueue);

            if (placeholderSelected) placeholderSelected = element.selectedIndex === 0;
        }

        button.classList.toggle('bs-placeholder', that.multiple ? !selectedCount : !selectedValues && selectedValues !== "0");

        if (!that.multiple && selectedOptions.length === 1) {
            that.selectpicker.view.displayedValue = selectedValues as string;
        }

        if (this.options.selectedTextFormat === 'static') {
            titleFragment = generateOption.text({text: this.options.placeholder}, true);
        } else {
            showCount = this.multiple && this.options.selectedTextFormat.indexOf('count') !== -1 && selectedCount > 0;

            // determine if the number of selected options will be shown (showCount === true)
            if (showCount) {
                countMax = this.options.selectedTextFormat.split('>');
                showCount = (countMax.length > 1 && selectedCount > Number(countMax[1])) || (countMax.length === 1 && selectedCount >= 2);
            }

            // only loop through all selected options if the count won't be shown
            if (!showCount) {
                if (!placeholderSelected) {
                    for (let selectedIndex = 0; selectedIndex < selectedCount; selectedIndex++) {
                        if (selectedIndex < 50) {
                            const option = selectedOptions[selectedIndex],
                                titleOptions: TextOptions = {};

                            if (option) {
                                if (this.multiple && selectedIndex > 0) {
                                    titleFragment.appendChild(multipleSeparator.cloneNode(false));
                                }

                                if (option.title) {
                                    titleOptions.text = option.title;
                                } else if (option.content && that.options.showContent) {
                                    titleOptions.content = option.content.toString();
                                    hasContent = true;
                                } else {
                                    if (that.options.showIcon) {
                                        titleOptions.icon = option.icon;
                                    }
                                    if (that.options.showSubtext && !that.multiple && option.subtext) titleOptions.subtext = ' ' + option.subtext;
                                    titleOptions.text = option.text.trim();
                                }

                                titleFragment.appendChild(generateOption.text(titleOptions, true));
                            }
                        } else {
                            break;
                        }
                    }

                    // add ellipsis
                    if (selectedCount > 49) {
                        titleFragment.appendChild(document.createTextNode('...'));
                    }
                }
            } else {
                let optionSelector = ':not([hidden]):not([data-hidden="true"]):not([data-divider="true"]):not([style*="display: none"])';
                if (this.options.hideDisabled) optionSelector += ':not(:disabled)';

                // If this is a multiselect, and selectedTextFormat is count, then show 1 of 2 selected, etc.
                const totalCount = this.element.querySelectorAll('select > option' + optionSelector + ', optgroup' + optionSelector + ' option' + optionSelector).length,
                    tr8nText = (typeof this.options.countSelectedText === 'function') ? this.options.countSelectedText(selectedCount, totalCount) : this.options.countSelectedText;

                titleFragment = generateOption.text.call(this, {
                    text: tr8nText.replace('{0}', selectedCount.toString()).replace('{1}', totalCount.toString())
                }, true);
            }
        }

        // If the select doesn't have a title, then use the default, or if nothing is set at all, use noneSelectedText
        if (!titleFragment.childNodes.length) {
            titleFragment = generateOption.text({
                text: this.options.placeholder ? this.options.placeholder : this.options.noneSelectedText
            }, true);
        }

        // if the select has a title, apply it to the button, and if not, apply titleFragment text
        // strip all HTML tags and trim the result, then unescape any escaped tags
        button.title = (titleFragment.textContent as string).replace(/<[^>]*>?/g, '').trim();

        if (this.options.sanitize && hasContent) {
            sanitizeHtml([titleFragment], that.options.whiteList, that.options.sanitizeFn);
        }

        buttonInner.innerHTML = '';
        buttonInner.appendChild(titleFragment);

        if (version.major < 4 && this.dropdown.classList.contains('bs3-has-addon')) {
            const filterExpand = button.querySelector('.filter-expand'),
                clone = buttonInner.cloneNode(true) as Element;

            clone.className = 'filter-expand';

            if (filterExpand) {
                button.replaceChild(clone, filterExpand);
            } else {
                button.appendChild(clone);
            }
        }

        this.element.dispatchEvent(new Event('rendered' + EVENT_KEY));
    }

    /**
     * @param [newStyle]
     * @param [status]
     */
    setStyle(newStyle?: string, status?: "add" | "remove") {
        const button = this.button,
            newElement = this.dropdown,
            style = this.options.style.trim();
        let buttonClass;

        const elementClass = this.element.getAttribute('class');
        if (elementClass !== null) {
            const attr = elementClass.replace(/selectpicker|mobile-device|bs-select-hidden|validate\[.*]/gi, '');
            if (attr.length != 0) {
                this.dropdown.classList.add(attr);
            }
        }

        if (version.major < 4) {
            newElement.classList.add('bs3');

            if ((newElement.parentNode as HTMLElement).classList && (newElement.parentNode as HTMLElement).classList.contains('input-group')) {
                if ((newElement.previousElementSibling !== null || newElement.nextElementSibling !== null)) {
                    const element = (newElement.previousElementSibling === null ? newElement.nextElementSibling as HTMLElement : newElement.previousElementSibling);
                    if (element.classList.contains('input-group-addon')) {
                        newElement.classList.add('bs3-has-addon');
                    }
                }
            }
        }

        if (newStyle) {
            buttonClass = newStyle.trim();
        } else {
            buttonClass = style;
        }

        if (status == 'add') {
            if (buttonClass) button.classList.add.apply(button.classList, buttonClass.split(' '));
        } else if (status == 'remove') {
            if (buttonClass) button.classList.remove.apply(button.classList, buttonClass.split(' '));
        } else {
            if (style) button.classList.remove.apply(button.classList, style.split(' '));
            if (buttonClass) button.classList.add.apply(button.classList, buttonClass.split(' '));
        }
    }

    liHeight(refresh?: boolean) {
        if (!refresh && (this.options.size === false || Object.keys(this.sizeInfo).length)) return;

        const newElement = elementTemplates.div(),
            menu = elementTemplates.div(),
            menuInner = elementTemplates.div(),
            menuInnerInner = document.createElement('ul'),
            divider = elementTemplates.li(),
            dropdownHeader = elementTemplates.li();
        const a = elementTemplates.a(),
            text = elementTemplates.span(),
            maybeHeader = this.menu.querySelector('.' + classNames.POPOVERHEADER),
            header = this.options.header && maybeHeader !== null ? maybeHeader.cloneNode(true) as HTMLElement : null,
            search = this.options.liveSearch ? elementTemplates.div() : null,
            actions = this.options.actionsBox && this.multiple && this.menu.querySelector('.bs-actionsbox') !== null ? this.menu.querySelector('.bs-actionsbox')?.cloneNode(true) as HTMLElement : null,
            doneButton = this.options.doneButton && this.multiple && this.menu.querySelector('.bs-actionsbox') !== null ? this.menu.querySelector('.bs-actionsbox')?.cloneNode(true) as HTMLElement : null,
            firstOption = this.element.options[0];

        this.sizeInfo.selectWidth = this.dropdown.offsetWidth;

        text.className = 'text';
        a.className = 'dropdown-item ' + (firstOption ? firstOption.className : '');
        newElement.className = (this.menu.parentNode as HTMLElement).className + ' ' + classNames.SHOW;
        newElement.style.width = String(0); // ensure button width doesn't affect natural width of menu when calculating
        if (this.options.width === 'auto') menu.style.minWidth = String(0);
        menu.className = classNames.MENU + ' ' + classNames.SHOW;
        menuInner.className = 'inner ' + classNames.SHOW;
        menuInnerInner.className = classNames.MENU + ' inner ' + (version.major >= 4 ? classNames.SHOW : '');
        divider.className = classNames.DIVIDER;
        dropdownHeader.className = 'dropdown-header';

        text.appendChild(document.createTextNode('\u200b'));

        let li: HTMLElement | null = null;
        if (this.selectpicker.current.data.length) {
            for (let i = 0; i < this.selectpicker.current.data.length; i++) {
                const data = this.selectpicker.current.data[i];
                if (data.type === 'option' && (data.element?.firstChild as HTMLElement).style.display !== 'none') {
                    li = data.element as HTMLElement;
                    break;
                }
            }
        } else {
            li = elementTemplates.li();
            a.appendChild(text);
            li.appendChild(a);
        }

        dropdownHeader.appendChild(text.cloneNode(true));

        if (this.selectpicker.view.widestOption) {
            menuInnerInner.appendChild(this.selectpicker.view.widestOption.cloneNode(true));
        }

        menuInnerInner.appendChild(li as Node);
        menuInnerInner.appendChild(divider);
        menuInnerInner.appendChild(dropdownHeader);
        if (header) menu.appendChild(header);
        if (search) {
            const input = document.createElement('input');
            search.className = 'bs-searchbox';
            input.className = 'form-control';
            search.appendChild(input);
            menu.appendChild(search);
        }
        if (actions) menu.appendChild(actions);
        menuInner.appendChild(menuInnerInner);
        menu.appendChild(menuInner);
        if (doneButton) menu.appendChild(doneButton);
        newElement.appendChild(menu);

        document.body.appendChild(newElement);

        const liHeight = li?.offsetHeight;
        const dropdownHeaderHeight = dropdownHeader ? dropdownHeader.offsetHeight : 0;
        const headerHeight = header ? header.offsetHeight : 0;
        const searchHeight = search ? search.offsetHeight : 0;
        const actionsHeight = actions ? actions.offsetHeight : 0;
        const doneButtonHeight = doneButton ? doneButton.offsetHeight : 0;
        const dividerStyle = getComputedStyle(divider);
        const dividerHeight = divider.offsetHeight + toInteger(dividerStyle.marginTop) + toInteger(dividerStyle.marginBottom);
        const menuStyle = getComputedStyle(menu);
        const menuWidth = menu.offsetWidth;
        const menuPadding = {
            vert: toInteger(menuStyle.paddingTop) +
                toInteger(menuStyle.paddingBottom) +
                toInteger(menuStyle.borderTopWidth) +
                toInteger(menuStyle.borderBottomWidth),
            horiz: toInteger(menuStyle.paddingLeft) +
                toInteger(menuStyle.paddingRight) +
                toInteger(menuStyle.borderLeftWidth) +
                toInteger(menuStyle.borderRightWidth)
        };
        const menuExtras = {
            vert: menuPadding.vert +
                toInteger(menuStyle.marginTop) +
                toInteger(menuStyle.marginBottom) + 2,
            horiz: menuPadding.horiz +
                toInteger(menuStyle.marginLeft) +
                toInteger(menuStyle.marginRight) + 2
        };
        let scrollBarWidth;

        menuInner.style.overflowY = 'scroll';

        scrollBarWidth = menu.offsetWidth - menuWidth;

        document.body.removeChild(newElement);

        this.sizeInfo.liHeight = liHeight as number;
        this.sizeInfo.dropdownHeaderHeight = dropdownHeaderHeight;
        this.sizeInfo.headerHeight = headerHeight;
        this.sizeInfo.searchHeight = searchHeight;
        this.sizeInfo.actionsHeight = actionsHeight;
        this.sizeInfo.doneButtonHeight = doneButtonHeight;
        this.sizeInfo.dividerHeight = dividerHeight as number;
        this.sizeInfo.menuPadding = menuPadding;
        this.sizeInfo.menuExtras = menuExtras;
        this.sizeInfo.menuWidth = menuWidth;
        this.sizeInfo.menuInnerInnerWidth = menuWidth - menuPadding.horiz;
        this.sizeInfo.totalMenuWidth = this.sizeInfo.menuWidth;
        this.sizeInfo.scrollBarWidth = scrollBarWidth;
        this.sizeInfo.selectHeight = this.dropdown.offsetHeight;

        this.setPositionData();
    }

    getSelectPosition() {
        const pos = {top: this.dropdown.offsetTop, left: this.dropdown.offsetLeft},
            container = this.options.container === false ? null : this.options.container;
        let containerPos;

        if (container !== null && !container.matches('body')) {
            containerPos = {top: container.offsetTop, left: container.offsetLeft};
            containerPos.top += parseInt(container.style.borderTopWidth);
            containerPos.left += parseInt(container.style.borderLeftWidth);
        } else {
            containerPos = {top: 0, left: 0};
        }

        const winPad = this.options.windowPadding;

        this.sizeInfo.selectOffsetTop = pos.top - containerPos.top - (document.documentElement.scrollTop as number);
        this.sizeInfo.selectOffsetBot = (window.innerHeight as number) - this.sizeInfo.selectOffsetTop - this.sizeInfo.selectHeight - containerPos.top - winPad[2];
        this.sizeInfo.selectOffsetLeft = pos.left - containerPos.left - document.documentElement.scrollLeft;
        this.sizeInfo.selectOffsetRight = (window.innerWidth as number) - this.sizeInfo.selectOffsetLeft - this.sizeInfo.selectWidth - containerPos.left - winPad[1];
        this.sizeInfo.selectOffsetTop -= winPad[0];
        this.sizeInfo.selectOffsetLeft -= winPad[3];
    }

    setMenuSize() {
        this.getSelectPosition();

        const selectWidth = this.sizeInfo.selectWidth,
            liHeight = this.sizeInfo.liHeight,
            headerHeight = this.sizeInfo.headerHeight,
            searchHeight = this.sizeInfo.searchHeight,
            actionsHeight = this.sizeInfo.actionsHeight,
            doneButtonHeight = this.sizeInfo.doneButtonHeight,
            divHeight = this.sizeInfo.dividerHeight,
            menuPadding = this.sizeInfo.menuPadding;
        let menuInnerHeight: number | "" = "",
            menuHeight: number,
            divLength = 0,
            minHeight: number | "" = "",
            _minHeight: number,
            maxHeight: number | "" = "",
            menuInnerMinHeight: number | "" = "",
            estimate,
            isDropup: boolean;

        if (this.options.dropupAuto) {
            // Get the estimated height of the menu without scrollbars.
            // This is useful for smaller menus, where there might be plenty of room
            // below the button without setting dropup, but we can't know
            // the exact height of the menu until createView is called later
            estimate = liHeight * this.selectpicker.current.data.length + menuPadding.vert;

            isDropup = this.sizeInfo.selectOffsetTop - this.sizeInfo.selectOffsetBot > this.sizeInfo.menuExtras.vert && estimate + this.sizeInfo.menuExtras.vert + 50 > this.sizeInfo.selectOffsetBot;

            // ensure dropup doesn't change while searching (so menu doesn't bounce back and forth)
            if (this.selectpicker.isSearching) {
                isDropup = this.selectpicker.dropup;
            }

            this.dropdown.classList.toggle(classNames.DROPUP, isDropup);
            this.selectpicker.dropup = isDropup;
        }

        if (this.options.size === 'auto') {
            _minHeight = this.selectpicker.current.data.length > 3 ? this.sizeInfo.liHeight * 3 + this.sizeInfo.menuExtras.vert - 2 : 0;
            menuHeight = this.sizeInfo.selectOffsetBot - this.sizeInfo.menuExtras.vert;
            minHeight = _minHeight + headerHeight + searchHeight + actionsHeight + doneButtonHeight;
            menuInnerMinHeight = Math.max(_minHeight - menuPadding.vert, 0);

            if (this.dropdown.classList.contains(classNames.DROPUP)) {
                menuHeight = this.sizeInfo.selectOffsetTop - this.sizeInfo.menuExtras.vert;
            }

            maxHeight = menuHeight;
            menuInnerHeight = menuHeight - headerHeight - searchHeight - actionsHeight - doneButtonHeight - menuPadding.vert;
        } else if (this.options.size && this.selectpicker.current.elements.length > this.options.size) {
            for (let i = 0; i < this.options.size; i++) {
                if (this.selectpicker.current.data[i].type === 'divider') divLength++;
            }

            menuHeight = liHeight * this.options.size + divLength * divHeight + menuPadding.vert;
            menuInnerHeight = menuHeight - menuPadding.vert;
            maxHeight = menuHeight + headerHeight + searchHeight + actionsHeight + doneButtonHeight;
            minHeight = menuInnerMinHeight = '';
        }

        {
            const style = this.menu.style;
            style.maxHeight = maxHeight + 'px';
            style.minHeight = minHeight + 'px';
            style.overflow = "hidden auto";
        }

        {
            const style = this.menuInner.style;
            style.maxHeight = menuInnerHeight + 'px';
            style.minHeight = menuInnerMinHeight + 'px';
            style.overflow = "hidden auto";
        }

        // ensure menuInnerHeight is always a positive number to prevent issues calculating chunkSize in createView
        this.sizeInfo.menuInnerHeight = Math.max(menuInnerHeight === "" ? 0 : menuInnerHeight, 1);

        if (this.selectpicker.current.data.length && this.selectpicker.current.data[this.selectpicker.current.data.length - 1].position > this.sizeInfo.menuInnerHeight) {
            this.sizeInfo.hasScrollBar = true;
            this.sizeInfo.totalMenuWidth = this.sizeInfo.menuWidth + this.sizeInfo.scrollBarWidth;
        }

        if (this.options.dropdownAlignRight === 'auto') {
            this.menu.classList.toggle(classNames.MENURIGHT, this.sizeInfo.selectOffsetLeft > this.sizeInfo.selectOffsetRight && this.sizeInfo.selectOffsetRight < (this.sizeInfo.totalMenuWidth - selectWidth));
        }

        // @ts-ignore
        if (this.bsDropdown._popper) this.bsDropdown._popper.update();
    }

    setSize(refresh?: boolean) {
        this.liHeight(refresh);

        if (this.options.header) this.menu.style.paddingTop = "0px";

        if (this.options.size !== false) {
            const that = this;

            this.setMenuSize();

            if (this.options.liveSearch) {
                const update = function () {
                    return that.setMenuSize();
                };
                EventHandler.off(this.searchBox, "input.setMenuSize");
                EventHandler.off(this.searchBox, "propertychange.setMenuSize");
                EventHandler.on(this.searchBox, "input.setMenuSize", update);
                EventHandler.on(this.searchBox, "propertychange.setMenuSize", update);
            }

            const resizeEvents = [
                'resize' + EVENT_KEY + '.' + this.selectId + '.setMenuSize',
                'scroll' + EVENT_KEY + '.' + this.selectId + '.setMenuSize'
            ];
            if (this.options.size === 'auto') {
                const update = function() {
                    return that.setMenuSize();
                };
                resizeEvents.forEach(e => {
                    EventHandler.off(window, e);
                    EventHandler.on(window, e, update);
                });
            } else if (this.options.size && this.selectpicker.current.elements.length > this.options.size) {
                resizeEvents.forEach(e => EventHandler.off(window, e));
            }
        }

        this.createView(false, true, refresh);
    }

    setWidth() {
        const that = this;

        if (this.options.width === 'auto') {
            requestAnimationFrame(function () {
                that.menu.style.minWidth = '0';

                that.element.addEventListener('loaded' + EVENT_KEY, function () {
                    that.liHeight();
                    that.setMenuSize();

                    // Get correct width if element is hidden
                    const selectClone = that.dropdown.cloneNode(true) as HTMLElement;
                    document.body.appendChild(selectClone);
                    selectClone.style.width = "auto";
                    const btn = selectClone.querySelector('button') as HTMLElement;
                    const btnWidth = btn.offsetWidth;

                    selectClone.remove();

                    // Set width to whatever's larger, button title or longest option
                    that.sizeInfo.selectWidth = Math.max(that.sizeInfo.totalMenuWidth, btnWidth);
                    that.dropdown.style.width = that.sizeInfo.selectWidth + 'px';
                });
            });
        } else if (this.options.width === 'fit') {
            // Remove inline min-width so width can be changed from 'auto'
            this.menu.style.removeProperty("min-width");
            this.dropdown.style.removeProperty("width");
            this.dropdown.classList.add('fit-width');
        } else if (this.options.width) {
            // Remove inline min-width so width can be changed from 'auto'
            this.menu.style.removeProperty("min-width");
            this.dropdown.style.width = this.options.width;
        } else {
            // Remove inline min-width/width so width can be changed
            this.menu.style.removeProperty("min-width");
            this.dropdown.style.removeProperty("width");
        }
        // Remove fit-width class if width is changed programmatically
        if (this.dropdown.classList.contains('fit-width') && this.options.width !== 'fit') {
            this.dropdown.classList.remove('fit-width');
        }
    }

    private getContainerPos(): Coordinates {
        const container = this.options.container === false ? null : this.options.container;
        if (container !== null && !container.matches('body')) {
            const pos = {left: container.offsetLeft, top: container.offsetTop};
            pos.top += parseInt(container.style.borderTopWidth) - (container.scrollTop);
            pos.left += parseInt(container.style.borderLeftWidth) - (container.scrollLeft);
            return pos;
        } else {
            return {top: 0, left: 0};
        }
    }

    selectPosition() {
        this.bsContainer = document.createElement("div");
        this.bsContainer.classList.add("bs-container");

        const that = this;

        this.button.addEventListener('click', function () {
            if (that.isDisabled()) {
                return;
            }

            if (that.bsContainer !== undefined && that.options.container !== false) {
                const container = that.bsContainer;
                that.options.container.appendChild(container);
                container.classList.toggle(classNames.SHOW, !that.button.classList.contains(classNames.SHOW));
                container.appendChild(that.menu);
            }
        });

        this.element.addEventListener('hide' + EVENT_KEY, function () {
            that.bsContainer?.remove();
        });
    }

    createOption(data: OptionElement | HTMLOptionElement, init: boolean) {
        // @ts-ignore
        const optionData = !data.option ? data as HTMLOptionElement : data.option;

        if (optionData && optionData.nodeType !== 1) {
            const option = (init ? elementTemplates.selectedOption : elementTemplates.option)() as HtmlSelectPickerOptionElement;
            if (optionData.value !== undefined) option.value = optionData.value;
            option.textContent = optionData.text;

            option.selected = true;

            if (optionData.liIndex !== undefined) {
                option.liIndex = optionData.liIndex;
            } else if (!init) {
                option.liIndex = data.index;
            }

            // @ts-ignore
            data.option = option;

            this.selectpicker.main.optionQueue.appendChild(option);
        }
    }

    setOptionStatus(selectedOnly?: boolean) {
        const that = this;

        that.noScroll = false;

        if (that.selectpicker.view.visibleElements && that.selectpicker.view.visibleElements.length) {
            for (let i = 0; i < that.selectpicker.view.visibleElements.length; i++) {
                const liData = that.selectpicker.current.data[i + that.selectpicker.view.position0];

                if (liData.type === "option") {
                    if (selectedOnly !== true) {
                        that.setDisabled(liData);
                    }

                    that.setSelected(liData);
                }
            }

            // append optionQueue (documentFragment with option elements for select options)
            if (this.options.source.data) this.element.appendChild(this.selectpicker.main.optionQueue);
        }
    }

    /**
     * @param {Object} liData - the option object that is being changed
     * @param {boolean} selected - true if the option is being selected, false if being deselected
     */
    setSelected(liData: OptionElement, selected?: boolean) {
        selected = selected === undefined ? liData.selected : selected;

        // @ts-ignore
        const li = liData.element,
            activeElementIsSet = this.activeElement !== undefined,
            thisIsActive = this.activeElement === li;
        let prevActive,
            a;
        const // if current option is already active
            // OR
            // if the current option is being selected, it's NOT multiple, and
            // activeElement is undefined:
            //  - when the menu is first being opened, OR
            //  - after a search has been performed, OR
            //  - when retainActive is false when selecting a new option (i.e. index of the newly selected option is not the same as the current activeElement)
            keepActive = thisIsActive || (selected && !this.multiple && !activeElementIsSet);

        if (!li) return;

        if (selected !== undefined) {
            liData.selected = selected;
            // @ts-ignore
            if (liData.option) liData.option.selected = selected;
        }

        if (selected && this.options.source.data) {
            this.createOption(liData, false);
        }

        a = li.firstChild as HTMLElement;

        if (selected) {
            this.selectedElement = li;
        }

        li.classList.toggle('selected', selected);

        if (keepActive) {
            this.focusItem(li, liData);
            this.selectpicker.view.currentActive = li;
            this.activeElement = li;
        } else {
            this.defocusItem(li);
        }

        if (a) {
            a.classList.toggle('selected', selected);

            if (selected) {
                a.setAttribute('aria-selected', String(true));
            } else {
                if (this.multiple) {
                    a.setAttribute('aria-selected', String(false));
                } else {
                    a.removeAttribute('aria-selected');
                }
            }
        }

        if (!keepActive && !activeElementIsSet && selected && this.prevActiveElement !== undefined) {
            prevActive = this.prevActiveElement;

            this.defocusItem(prevActive);
        }
    }

    setDisabled(liData: OptionElement) {
        const disabled = liData.disabled,
            li = liData.element;

        if (!li) return;

        const a = li.firstChild as HTMLElement;

        li.classList.toggle(classNames.DISABLED, disabled);

        if (a) {
            if (version.major >= 4) a.classList.toggle(classNames.DISABLED, disabled);

            if (disabled) {
                a.setAttribute('aria-disabled', String(disabled));
                a.setAttribute('tabindex', String(-1));
            } else {
                a.removeAttribute('aria-disabled');
                a.setAttribute('tabindex', String(0));
            }
        }
    }

    isDisabled() {
        return this.element.disabled;
    }

    checkDisabled() {
        if (this.isDisabled()) {
            this.dropdown.classList.add(classNames.DISABLED);
            this.button.classList.add(classNames.DISABLED);
            this.button.setAttribute('aria-disabled', String(true));
        } else {
            if (this.button.classList.contains(classNames.DISABLED)) {
                this.dropdown.classList.remove(classNames.DISABLED);
                this.button.classList.remove(classNames.DISABLED);
                this.button.setAttribute('aria-disabled', String(false));
            }
        }
    }

    clickListener() {
        const that = this;

        document.documentElement.setAttribute("bs-select-space-select", String(false));

        this.button.addEventListener('keyup', function (e) {
            if (/(32)/.test(e.keyCode.toString(10)) && document.documentElement.getAttribute("bs-select-space-select") === "true") {
                e.preventDefault();
                document.documentElement.setAttribute("bs-select-space-select", String(false));
            }
        });

        function clearSelection() {
            if (that.multiple) {
                that.deselectAll();
            } else {
                const element = that.element,
                    prevIndex = element.selectedIndex,
                    prevOption = element.options[prevIndex] as HtmlSelectPickerOptionElement,
                    prevData = prevOption ? that.selectpicker.main.data[prevOption.liIndex] : false;

                if (prevData !== false && prevData.type === "option") {
                    that.setSelected(prevData, false);
                }

                element.selectedIndex = 0;

                triggerNative(that.element, 'change');
            }

            // remove selected styling if menu is open
            if (that.dropdown.classList.contains(classNames.SHOW)) {
                if (that.options.liveSearch) {
                    that.searchBox?.focus();
                }

                that.createView(false);
            }
        }

        this.button.addEventListener('click', function (e) {
            if (that.options.allowClear) {
                let target = e.target as HTMLElement;
                const clearButton = that.clearButton as HTMLElement;

                if (target === clearButton || target.parentElement === clearButton) {
                    e.stopImmediatePropagation();
                    clearSelection();
                }
            }

            if (!that.dropdown.classList.contains(classNames.SHOW)) {
                that.setSize();
            }
        });

        function setFocus() {
            if (that.options.liveSearch) {
                that.searchBox?.focus();
            } else {
                that.menuInner.focus();
            }
        }

        function checkPopperExists() {
            // @ts-ignore
            if (that.bsDropdown._popper && that.bsDropdown._popper.state) {
                setFocus();
            } else {
                requestAnimationFrame(checkPopperExists);
            }
        }

        this.element.addEventListener('shown' + EVENT_KEY, function () {
            if (that.menuInner.scrollTop !== that.selectpicker.view.scrollTop) {
                that.menuInner.scrollTop = that.selectpicker.view.scrollTop;
            }

            if (version.major > 3) {
                requestAnimationFrame(checkPopperExists);
            } else {
                setFocus();
            }
        });

        // ensure posinset and setsize are correct before selecting an option via a click
        EventHandler.on(this.menuInner, 'mouseenter', 'li a', function (this: HTMLElement) {
            const hoverLi = this.parentElement as HTMLElement;
            const position0 = that.isVirtual() ? that.selectpicker.view.position0 : 0;
            const index = indexInParent(hoverLi);
            const hoverData = that.selectpicker.current.data[index + position0];

            that.focusItem(hoverLi, hoverData, true);
        })

        EventHandler.on(this.menuInner, 'click', 'li a', function (this: HTMLElement, e: Event) {
            const element = that.element;
            const li = this.parentElement as HTMLElement;
            const position0 = that.isVirtual() ? that.selectpicker.view.position0 : 0;
            const clickedData = that.selectpicker.current.data[indexInParent(li) + position0] as OptionElement;
            const clickedElement = clickedData.element;
            const prevIndex = element.selectedIndex;
            const prevOption = element.options[prevIndex] as HtmlSelectPickerOptionElement;
            const prevData = prevOption ? that.selectpicker.main.data[prevOption.liIndex] : false;
            let triggerChange = true;

            // Don't close on multi choice menu
            if (that.multiple && that.options.maxOptions !== 1) {
                e.stopPropagation();
            }

            e.preventDefault();

            // Don't run if the select is disabled
            if (!(!that.isDisabled() && !li.classList.contains(classNames.DISABLED))) {
                return;
            }
            const option = clickedData.option as HTMLOptionElement;
            const state = option.selected;
            const optgroupData = that.selectpicker.current.data.find(function (datum) {
                return datum.type === 'optgroup-label' && datum.optID === clickedData.optID;
            }) as (OptionGroupElement | undefined);
            const optgroup = optgroupData ? optgroupData.optgroup : undefined;
            const dataGetter = optgroup instanceof Element ? getOptionData.fromOption : getOptionData.fromDataSource;
            const optgroupOptions = optgroup && optgroup.children;
            const maxOptions = that.options.maxOptions === false ? false : that.options.maxOptions;
            const maxOptionsGrp = optgroup && parseInt(dataGetter(optgroup, 'maxOptions')) || false;
            let retainActive = false;
            if (clickedElement === that.activeElement) retainActive = true;
            if (!retainActive) {
                that.prevActiveElement = that.activeElement;
                that.activeElement = undefined;
            }
            if (!that.multiple || maxOptions === 1) { // Deselect previous option if not multi select
                if (prevData) that.setSelected(prevData as OptionElement, false);
                that.setSelected(clickedData, true);
            } else { // Toggle the clicked option if multi select.
                that.setSelected(clickedData, !state);
                that.focusedParent.focus();

                if (maxOptions !== false || maxOptionsGrp !== false) {
                    const maxReached = maxOptions !== false ? maxOptions < that.getSelectedOptions().length : false;
                    let selectedGroupOptions = 0;

                    if (optgroup && optgroup.children) {
                        for (let i = 0; i < optgroup.children.length; i++) {
                            if (optgroup.children[i].selected) selectedGroupOptions++;
                        }
                    }

                    if ((maxOptions && maxReached) || (maxOptionsGrp && maxOptionsGrp < selectedGroupOptions)) {
                        if (maxOptions !== false && maxOptions === 1) {
                            element.selectedIndex = -1;
                            that.setOptionStatus(true);
                        } else if (maxOptionsGrp !== false && maxOptionsGrp === 1) {
                            for (let i = 0; i < optgroupOptions.length; i++) {
                                const _option = optgroupOptions[i];
                                that.setSelected(that.selectpicker.current.data[_option.liIndex] as OptionElement, false);
                            }

                            that.setSelected(clickedData, true);
                        } else {
                            let maxOptionsArr: [string, string];
                            if (typeof that.options.maxOptionsText === 'string') {
                                maxOptionsArr = [that.options.maxOptionsText, that.options.maxOptionsText];
                            } else {
                                maxOptionsArr = that.options.maxOptionsText(maxOptions, maxOptionsGrp);
                            }

                            const notify = document.createElement("div");
                            notify.classList.add("notify");

                            if (maxOptions && maxReached) {
                                let maxTxt = maxOptionsArr[0].replace('{n}', String(maxOptions));
                                const div = document.createElement("div");
                                div.innerHTML = maxTxt;
                                notify.appendChild(div);
                                triggerChange = false;
                                that.element.dispatchEvent(new Event('maxReached' + EVENT_KEY));
                            }

                            if (maxOptionsGrp && maxOptionsGrp < selectedGroupOptions) {
                                let maxTxtGrp = maxOptionsArr[1].replace('{n}', String(maxOptionsGrp));
                                const div = document.createElement("div");
                                div.innerHTML = maxTxtGrp;
                                notify.appendChild(div);
                                triggerChange = false;
                                that.element.dispatchEvent(new Event('maxReachedGrp' + EVENT_KEY));
                            }

                            setTimeout(function () {
                                that.setSelected(clickedData, false);
                            }, 10);

                            notify.classList.add('fadeOut');

                            setTimeout(function () {
                                notify.remove();
                            }, 1050);
                            that.menu.appendChild(notify);
                        }
                    }
                }
            }
            if (that.options.source.data) that.element.appendChild(that.selectpicker.main.optionQueue);
            if (!that.multiple || (that.multiple && that.options.maxOptions === 1)) {
                that.button.focus();
            } else if (that.options.liveSearch) {
                that.searchBox?.focus();
            }
            if (triggerChange) {
                if (that.multiple || prevIndex !== element.selectedIndex) {
                    // $option.prop('selected') is current option state (selected/unselected). prevValue is the value of the select prior to being changed.
                    triggerNative(that.element, 'change');
                }
            }
        });

        EventHandler.on(this.menu, 'click', 'li.' + classNames.DISABLED + ' a, .' + classNames.POPOVERHEADER + ', .' + classNames.POPOVERHEADER + ' :not(.close)', function (this: HTMLElement, e: MouseEvent) {
            if (e.currentTarget == this) {
                e.preventDefault();
                e.stopPropagation();
                if (that.options.liveSearch && !(e.target as HTMLElement).classList.contains('close')) {
                    that.searchBox?.focus();
                } else {
                    that.button.focus();
                }
            }
        });

        EventHandler.on(this.menu, 'click', '.divider, .dropdown-header', function (this: HTMLElement, e: Event) {
            e.preventDefault();
            e.stopPropagation();
            if (that.options.liveSearch) {
                that.searchBox?.focus();
            } else {
                that.button.focus();
            }
        });

        EventHandler.on(this.menu, 'click', '.' + classNames.POPOVERHEADER + ' .close', function () {
            that.button.click();
        });

        this.searchBox?.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        EventHandler.on(this.menu, 'click', '.actions-btn', function (this: HTMLElement, e: Event) {
            if (that.options.liveSearch) {
                that.searchBox?.focus();
            } else {
                that.button.focus();
            }

            e.preventDefault();
            e.stopPropagation();

            if (this.classList.contains('bs-select-all')) {
                that.selectAll();
            } else {
                that.deselectAll();
            }
        });

        this.button.addEventListener('focus', function (e) {
            const tabindex = that.element.getAttribute('tabindex');

            // only change when button is actually focused
            if (tabindex !== null && e.isTrusted) {
                // apply select element's tabindex to ensure correct order is followed when tabbing to the next element
                this.setAttribute('tabindex', tabindex);
                // set element's tabindex to -1 to allow for reverse tabbing
                that.element.setAttribute('tabindex', String(-1));
                that.selectpicker.view.tabindex = tabindex;
            }
        })
        this.button.addEventListener('blur', function (e) {
            // revert everything to original tabindex
            if (that.selectpicker.view.tabindex !== undefined && e.isTrusted) {
                that.element.setAttribute('tabindex', String(that.selectpicker.view.tabindex));
                this.setAttribute('tabindex', String(-1));
                that.selectpicker.view.tabindex = undefined;
            }
        });

        this.element
            .addEventListener('change', () => {
                this.render();
            });
        this.element.addEventListener('focus', () => {
            if (!this.options.mobile) this.button.focus();
        });
    }

    private showNoResults(matchCount: number, searchValue: string) {
        if (!matchCount) {
            const r = elementTemplates._noResults;
            r.innerHTML = this.options.noneResultsText.replace('{0}', '"' + htmlEscape(searchValue) + '"');
            (this.menuInner.firstChild as Node).appendChild(r);
        }
    }

    liveSearchListener() {
        const that = this;

        this.button.addEventListener('click', function () {
            if (that.searchBox !== undefined && !!that.searchBox.value) {
                that.searchBox.value = '';
                that.selectpicker.search.previousValue = undefined;
            }
        });

        const searchBox = this.searchBox;
        if (searchBox) {
            const stop = function (e: Event) {
                e.stopPropagation();
            };
            this.searchBox?.addEventListener('click', stop);
            this.searchBox?.addEventListener('focus', stop);
            this.searchBox?.addEventListener('touchend', stop);

            const update = () => {
                const searchValue = searchBox.value;

                this.selectpicker.search.elements = [];
                this.selectpicker.search.data = [];

                if (searchValue) {
                    this.selectpicker.search.previousValue = searchValue;

                    if (this.options.source.search) {
                        this.fetchData(builtData => {
                            this.render();
                            this.buildList(undefined, true);
                            this.noScroll = true;
                            this.menuInner.scrollTop = 0;
                            this.createView(true);
                            this.showNoResults(builtData, searchValue);
                        }, 'search', 0, searchValue);
                    } else {
                        let searchMatch: HTMLElement[] = [],
                            q = searchValue.toUpperCase(),
                            cache: Record<number, boolean> = {},
                            cacheArr: number[] = [],
                            searchStyle = that._searchStyle(),
                            normalizeSearch = that.options.liveSearchNormalize;

                        if (normalizeSearch) q = normalizeToBase(q);

                        for (let i = 0; i < that.selectpicker.main.data.length; i++) {
                            const li = that.selectpicker.main.data[i];

                            if (!cache[i]) {
                                cache[i] = stringSearch(li, q, searchStyle, normalizeSearch);
                            }

                            if (cache[i] && li.headerIndex !== undefined && cacheArr.indexOf(li.headerIndex) === -1) {
                                if (li.headerIndex > 0) {
                                    cache[li.headerIndex - 1] = true;
                                    cacheArr.push(li.headerIndex - 1);
                                }

                                cache[li.headerIndex] = true;
                                cacheArr.push(li.headerIndex);

                                cache[(li.lastIndex === undefined ? 0 : li.lastIndex) + 1] = true;
                            }

                            if (cache[i] && li.type !== 'optgroup-label') cacheArr.push(i);
                        }

                        for (let i = 0, cacheLen = cacheArr.length; i < cacheLen; i++) {
                            let index = cacheArr[i],
                                prevIndex = cacheArr[i - 1],
                                li = that.selectpicker.main.data[index],
                                liPrev = that.selectpicker.main.data[prevIndex];

                            if (li.type !== 'divider' || (li.type === 'divider' && liPrev && liPrev.type !== 'divider' && cacheLen - 1 !== i)) {
                                that.selectpicker.search.data.push(li);
                                searchMatch.push(that.selectpicker.main.elements[index]);
                            }
                        }

                        that.activeElement = undefined;
                        that.noScroll = true;
                        that.menuInner.scrollTop = 0;
                        that.selectpicker.search.elements = searchMatch;
                        that.createView(true);
                        that.showNoResults(searchMatch.length, searchValue);
                    }
                } else if (that.selectpicker.search.previousValue) { // for IE11 (#2402)
                    that.menuInner.scrollTop = 0;
                    that.createView(false);
                }
            };
            searchBox.addEventListener('input', update);
            searchBox.addEventListener('propertychange', update);
        }
    }

    _searchStyle() {
        return this.options.liveSearchStyle || 'contains';
    }

    val(value?: string | string[]): (string | string[] | undefined) {
        const element = this.element;

        if (value !== undefined) {
            const selectedOptions = this.getSelectedOptions();

            let valueArray: string[];
            if (!Array.isArray(value)) valueArray = [value];
            else valueArray = value

            for (let i = 0; i < selectedOptions.length; i++) {
                const item = selectedOptions[i];

                if (item && valueArray.indexOf(String(item.value)) === -1) {
                    this.setSelected(item, false);
                }
            }

            // only update selected value if it matches an existing option
            this.selectpicker.main.data.filter((item: SelectPickerElement) => {
                if (item.type === "option" && valueArray.indexOf(String(item.value)) !== -1) {
                    this.setSelected(item, true);
                    return true;
                }

                return false;
            });

            if (this.options.source.data) element.appendChild(this.selectpicker.main.optionQueue);

            if (this.dropdown.classList.contains(classNames.SHOW)) {
                if (this.multiple) {
                    this.setOptionStatus(true);
                } else {
                    const liSelectedIndex = (element.options[element.selectedIndex] as HtmlSelectPickerOptionElement || {} as {
                        liIndex: undefined
                    }).liIndex;

                    if (typeof liSelectedIndex === 'number') {
                        this.setSelected(this.selectpicker.current.data[liSelectedIndex] as OptionElement, true);
                    }
                }
            }

            this.render();
            return;
        } else {
            return this.element.value;
        }
    }

    changeAll(status?: boolean) {
        if (!this.multiple) return;
        if (status === undefined) status = true;

        const element = this.element;
        let previousSelected = 0,
            currentSelected = 0;

        element.classList.add('bs-select-hidden');

        let i = 0;
        const data = this.selectpicker.current.data, len = data.length;
        for (; i < len; i++) {
            const liData = data[i];

            if (liData.type === "option" && liData.option && !liData.disabled) {
                if (liData.selected) previousSelected++;
                liData.option.selected = status;
                liData.selected = status;
                if (status) currentSelected++;
            }
        }

        element.classList.remove('bs-select-hidden');

        if (previousSelected === currentSelected) return;

        this.setOptionStatus();

        triggerNative(this.element, 'change');
    }

    selectAll() {
        return this.changeAll(true);
    }

    deselectAll() {
        return this.changeAll(false);
    }

    toggle(state?: boolean) {
        let isActive,
            triggerClick = state === undefined;

        if (!triggerClick) {
            isActive = this.dropdown.classList.contains(classNames.SHOW);
            triggerClick = state === true && !isActive || state === false && isActive;
        }

        if (triggerClick) this.button.click();
    }

    public open() {
        this.toggle(true);
    }

    public close() {
        this.toggle(false);
    }

    // keydown(e: KeyboardEvent) {
    //     const $this = $(this),
    //         isToggle = $this.hasClass('dropdown-toggle'),
    //         items = this.findLis();
    //     let index: number,
    //         isActive: boolean,
    //         liActive: HTMLElement | undefined,
    //         activeLi,
    //         offset = 0,
    //         updateScroll = false;
    //     const downOnTab = e.which === keyCodes.TAB && !isToggle && !this.options.selectOnTab,
    //         isArrowKey = REGEXP_ARROW.indexOf(e.which) !== -1 || downOnTab,
    //         scrollTop = this.menuInner.scrollTop,
    //         isVirtual = this.isVirtual(),
    //         position0 = isVirtual ? this.selectpicker.view.position0 : 0;
    //
    //     // do nothing if a function key is pressed
    //     if (e.which >= 112 && e.which <= 123) return;
    //
    //     isActive = this.menu.classList.contains(classNames.SHOW);
    //
    //     if (
    //         !isActive &&
    //         (
    //             isArrowKey ||
    //             (e.which >= 48 && e.which <= 57) ||
    //             (e.which >= 96 && e.which <= 105) ||
    //             (e.which >= 65 && e.which <= 90)
    //         )
    //     ) {
    //         this.button.click();
    //
    //         if (this.options.liveSearch) {
    //             this.searchBox?.focus();
    //             return;
    //         }
    //     }
    //
    //     if (e.which === keyCodes.ESCAPE && isActive) {
    //         e.preventDefault();
    //         this.button.focus();
    //         this.button.click();
    //     }
    //
    //     if (isArrowKey) { // if up or down
    //         if (!items.length) return;
    //
    //         liActive = this.activeElement;
    //         index = liActive ? Array.prototype.indexOf.call((liActive.parentElement as HTMLElement).children, liActive) : -1;
    //
    //         if (index !== -1) {
    //             this.defocusItem(liActive as HTMLElement);
    //         }
    //
    //         if (e.which === keyCodes.ARROW_UP) { // up
    //             if (index !== -1) index--;
    //             if (index + position0 < 0) index += items.length;
    //
    //             if (!this.selectpicker.view.canHighlight[index + position0]) {
    //                 index = this.selectpicker.view.canHighlight.slice(0, index + position0).lastIndexOf(true) - position0;
    //                 if (index === -1) index = items.length - 1;
    //             }
    //         } else if (e.which === keyCodes.ARROW_DOWN || downOnTab) { // down
    //             index++;
    //             if (index + position0 >= this.selectpicker.view.canHighlight.length) index = Number(this.selectpicker.view.firstHighlightIndex);
    //
    //             if (!this.selectpicker.view.canHighlight[index + position0]) {
    //                 index = index + 1 + this.selectpicker.view.canHighlight.slice(index + position0 + 1).indexOf(true);
    //             }
    //         }
    //
    //         e.preventDefault();
    //
    //         let liActiveIndex = position0 + index;
    //
    //         if (e.which === keyCodes.ARROW_UP) { // up
    //             // scroll to bottom and highlight last option
    //             if (position0 === 0 && index === items.length - 1) {
    //                 this.menuInner.scrollTop = this.menuInner.scrollHeight;
    //
    //                 liActiveIndex = this.selectpicker.current.elements.length - 1;
    //             } else {
    //                 activeLi = this.selectpicker.current.data[liActiveIndex];
    //
    //                 // could be undefined if no results exist
    //                 if (activeLi) {
    //                     offset = activeLi.position - activeLi.height;
    //
    //                     updateScroll = offset < scrollTop;
    //                 }
    //             }
    //         } else if (e.which === keyCodes.ARROW_DOWN || downOnTab) { // down
    //             // scroll to top and highlight first option
    //             if (index === this.selectpicker.view.firstHighlightIndex) {
    //                 this.menuInner.scrollTop = 0;
    //
    //                 liActiveIndex = this.selectpicker.view.firstHighlightIndex;
    //             } else {
    //                 activeLi = this.selectpicker.current.data[liActiveIndex];
    //
    //                 // could be undefined if no results exist
    //                 if (activeLi) {
    //                     offset = activeLi.position - this.sizeInfo.menuInnerHeight;
    //
    //                     updateScroll = offset > scrollTop;
    //                 }
    //             }
    //         }
    //
    //         liActive = this.selectpicker.current.elements[liActiveIndex];
    //
    //         this.activeElement = (this.selectpicker.current.data[liActiveIndex] || {}).element;
    //
    //         this.focusItem(liActive);
    //
    //         this.selectpicker.view.currentActive = liActive;
    //
    //         if (updateScroll) this.menuInner.scrollTop = offset;
    //
    //         if (this.options.liveSearch) {
    //             this.searchBox?.focus();
    //         } else {
    //             $this.trigger('focus');
    //         }
    //     }
    //
    //     // Select focused option if "Enter", "Spacebar" or "Tab" (when selectOnTab is true) are pressed inside the menu.
    //     if (
    //         isActive &&
    //         (
    //             (e.which === keyCodes.SPACE && !this.selectpicker.keydown.keyHistory) ||
    //             e.which === keyCodes.ENTER ||
    //             (e.which === keyCodes.TAB && this.options.selectOnTab)
    //         )
    //     ) {
    //         if (e.which !== keyCodes.SPACE) e.preventDefault();
    //
    //         if (!this.options.liveSearch || e.which !== keyCodes.SPACE) {
    //             (this.menuInner.querySelector('.active a') as HTMLAnchorElement | null)?.click(); // retain active class
    //             $this.trigger('focus');
    //
    //             if (!this.options.liveSearch) {
    //                 // Prevent screen from scrolling if the user hits the spacebar
    //                 e.preventDefault();
    //                 // Fixes spacebar selection of dropdown items in FF & IE
    //                 document.documentElement.setAttribute("bs-select-space-select", String(true));
    //             }
    //         }
    //     }
    // }

    mobile() {
        // ensure mobile is set to true if mobile function is called after init
        this.options.mobile = true;
        this.element.classList.add('mobile-device');
    }

    public refresh(options: Partial<Options>) {
        // update options if data attributes have been changed
        this.options = Object.assign(Object.assign(Object.assign({}, SelectPicker.DEFAULTS), options), this.element.dataset);
        this.selectpicker = new State();

        if (this.options.source.data) {
            this.render();
            this.buildList();
        } else {
            this.fetchData(() => {
                this.render();
                this.buildList();
            });
        }

        this.checkDisabled();
        this.setStyle();
        this.setWidth();

        this.setSize(true);

        this.element.dispatchEvent(new Event('refreshed' + EVENT_KEY));
    }

    hide() {
        this.bsDropdown.hide();
    }

    show() {
        this.bsDropdown.show();
    }

    remove() {
        this.dropdown.remove();
        this.element.remove();
    }
}

(function () {
    if (version.major >= 4) {
        // some defaults need to be changed if using Bootstrap 4
        // check to see if they have already been manually changed before forcing them to update
        const toUpdate: { name: keyof Options, className: keyof ClassNames }[] = [];

        if (SelectPicker.DEFAULTS.style === classNames.BUTTONCLASS) toUpdate.push({
            name: 'style',
            className: 'BUTTONCLASS'
        });
        if (SelectPicker.DEFAULTS.iconBase === classNames.ICONBASE) toUpdate.push({
            name: 'iconBase',
            className: 'ICONBASE'
        });
        if (SelectPicker.DEFAULTS.tickIcon === classNames.TICKICON) toUpdate.push({
            name: 'tickIcon',
            className: 'TICKICON'
        });

        classNames.DIVIDER = 'dropdown-divider';
        classNames.SHOW = 'show';
        classNames.BUTTONCLASS = 'btn-light';
        classNames.POPOVERHEADER = 'popover-header';
        classNames.ICONBASE = '';
        classNames.TICKICON = 'bs-ok-default';

        for (let i = 0; i < toUpdate.length; i++) {
            const option = toUpdate[i];
            // @ts-ignore
            SelectPicker.DEFAULTS[option.name] = classNames[option.className];
        }
    }

    if (version.major > 4) {
        Selector.DATA_TOGGLE = 'data-bs-toggle="dropdown"';
    }
})();
