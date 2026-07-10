'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createBootQueue } = require('../scripts/lib/boot-queue');

describe('scripts/lib/boot-queue', () => {
    it('queues until activate, then drains in order', () => {
        const calls = [];
        const q = createBootQueue((fn) => fn());
        q.enqueue(() => calls.push(1));
        q.enqueue(() => calls.push(2));
        assert.equal(q.size(), 2);
        assert.deepEqual(calls, []);
        q.activate();
        assert.deepEqual(calls, [1, 2]);
        assert.equal(q.size(), 0);
    });

    it('runs immediately after activate', () => {
        const calls = [];
        const q = createBootQueue((fn) => fn());
        q.activate();
        q.enqueue(() => calls.push('late'));
        assert.deepEqual(calls, ['late']);
    });

    it('ignores non-function enqueue', () => {
        const q = createBootQueue();
        q.enqueue(null);
        q.enqueue(1);
        assert.equal(q.size(), 0);
        q.activate();
        assert.equal(q.size(), 0);
    });

    it('uses custom runner for errors isolation at call site', () => {
        const seen = [];
        const q = createBootQueue((fn) => {
            try {
                fn();
            } catch (error) {
                seen.push(String(error && error.message));
            }
        });
        q.enqueue(() => {
            throw new Error('boom');
        });
        q.enqueue(() => seen.push('ok'));
        q.activate();
        assert.deepEqual(seen, ['boom', 'ok']);
    });
});
