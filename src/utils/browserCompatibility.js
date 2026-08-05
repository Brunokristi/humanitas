export function shouldReduceMotionForBrowser(userAgent = '', platform = '', maxTouchPoints = 0) {
    if (typeof navigator !== 'undefined' && !userAgent) {
        userAgent = navigator.userAgent;
    }

    if (typeof navigator !== 'undefined' && !platform) {
        platform = navigator.platform ?? '';
    }

    if (typeof navigator !== 'undefined' && maxTouchPoints === 0) {
        maxTouchPoints = navigator.maxTouchPoints ?? 0;
    }

    const isIosFamily = /iP(hone|ad|od)/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
    const isSafariEngine = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium/i.test(userAgent);
    const isMacSafari = isSafariEngine && (/Mac|Macintosh/i.test(platform) || /Macintosh/i.test(userAgent));

    return (isIosFamily || isMacSafari) && isSafariEngine;
}
