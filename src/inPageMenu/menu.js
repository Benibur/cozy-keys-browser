require('./menu.scss');

// Globals
var ciphers                 ,
    panel                   ,
    resizeListener   = null ,
    focusedFieldTypes;

const loginRowTemplate = `
<div class="row-main">
    <div class="row-icon icon-login"></div>
    <div class="row-main-content">
        <div class="row-text">site description</div>
        <div class="row-detail">account login</div>
    </div>
</div>
`;

const cardRowTemplate = `
<div class="row-main">
    <div class="row-icon icon-card"></div>
    <div class="row-main-content">
        <div class="row-text">site description</div>
        <div class="row-detail">account login</div>
    </div>
</div>
`;

const idsRowTemplate = `
<div class="row-main">
    <i class="row-icon icon-identity"></i>
    <div class="row-main-content">
        <div class="row-text">site description</div>
        <div class="row-detail">account login</div>
    </div>
</div>
`;


document.addEventListener('DOMContentLoaded', () => {

    // 1- get elements references
    panel = document.querySelector('.panel')
    title = document.getElementById('title-content')

    // 2- prepare i18n and apply
    var i18n = {};
    var lang = window.navigator.language;
    if (typeof safari !== 'undefined') { // not implemented for safari for now
        // const responseCommand = 'notificationBarFrameDataResponse';
        // sendPlatformMessage({
        //     command: 'bgGetDataForTab',
        //     responseCommand: responseCommand
        // });
        // safari.self.addEventListener('message', (msgEvent) => {
        //     const msg = JSON.parse(msgEvent.message.msg);
        //     if (msg.command === responseCommand && msg.data) {
        //         i18n = msg.data.i18n;
        //         load();
        //     }
        // }, false);
    } else {
        // retrieve i18n values and set elements textcontent
        lang = chrome.i18n.getUILanguage();
        const i18nGetMessage = chrome.i18n.getMessage
        title.textContent = i18nGetMessage('inPageMenuSelectAnAccount')
    }

    // 3- listen to the commands and ciphers sent by the addon
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
        if (msg.command !== 'updateMenuCiphers' && msg.command !== 'menuAnswerRequest') return

        if (msg.command === 'updateMenuCiphers') {
            ciphers = msg.data.ciphers
            document.getElementById('logo-link').href = msg.data.cozyUrl
            updateRows()
            // then request to adjust the menu height
            adjustMenuHeight()
            // then update the height each time the iframe window is resized
            if (!resizeListener) {
                resizeListener = window.addEventListener('resize', ()=>{
                    adjustMenuHeight()
                });
            }

        } else if (msg.command === 'menuAnswerRequest') {
            switch (msg.subcommand) {
                case 'menuSetSelectionOnCipher':
                    setSelectionOnCipher(msg.targetCipher)
                    break;
                case 'menuSelectionValidate':
                    requestFormFillingWithCipher(document.querySelector('.selected').dataset.cipherId)
                    break;
            }
        }
    })

    // 4- request ciphers to the background scripts
    chrome.runtime.sendMessage({
        command   : 'bgAnswerMenuRequest',
        subcommand: 'getCiphersForTab'   ,
        sender    : 'menu.js'            ,
    });

    // 5- listen to UI events (close and click)
    const closeIcon = document.querySelector('.close-icon')
    closeIcon.addEventListener('click',()=>{
        chrome.runtime.sendMessage({
            command   : 'bgAnswerMenuRequest',
            subcommand: 'closeMenu'          ,
            force     : true                 ,
            sender    : 'menu.js'            ,
        });
    })
    document.querySelector('#login-rows-list').addEventListener('click',(e)=>{
        const rowEl = e.target.closest('.row-main')
        requestFormFillingWithCipher(rowEl.dataset.cipherId)
    })
    document.querySelector('#card-rows-list').addEventListener('click',(e)=>{
        const rowEl = e.target.closest('.row-main')
        requestFormFillingWithCipher(rowEl.dataset.cipherId)
    })
    document.querySelector('#ids-rows-list').addEventListener('click',(e)=>{
        const rowEl = e.target.closest('.row-main')
        requestFormFillingWithCipher(rowEl.dataset.cipherId)
    })

    // 4- detect when to apply the fadeIn effect
    window.addEventListener('hashchange', _testHash)
    _testHash()

})


/* --------------------------------------------------------------------- */
// Request the background to autofill the page with a cipher
function requestFormFillingWithCipher(cipherId) {
    chrome.runtime.sendMessage({
        command   : 'bgAnswerMenuRequest',
        subcommand: 'fillFormWithCipher' ,
        cipherId  : cipherId             ,
        sender    : 'menu.js'            ,
    });
}


/* --------------------------------------------------------------------- */
// Update all rows
function updateRows() {
    updateLoginRows()
    updateCardRows()
    updateIdsRows()
    selectFirstVisibleRow()
}


