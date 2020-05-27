document.addEventListener('DOMContentLoaded', (event) => {
    let pageHref: string = null;
    let filledThisHref = false;
    let delayFillTimeout: number;

    const isSafari = (typeof safari !== 'undefined') && navigator.userAgent.indexOf(' Safari/') !== -1 &&
        navigator.userAgent.indexOf('Chrome') === -1;

    if (isSafari) {
        if ((window as any).__bitwardenFrameId == null) {
            (window as any).__bitwardenFrameId = Math.floor(Math.random() * Math.floor(99999999));
        }
        const responseCommand = 'autofillerAutofillOnPageLoadEnabledResponse';
        safari.extension.dispatchMessage('bitwarden', {
            command: 'bgGetDataForTab',
            responseCommand: responseCommand,
            bitwardenFrameId: (window as any).__bitwardenFrameId,
        });
        safari.self.addEventListener('message', (msgEvent: any) => {
            const msg = JSON.parse(msgEvent.message.msg);
            if (msg.bitwardenFrameId != null && (window as any).__bitwardenFrameId !== msg.bitwardenFrameId) {
                return;
            }
            if (msg.command === responseCommand && msg.data.autofillEnabled === true) {
                setInterval(() => doFillIfNeeded(), 500);
            } else if (msg.command === 'fillForm' && pageHref === msg.url) {
                filledThisHref = true;
            }
        }, false);
        return;
    } else {
        const enabledKey = 'enableAutoFillOnPageLoad';
        chrome.storage.local.get(enabledKey, (obj: any) => {
            if (obj != null && obj[enabledKey] === true) {
                setInterval(() => doFillIfNeeded(), 500);
            }
        });
        // BJA TODO : only if enabled, to run only on domEvents ?  debounced ? do the same for doFillIfNeeded()
        // setInterval(() => showInPageMenuIfNeeded(), 500);
        setTimeout(showInPageMenuIfNeeded, 500); // juste once at load, to simplify debug
        // setInterval(showInPageMenuIfNeeded, 500); // juste once at load, to simplify debug


        chrome.runtime.onMessage.addListener((msg: any, sender: any, sendResponse: Function) => {
            if (msg.command === 'fillForm' && pageHref === msg.url) {
                filledThisHref = true;
            }
        });
    }

    function showInPageMenuIfNeeded() {
        console.log("BJA - step 01 - showInPageMenuIfNeeded()");
        // 1- send
        const msg: any = {
            command: 'bgCollectPageDetails',
            sender: 'autofillerMenu',
        };

        if (isSafari) {
            msg.bitwardenFrameId = (window as any).__bitwardenFrameId;
            safari.extension.dispatchMessage('bitwarden', msg);
        } else {
            chrome.runtime.sendMessage(msg);
        }
    }

    function doFillIfNeeded(force: boolean = false) {
        console.log("BTW - 0A - doFillIfNeeded(), force:", force);
        if (force || pageHref !== window.location.href) {
            if (!force) {
                // Some websites are slow and rendering all page content. Try to fill again later
                // if we haven't already.
                filledThisHref = false;
                if (delayFillTimeout != null) {
                    window.clearTimeout(delayFillTimeout);
                }
                delayFillTimeout = window.setTimeout(() => {
                    if (!filledThisHref) {
                        doFillIfNeeded(true);
                    }
                }, 1500);
            }

            console.log("BTW - 0B - doFillIfNeeded()");
            pageHref = window.location.href;
            const msg: any = {
                command: 'bgCollectPageDetails',
                sender: 'autofiller',
            };

            if (isSafari) {
                msg.bitwardenFrameId = (window as any).__bitwardenFrameId;
                safari.extension.dispatchMessage('bitwarden', msg);
            } else {
                chrome.runtime.sendMessage(msg);
            }
        }
    }
});
