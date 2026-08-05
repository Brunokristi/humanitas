import test from 'node:test';
import assert from 'node:assert/strict';

import {
    shouldReduceMotionForBrowser
} from '../src/utils/browserCompatibility.js';

test('disables motion-heavy effects for Safari browsers', () => {
    assert.equal(
        shouldReduceMotionForBrowser(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'MacIntel',
            0
        ),
        true
    );

    assert.equal(
        shouldReduceMotionForBrowser(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/11A4449d Safari/604.1',
            'iPhone',
            5
        ),
        true
    );

    assert.equal(
        shouldReduceMotionForBrowser(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Win32',
            0
        ),
        false
    );
});