/* --------------------------------------------------------------------- */
// Update login rows.
// Existing rows will be deleted
function updateLoginRows() {
    // 1- generate rows
    const rowsList = document.querySelector('#login-rows-list')
    // 2- remove all previous rows
    while (rowsList.firstElementChild) {rowsList.firstElementChild.remove();}
    // 3- add rows
    ciphers.logins.forEach((cipher, i) => {
        rowsList.insertAdjacentHTML('beforeend', loginRowTemplate)
        const row = rowsList.lastElementChild
        const text = row.querySelector('.row-text')
        const detail = row.querySelector('.row-detail')
        text.textContent = cipher.name
        detail.textContent = cipher.login.username
        row.dataset.cipherId = cipher.id
    });
}


/* --------------------------------------------------------------------- */
// update card rows. Existing rows will be deleted
function updateCardRows() {
    // 1- generate rows
    const rowsList = document.querySelector('#card-rows-list')
    // 2- remove all previous rows
    while (rowsList.firstElementChild) {rowsList.firstElementChild.remove();}
    // 3- add rows
    ciphers.cards.forEach((cipher, i) => {
        rowsList.insertAdjacentHTML('beforeend', cardRowTemplate)
        const row = rowsList.lastElementChild
        const text = row.querySelector('.row-text')
        const detail = row.querySelector('.row-detail')
        text.textContent = cipher.name
        detail.textContent = cipher.card[focusedFieldTypes.card]
        row.dataset.cipherId = cipher.id
    });
}


/* --------------------------------------------------------------------- */
// update identities rows. Existing rows will be deleted
function updateIdsRows() {
    // 1- generate rows
    const rowsList = document.querySelector('#ids-rows-list')
    // 2- remove all previous rows
    while (rowsList.firstElementChild) {rowsList.firstElementChild.remove();}
    // 3- add rows
    ciphers.identities.forEach((cipher, i) => {
        rowsList.insertAdjacentHTML('beforeend', idsRowTemplate)
        const row = rowsList.lastElementChild
        const text = row.querySelector('.row-text')
        const detail = row.querySelector('.row-detail')
        text.textContent = cipher.name
        detail.textContent = cipher.identity[focusedFieldTypes.identity]
        row.dataset.cipherId = cipher.id
    });
}


/* --------------------------------------------------------------------- */
// Select the first visible row
function selectFirstVisibleRow() {
    if (!ciphers) return // no received ciphers yet, rows are not ready
    const hash = window.location.hash
    const currentSelection = document.querySelector('.selected')
    if(currentSelection) currentSelection.classList.remove('selected')
    if (hash.includes('login_')) {
        document.querySelector('#login-rows-list').firstElementChild.classList.add('selected')
        return
    }
    if (hash.includes('card_')) {
        document.querySelector('#card-rows-list').firstElementChild.classList.add('selected')
        return
    }
    if (hash.includes('identity_')) {
        document.querySelector('#ids-rows-list').firstElementChild.classList.add('selected')
        return
    }
}


/* --------------------------------------------------------------------- */
// Ask parent page to adjuste iframe height
// Width is constraint by the parent page, but height is decided by the
// iframe content
function adjustMenuHeight() {
    chrome.runtime.sendMessage({
        command   : 'bgAnswerMenuRequest' ,
        subcommand: 'setMenuHeight'       ,
        height    : panel.offsetHeight    ,
        sender    : 'menu.js'             ,
    });
}



/* --------------------------------------------------------------------- */
// Select the row corresponding to a Cipher ID
function setSelectionOnCipher(targetCipherId) {
    // 1- remove current selection
    document.querySelector('.selected').classList.remove('selected')
    // 2- set new selection
    document.querySelector(`[data-cipher-id="${targetCipherId}"]`).classList.add('selected')
}


/* --------------------------------------------------------------------- */
// Test if iframe content should fadeIn or not
function _testHash(){
    // structure of the hash : "#applyFadeIn*login_username*identity_email*..."
    // turn it into focusedFieldTypes = {login:"username", identity:"email"}
    const hash = window.location.hash
    focusedFieldTypes = {}
    const focusedFieldTypesArr = hash.split('*').map(t => t.split('_'))
    focusedFieldTypesArr.shift()
    focusedFieldTypesArr.forEach(t=>focusedFieldTypes[t[0]]=t[1])
    if (focusedFieldTypes.login) {
        document.querySelector('#login-rows-list').classList.remove('hidden')
    } else {
        document.querySelector('#login-rows-list').classList.add('hidden')
    }
    if (focusedFieldTypes.card) {
        updateCardRows()
        document.querySelector('#card-rows-list').classList.remove('hidden')
    } else {
        document.querySelector('#card-rows-list').classList.add('hidden')
    }
    if (focusedFieldTypes.identity) {
        updateIdsRows()
        document.querySelector('#ids-rows-list').classList.remove('hidden')
    } else {
        document.querySelector('#ids-rows-list').classList.add('hidden')
    }
    adjustMenuHeight()
    if (hash.includes('applyFadeIn')) {
        // console.log('autofillMenu._testHash() : add fade-in');
        panel.classList.add('fade-in')
    } else {
        // console.log('autofillMenu._testHash() : remove fade-in');
        panel.className = "panel";
    }
    selectFirstVisibleRow()
}
